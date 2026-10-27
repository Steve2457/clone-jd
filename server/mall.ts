import { randomUUID } from "node:crypto";
import { Store, type Row } from "./db.ts";
import { searchIntent, likePattern } from "./search.ts";
export class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function fail(code: string, message: string, status = 400): never {
  throw new BusinessError(code, message, status);
}
export function integer(n: unknown, min = 1, max = 99) {
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < min || n > max)
    fail("INVALID_QUANTITY", `请输入 ${min}–${max} 之间的整数`);
  return n as number;
}
export function required(value: unknown, label: string, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    fail("INVALID_INPUT", `${label}不能为空且不能超过 ${max} 个字符`);
  return (value as string).trim();
}
export const statusLabels: Record<string, string> = {
  pending_payment: "待付款",
  pending_shipment: "待发货",
  shipped: "待收货",
  completed: "已完成",
  cancelled: "已取消",
  requested: "待审核",
  approved: "待寄回",
  returning: "退货途中",
  refunded: "已退款",
  rejected: "已拒绝",
};
export interface CheckoutInput {
  addressId: string;
  items?: { skuId: string; quantity: number }[];
  coupons?: Record<string, string>;
  expectedTotal?: number;
}
export class Mall {
  constructor(
    public store: Store,
    private clock?: () => number,
  ) {}
  now() {
    if (this.clock) return this.clock();
    const m = this.store.get("SELECT value FROM metadata WHERE key='clock'");
    if (!m) return Date.now();
    const c = JSON.parse(m.value);
    return c.reference + Date.now() - c.started;
  }
  id(prefix: string) {
    return prefix + "_" + randomUUID().replaceAll("-", "").slice(0, 20);
  }
  transaction<T>(fn: () => T) {
    return this.store.tx(fn);
  }
  once<T>(
    owner: string,
    action: string,
    key: string,
    payload: unknown,
    fn: () => T,
  ): T {
    if (!key || key.length > 120)
      fail("IDEMPOTENCY_REQUIRED", "请使用有效的操作编号");
    const encoded = JSON.stringify(payload);
    return this.transaction(() => {
      const old = this.store.get(
        "SELECT * FROM idempotency WHERE owner=? AND action=? AND key=?",
        owner,
        action,
        key,
      );
      if (old) {
        if (old.payload !== encoded)
          fail("IDEMPOTENCY_CONFLICT", "该操作编号已用于另一项请求", 409);
        return JSON.parse(old.response) as T;
      }
      const result = fn();
      this.store.run(
        "INSERT INTO idempotency VALUES(?,?,?,?,?)",
        owner,
        action,
        key,
        encoded,
        JSON.stringify(result),
      );
      return result;
    });
  }
  productQuery() {
    return `SELECT p.*,c.name category_name,s.name shop_name,s.self_operated,
    (SELECT MIN(price) FROM skus WHERE product_id=p.id) price,
    (SELECT SUM(stock) FROM skus WHERE product_id=p.id) stock,
    (SELECT id FROM skus WHERE product_id=p.id ORDER BY price,id LIMIT 1) default_sku_id,
    COALESCE((SELECT ROUND(AVG(rating),1) FROM reviews WHERE product_id=p.id),0) rating,
    (SELECT COUNT(*) FROM reviews WHERE product_id=p.id) review_count,
    COALESCE((SELECT SUM(oi.quantity-oi.returned_quantity) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.product_id=p.id AND o.payment_status!='unpaid' AND o.status!='cancelled'),0) sales
    FROM products p JOIN categories c ON c.id=p.category_id JOIN shops s ON s.id=p.shop_id
    LEFT JOIN product_search ps ON ps.product_id=p.id`;
  }
  listProducts(q: Record<string, any> = {}) {
    const wh: string[] = [];
    const args: any[] = [];
    const add = (s: string, v: any) => {
      wh.push(s);
      args.push(v);
    };
    const intent = searchIntent(String(q.q || ""));
    if (intent.productType) add("ps.product_type=?", intent.productType);
    if (intent.category) add("p.category_id=?", intent.category);
    for (const token of intent.tokens) {
      add(
        "(p.title LIKE ? ESCAPE '\\' OR p.brand LIKE ? ESCAPE '\\' OR ps.terms LIKE ? ESCAPE '\\')",
        likePattern(token),
      );
      args.push(args.at(-1), args.at(-1));
    }
    if (q.category) add("p.category_id=?", String(q.category));
    if (q.shop) add("p.shop_id=?", String(q.shop));
    if (q.brand) add("p.brand=?", String(q.brand));
    if (q.self === "1") wh.push("s.self_operated=1");
    if (q.stock === "1")
      wh.push("(SELECT SUM(stock) FROM skus WHERE product_id=p.id)>0");
    for (const [key, sign] of [
      ["min", ">="],
      ["max", "<="],
    ]) {
      if (q[key] !== undefined && q[key] !== "") {
        const v = Number(q[key]);
        if (!Number.isFinite(v) || v < 0) fail("INVALID_PRICE", "价格区间无效");
        add(
          `(SELECT MIN(price) FROM skus WHERE product_id=p.id)${sign}?`,
          Math.round(v * 100),
        );
      }
    }
    if (q.featured === "1") wh.push("p.featured=1");
    if (q.collection === "new") wh.push("p.position>=37");
    if (q.collection === "value")
      wh.push("(SELECT MIN(price) FROM skus WHERE product_id=p.id)<10000");
    const base =
      this.productQuery() + (wh.length ? " WHERE " + wh.join(" AND ") : "");
    const page = Math.max(1, Math.min(10000, Math.floor(Number(q.page) || 1))),
      limit = Math.max(1, Math.min(200, Math.floor(Number(q.limit) || 24)));
    const sort: Record<string, string> = {
      price_asc: "price ASC,p.id",
      price_desc: "price DESC,p.id",
      sales: "sales DESC,p.id",
      rating: "rating DESC,review_count DESC,p.id",
      new: "p.position DESC",
    };
    const total = this.store.get(
      "SELECT COUNT(*) n FROM (" + base + ")",
      ...args,
    )!.n;
    const orderArgs: string[] = [];
    let order = sort[String(q.sort)];
    if (!order && intent.tokens.length) {
      const scores = intent.tokens.map((token) => {
        orderArgs.push(
          token,
          token,
          token.replace(/[\\%_]/g, "\\$&") + "%",
          likePattern(token),
        );
        return `(CASE WHEN p.title=? COLLATE NOCASE THEN 1000
          WHEN p.brand=? COLLATE NOCASE THEN 400
          WHEN p.title LIKE ? ESCAPE '\\' THEN 200
          WHEN p.title LIKE ? ESCAPE '\\' THEN 100 ELSE 20 END)`;
      });
      order = "(" + scores.join("+") + ") DESC,p.position ASC,p.id";
    }
    const items = this.store.all(
      base +
        " ORDER BY " +
        (order || "p.position ASC,p.id") +
        " LIMIT ? OFFSET ?",
      ...args,
      ...orderArgs,
      limit,
      (page - 1) * limit,
    );
    return { items, total, page, pages: Math.ceil(total / limit), limit };
  }
  catalogMeta(q: Record<string, any> = {}) {
    const { items } = this.listProducts({
      ...q,
      brand: undefined,
      page: 1,
      limit: 200,
    });
    return {
      brands: [...new Set(items.map((p) => p.brand as string))].sort((a, b) =>
        a.localeCompare(b, "zh-CN"),
      ),
    };
  }
  product(id: string): Row {
    const p = this.store.get(this.productQuery() + " WHERE p.id=?", id);
    if (!p) fail("NOT_FOUND", "商品不存在", 404);
    return {
      ...p,
      skus: this.store
        .all("SELECT * FROM skus WHERE product_id=? ORDER BY price,id", id)
        .map((s) => ({
          ...s,
          image:
            s.pack_count > 1
              ? `/assets/${id}-pack${s.pack_count}.svg`
              : p.image,
        })),
      reviews: this.store.all(
        "SELECT r.*,u.nickname FROM reviews r JOIN users u ON u.id=r.user_id WHERE product_id=? ORDER BY r.created_at DESC LIMIT 30",
        id,
      ),
    };
  }
  sku(id: string): Row {
    const sku = this.store.get(
      `SELECT sk.*,p.title,p.image,p.returnable,p.id product_id,p.category_id,p.shop_id,s.name shop_name,s.self_operated,s.free_threshold,s.base_shipping FROM skus sk JOIN products p ON p.id=sk.product_id JOIN shops s ON s.id=p.shop_id WHERE sk.id=?`,
      id,
    );
    if (!sku) fail("NOT_FOUND", "规格不存在", 404);
    return {
      ...sku,
      image:
        sku.pack_count > 1
          ? `/assets/${sku.product_id}-pack${sku.pack_count}.svg`
          : sku.image,
    };
  }
  cart(owner: string): Row[] {
    return this.store
      .all("SELECT * FROM cart WHERE owner=? ORDER BY rowid DESC", owner)
      .map((c) => ({
        ...this.sku(c.sku_id),
        quantity: c.quantity,
        selected: Boolean(c.selected),
        subtotal: this.sku(c.sku_id).price * c.quantity,
      }));
  }
  updateCart(owner: string, skuId: string, body: Row, add = false) {
    const sku = this.sku(skuId);
    const old = this.store.get(
      "SELECT * FROM cart WHERE owner=? AND sku_id=?",
      owner,
      skuId,
    );
    const quantity =
      body.quantity === undefined ? old?.quantity : integer(body.quantity);
    if (quantity === undefined) fail("INVALID_QUANTITY", "请选择购买数量");
    const target = add ? quantity + (old?.quantity || 0) : quantity;
    integer(target);
    if ((add || body.quantity !== undefined) && target > sku.stock)
      fail("INSUFFICIENT_STOCK", `当前规格仅剩 ${sku.stock} 件`, 409);
    const selected =
      body.selected === undefined
        ? (old?.selected ?? 1)
        : body.selected
          ? 1
          : 0;
    this.store.run(
      "INSERT INTO cart VALUES(?,?,?,?) ON CONFLICT(owner,sku_id) DO UPDATE SET quantity=excluded.quantity,selected=excluded.selected",
      owner,
      skuId,
      target,
      selected,
    );
    return this.cart(owner);
  }
  mergeCart(guest: string, user: string) {
    for (const c of this.store.all("SELECT * FROM cart WHERE owner=?", guest)) {
      this.store.run(
        "INSERT INTO cart VALUES(?,?,?,?) ON CONFLICT(owner,sku_id) DO UPDATE SET quantity=MIN(99,cart.quantity+excluded.quantity),selected=1",
        user,
        c.sku_id,
        c.quantity,
        1,
      );
    }
    this.store.run("DELETE FROM cart WHERE owner=?", guest);
  }
  addresses(user: string) {
    return this.store.all(
      "SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC,rowid",
      user,
    );
  }
  saveAddress(user: string, body: Row, id?: string) {
    return this.transaction(() => {
      if (
        id &&
        !this.store.get(
          "SELECT id FROM addresses WHERE id=? AND user_id=?",
          id,
          user,
        )
      )
        fail("NOT_FOUND", "地址不存在", 404);
      const name = required(body.name, "收货人", 30),
        phone = required(body.phone, "手机号", 20),
        province = required(body.province, "省份", 30),
        city = required(body.city, "城市", 30),
        district = required(body.district, "区县", 30),
        detail = required(body.detail, "详细地址", 150);
      if (!/^1\d{10}$/.test(phone))
        fail("INVALID_PHONE", "请输入 11 位中国内地手机号");
      const makeDefault =
        Boolean(body.is_default) ||
        this.addresses(user).length === 0 ||
        (id &&
          this.store.get("SELECT is_default FROM addresses WHERE id=?", id)
            ?.is_default === 1);
      if (makeDefault)
        this.store.run(
          "UPDATE addresses SET is_default=0 WHERE user_id=?",
          user,
        );
      id = id || this.id("addr");
      this.store.run(
        "INSERT INTO addresses VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,phone=excluded.phone,province=excluded.province,city=excluded.city,district=excluded.district,detail=excluded.detail,is_default=excluded.is_default",
        id,
        user,
        name,
        phone,
        province,
        city,
        district,
        detail,
        makeDefault ? 1 : 0,
      );
      return this.addresses(user);
    });
  }
  deleteAddress(user: string, id: string) {
    return this.transaction(() => {
      this.store.run(
        "DELETE FROM addresses WHERE id=? AND user_id=?",
        id,
        user,
      );
      if (
        !this.store.get(
          "SELECT id FROM addresses WHERE user_id=? AND is_default=1",
          user,
        )
      ) {
        const a = this.addresses(user)[0];
        if (a)
          this.store.run("UPDATE addresses SET is_default=1 WHERE id=?", a.id);
      }
      return this.addresses(user);
    });
  }
  coupons(user: string) {
    return this.store
      .all(
        "SELECT c.*,uc.id user_coupon_id,uc.status,uc.order_id FROM coupons c LEFT JOIN user_coupons uc ON uc.coupon_id=c.id AND uc.user_id=? ORDER BY c.min_spend",
        user,
      )
      .map((c) => ({ ...c, expired: c.expires_at <= this.now() }));
  }
  claimCoupon(user: string, id: string) {
    const c = this.store.get("SELECT * FROM coupons WHERE id=?", id);
    if (!c || c.expires_at <= this.now())
      fail("COUPON_EXPIRED", "优惠券不存在或已过期");
    this.store.run(
      "INSERT OR IGNORE INTO user_coupons VALUES(?,?,?,?,NULL)",
      this.id("uc"),
      user,
      id,
      "available",
    );
    return this.coupons(user);
  }
  shipping(items: Row[], net: number, address: Row) {
    const chargeable = items.filter((x) => !x.free_shipping);
    if (!chargeable.length) return 0;
    const first = items[0];
    const base = net >= first.free_threshold ? 0 : first.base_shipping;
    const citySpecial = [
      "北京",
      "上海",
      "杭州",
      "苏州",
      "南京",
      "深圳",
      "广州",
      "重庆",
      "成都",
      "天津",
      "武汉",
      "沈阳",
      "西安",
    ].some((c) => address.city.includes(c));
    const tier =
      net < 19900 ? 0 : net < 29900 ? 1 : net < 39900 ? 2 : net < 49900 ? 3 : 4;
    const limits = citySpecial ? [20, 30, 40, 50, 50] : [10, 20, 30, 40, 50];
    const gross = chargeable.reduce((n, x) => n + x.weight_g * x.quantity, 0);
    const extraKg = Math.max(
      0,
      Math.ceil((gross * 9 - limits[tier] * 10000) / 10000),
    );
    return base + extraKg * 100;
  }
  quote(user: string, input: CheckoutInput) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      fail("INVALID_INPUT", "结算信息格式不正确");
    if (
      input.coupons &&
      (typeof input.coupons !== "object" ||
        Array.isArray(input.coupons) ||
        Object.values(input.coupons).some((v) => typeof v !== "string"))
    )
      fail("INVALID_COUPON", "优惠券格式不正确");
    const address = this.store.get(
      "SELECT * FROM addresses WHERE id=? AND user_id=?",
      String(input.addressId || ""),
      user,
    );
    if (!address) fail("INVALID_ADDRESS", "请选择有效的收货地址");
    const fromCart = !input.items;
    const raw = fromCart
      ? this.cart(user)
          .filter((i) => i.selected)
          .map((i) => ({ skuId: i.id, quantity: i.quantity }))
      : input.items!;
    if (!Array.isArray(raw) || !raw.length || raw.length > 100)
      fail("EMPTY_CART", "请选择需要结算的商品");
    const seen = new Set<string>();
    const groups: Record<string, Row[]> = {};
    for (const r of raw) {
      if (!r || typeof r !== "object")
        fail("INVALID_INPUT", "商品项格式不正确");
      required(r.skuId, "规格编号", 100);
      if (seen.has(r.skuId)) fail("DUPLICATE_ITEM", "不能重复提交相同规格");
      seen.add(r.skuId);
      integer(r.quantity);
      const sku = this.sku(r.skuId);
      if (sku.stock < r.quantity)
        fail(
          "INSUFFICIENT_STOCK",
          `${sku.title}（${sku.label}）库存不足，仅剩 ${sku.stock} 件`,
          409,
        );
      (groups[sku.shop_id] ??= []).push({
        ...sku,
        quantity: r.quantity,
        subtotal: sku.price * r.quantity,
      });
    }
    const usedCoupons = new Set<string>();
    const selections = input.coupons || {};
    for (const shopId of Object.keys(selections)) {
      if (selections[shopId] && !groups[shopId])
        fail("INVALID_COUPON", "优惠券店铺不在本次结算中");
    }
    const result = Object.entries(groups).map(([shopId, items]) => {
      const subtotal = items.reduce((n, i) => n + i.subtotal, 0);
      let discount = 0;
      let coupon: Row | undefined;
      let eligible = items;
      if (selections[shopId]) {
        const ucid = selections[shopId];
        if (usedCoupons.has(ucid))
          fail("INVALID_COUPON", "同一优惠券不能同时用于多个订单");
        usedCoupons.add(ucid);
        coupon = this.store.get(
          "SELECT c.*,uc.id user_coupon_id,uc.status FROM user_coupons uc JOIN coupons c ON c.id=uc.coupon_id WHERE uc.id=? AND uc.user_id=?",
          ucid,
          user,
        );
        if (
          !coupon ||
          coupon.status !== "available" ||
          coupon.expires_at <= this.now()
        )
          fail("INVALID_COUPON", "优惠券不可用或已过期", 409);
        if (coupon.shop_id && coupon.shop_id !== shopId)
          fail("INVALID_COUPON", "优惠券不适用于该店铺");
        eligible = coupon.category_id
          ? items.filter((i) => i.category_id === coupon!.category_id)
          : items;
        const eligibleTotal = eligible.reduce((n, i) => n + i.subtotal, 0);
        if (!eligibleTotal || eligibleTotal < coupon.min_spend)
          fail("COUPON_THRESHOLD", "符合优惠范围的商品金额未达到使用门槛");
        discount = Math.min(coupon.discount, eligibleTotal);
      }
      const eligibleTotal = eligible.reduce((n, i) => n + i.subtotal, 0);
      const eligibleIds = new Set(eligible.map((i) => i.id));
      const allocation: Row[] = items.map((i) => ({
        ...i,
        discount: eligibleIds.has(i.id)
          ? Math.floor((discount * i.subtotal) / eligibleTotal)
          : 0,
      }));
      let remaining = discount - allocation.reduce((n, i) => n + i.discount, 0);
      const ordered = allocation
        .filter((i) => eligibleIds.has(i.id))
        .sort(
          (a, b) =>
            ((discount * b.subtotal) % eligibleTotal) -
              ((discount * a.subtotal) % eligibleTotal) ||
            a.id.localeCompare(b.id),
        );
      for (let i = 0; remaining > 0; i++, remaining--)
        ordered[i % ordered.length].discount++;
      const shipping = this.shipping(items, subtotal - discount, address);
      return {
        shopId,
        shopName: items[0].shop_name,
        items: allocation.map(
          (i): Row => ({ ...i, total: i.subtotal - i.discount }),
        ),
        subtotal,
        discount,
        shipping,
        total: subtotal - discount + shipping,
        couponId: coupon?.user_coupon_id || null,
      };
    });
    return {
      address,
      groups: result,
      subtotal: result.reduce((n, g) => n + g.subtotal, 0),
      discount: result.reduce((n, g) => n + g.discount, 0),
      shipping: result.reduce((n, g) => n + g.shipping, 0),
      total: result.reduce((n, g) => n + g.total, 0),
      fromCart,
    };
  }
  event(id: string, type: string, message: string) {
    this.store.run(
      "INSERT INTO order_events(order_id,type,message,created_at) VALUES(?,?,?,?)",
      id,
      type,
      message,
      this.now(),
    );
  }
  stock(skuId: string, delta: number, orderId: string, reason: string) {
    const changed = this.store.run(
      "UPDATE skus SET stock=stock+? WHERE id=? AND stock+?>=0",
      delta,
      skuId,
      delta,
    );
    if (!changed.changes)
      fail("INSUFFICIENT_STOCK", "商品库存不足，请刷新后重试", 409);
    this.store.run(
      "INSERT INTO stock_ledger(sku_id,order_id,delta,reason,created_at) VALUES(?,?,?,?,?)",
      skuId,
      orderId,
      delta,
      reason,
      this.now(),
    );
  }
  job(kind: string, id: string, delay: number) {
    this.store.run(
      "INSERT INTO jobs VALUES(?,?,?,?,'pending',NULL) ON CONFLICT(kind,entity_id) DO UPDATE SET due_at=excluded.due_at,status='pending',error=NULL",
      this.id("job"),
      kind,
      id,
      this.now() + delay,
    );
  }
  createOrder(user: string, input: CheckoutInput, key: string) {
    return this.once(user, "create-order", key, input, () => {
      const quote = this.quote(user, input);
      if (
        input.expectedTotal !== undefined &&
        input.expectedTotal !== quote.total
      )
        fail("PRICE_CHANGED", "结算金额已变化，请刷新报价后重新提交", 409);
      const groupId = this.id("checkout");
      const now = this.now();
      this.store.run(
        "INSERT INTO checkout_groups VALUES(?,?,?)",
        groupId,
        user,
        now,
      );
      const ids = [];
      for (const g of quote.groups) {
        const id = this.id("JD");
        ids.push(id);
        this.store.run(
          `INSERT INTO orders(id,group_id,user_id,shop_id,status,payment_status,subtotal,discount,shipping,total,address_json,coupon_id,created_at,expires_at) VALUES(?,?,?,?,'pending_payment','unpaid',?,?,?,?,?,?,?,?)`,
          id,
          groupId,
          user,
          g.shopId,
          g.subtotal,
          g.discount,
          g.shipping,
          g.total,
          JSON.stringify(quote.address),
          g.couponId,
          now,
          now + 1800000,
        );
        for (const i of g.items) {
          this.stock(i.id, -i.quantity, id, "reserve");
          this.store.run(
            "INSERT INTO order_items(id,order_id,sku_id,product_id,title,label,image,unit_price,quantity,discount,total) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            this.id("oi"),
            id,
            i.id,
            i.product_id,
            i.title,
            i.label,
            i.image,
            i.price,
            i.quantity,
            i.discount,
            i.total,
          );
          if (quote.fromCart)
            this.store.run(
              "DELETE FROM cart WHERE owner=? AND sku_id=?",
              user,
              i.id,
            );
        }
        if (g.couponId) {
          const changed = this.store.run(
            "UPDATE user_coupons SET status='locked',order_id=? WHERE id=? AND user_id=? AND status='available'",
            id,
            g.couponId,
            user,
          );
          if (!changed.changes) fail("INVALID_COUPON", "优惠券已被使用", 409);
        }
        this.event(id, "created", "订单提交成功，等待付款");
        this.job("expire", id, 1800000);
      }
      return { groupId, orderIds: ids, total: quote.total };
    });
  }
  order(
    user: string,
    id: string,
  ): Row & { items: Row[]; events: Row[]; returns: Row[] } {
    const o = this.store.get(
      "SELECT o.*,s.name shop_name FROM orders o JOIN shops s ON s.id=o.shop_id WHERE o.id=? AND o.user_id=?",
      id,
      user,
    );
    if (!o) fail("NOT_FOUND", "订单不存在", 404);
    return {
      ...o,
      address: JSON.parse(o.address_json),
      items: this.store.all(
        "SELECT oi.*,p.returnable,(SELECT id FROM reviews WHERE order_item_id=oi.id) review_id FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE order_id=?",
        id,
      ),
      events: this.store.all(
        "SELECT * FROM order_events WHERE order_id=? ORDER BY created_at,id",
        id,
      ),
      returns: this.store.all(
        "SELECT * FROM returns WHERE order_id=? ORDER BY created_at DESC",
        id,
      ),
    };
  }
  orders(user: string, q: Row = {}) {
    let rows = this.store
      .all(
        "SELECT id FROM orders WHERE user_id=? ORDER BY created_at DESC,id DESC",
        user,
      )
      .map((x) => this.order(user, x.id));
    if (q.status) rows = rows.filter((x) => x.status === q.status);
    if (q.q) {
      const term = String(q.q).toLowerCase();
      rows = rows.filter(
        (x) =>
          x.id.toLowerCase().includes(term) ||
          x.items.some((i) => i.title.toLowerCase().includes(term)),
      );
    }
    return rows;
  }
  paymentGroup(user: string, id: string) {
    const group = this.store.get(
      "SELECT * FROM checkout_groups WHERE id=? AND user_id=?",
      id,
      user,
    );
    if (!group) fail("NOT_FOUND", "结算单不存在", 404);
    const orders = this.store
      .all("SELECT id FROM orders WHERE group_id=? ORDER BY id", id)
      .map((o) => this.order(user, o.id));
    return {
      ...group,
      orders,
      total: orders
        .filter((o) => o.status === "pending_payment")
        .reduce((n, o) => n + o.total, 0),
      payments: this.store.all(
        "SELECT * FROM payments WHERE group_id=? ORDER BY created_at",
        id,
      ),
    };
  }
  pay(user: string, groupId: string, success: boolean, key: string) {
    return this.once(user, "pay", key, { groupId, success }, () => {
      const group = this.paymentGroup(user, groupId);
      const pending = group.orders.filter(
        (o) => o.status === "pending_payment",
      );
      if (!pending.length) {
        if (
          group.orders.some(
            (o) => o.payment_status === "paid" && o.status !== "cancelled",
          )
        )
          return { groupId, success: true, alreadyPaid: true };
        fail("INVALID_STATE", "没有待付款订单", 409);
      }
      if (pending.some((o) => o.expires_at <= this.now()))
        fail("ORDER_EXPIRED", "订单付款时间已过，请刷新订单", 409);
      this.store.run(
        "INSERT INTO payments VALUES(?,?,?,?,?,?)",
        this.id("pay"),
        groupId,
        user,
        group.total,
        success ? "success" : "failed",
        this.now(),
      );
      if (success)
        for (const o of pending) {
          this.store.run(
            "UPDATE orders SET status='pending_shipment',payment_status='paid',paid_at=? WHERE id=?",
            this.now(),
            o.id,
          );
          if (o.coupon_id)
            this.store.run(
              "UPDATE user_coupons SET status='used' WHERE id=?",
              o.coupon_id,
            );
          this.store.run(
            "UPDATE jobs SET status='cancelled' WHERE kind='expire' AND entity_id=?",
            o.id,
          );
          this.event(o.id, "paid", "模拟支付成功，仓库正在备货");
          this.job("ship", o.id, 60000);
        }
      return { groupId, success, total: group.total };
    });
  }
  cancelInternal(user: string, id: string, reason = "用户取消订单") {
    const o = this.order(user, id);
    if (o.status === "cancelled") return o;
    if (!["pending_payment", "pending_shipment"].includes(o.status))
      fail("INVALID_STATE", "订单已发货，请通过售后申请处理", 409);
    for (const i of o.items) this.stock(i.sku_id, i.quantity, id, "cancel");
    this.store.run(
      "UPDATE orders SET status='cancelled',payment_status=?,refunded=?,cancelled_at=? WHERE id=?",
      o.payment_status === "paid" ? "refunded" : "unpaid",
      o.payment_status === "paid" ? o.total : 0,
      this.now(),
      id,
    );
    if (o.coupon_id)
      this.store.run(
        "UPDATE user_coupons SET status='available',order_id=NULL WHERE id=?",
        o.coupon_id,
      );
    this.store.run(
      "UPDATE jobs SET status='cancelled' WHERE entity_id=? AND status='pending'",
      id,
    );
    this.event(
      id,
      "cancelled",
      reason +
        (o.payment_status === "paid" ? "，实付金额已全额原路模拟退回" : ""),
    );
    return this.order(user, id);
  }
  cancel(user: string, id: string, key: string) {
    return this.once(user, "cancel", key, { id }, () =>
      this.cancelInternal(user, id),
    );
  }
  receive(user: string, id: string, key: string) {
    return this.once(user, "receive", key, { id }, () => {
      const o = this.order(user, id);
      if (o.status === "completed") return o;
      if (o.status !== "shipped" || !o.delivered_at)
        fail("INVALID_STATE", "商品尚未送达，暂不能确认收货", 409);
      this.store.run(
        "UPDATE orders SET status='completed',completed_at=? WHERE id=?",
        this.now(),
        id,
      );
      this.event(id, "completed", "您已确认收货，感谢您的支持");
      return this.order(user, id);
    });
  }
  review(user: string, itemId: string, rating: number, content: string) {
    integer(rating, 1, 5);
    content = required(content, "评价内容", 1000);
    return this.transaction(() => {
      const i = this.store.get(
        "SELECT oi.*,o.user_id,o.status FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.id=? AND o.user_id=?",
        itemId,
        user,
      );
      if (!i) fail("NOT_FOUND", "订单商品不存在", 404);
      if (i.status !== "completed")
        fail("INVALID_STATE", "确认收货后才能评价", 409);
      if (
        this.store.get("SELECT id FROM reviews WHERE order_item_id=?", itemId)
      )
        fail("ALREADY_REVIEWED", "该商品已经评价过", 409);
      this.store.run(
        "INSERT INTO reviews VALUES(?,?,?,?,?,?,?)",
        this.id("review"),
        user,
        i.product_id,
        itemId,
        rating,
        content,
        this.now(),
      );
      return this.product(i.product_id);
    });
  }
  requestReturn(user: string, body: Row, key: string) {
    const itemId = required(body.itemId, "订单商品"),
      quantity = integer(body.quantity),
      reason = required(body.reason, "售后原因", 500);
    return this.once(user, "return", key, { itemId, quantity, reason }, () => {
      const item = this.store.get(
        "SELECT * FROM order_items WHERE id=?",
        itemId,
      );
      if (!item) fail("NOT_FOUND", "订单商品不存在", 404);
      const o = this.order(user, item.order_id);
      if (
        o.status !== "completed" ||
        !o.completed_at ||
        this.now() - o.completed_at > 7 * 86400000
      )
        fail("RETURN_WINDOW", "需在确认收货后 7 天内申请退货", 409);
      const product = this.store.get(
        "SELECT returnable FROM products WHERE id=?",
        item.product_id,
      )!;
      if (!product.returnable) fail("NOT_RETURNABLE", "该商品不支持无理由退货");
      const active = this.store.get(
        "SELECT COALESCE(SUM(quantity),0) n FROM returns WHERE item_id=? AND status IN ('requested','approved','returning')",
        itemId,
      )!.n;
      if (quantity + active + item.returned_quantity > item.quantity)
        fail("RETURN_QUANTITY", "申请数量超出剩余可退数量", 409);
      if (active)
        fail(
          "RETURN_IN_PROGRESS",
          "该商品已有进行中的售后，请完成或撤销后再申请",
          409,
        );
      const target = item.returned_quantity + quantity;
      const amount =
        Math.floor((item.total * target) / item.quantity) - item.refunded;
      const id = this.id("R");
      this.store.run(
        "INSERT INTO returns(id,user_id,order_id,item_id,quantity,reason,status,amount,created_at,updated_at) VALUES(?,?,?,?,?,?,'requested',?,?,?)",
        id,
        user,
        o.id,
        itemId,
        quantity,
        reason,
        amount,
        this.now(),
        this.now(),
      );
      this.event(o.id, "return_requested", "退货申请已提交");
      this.job("approve_return", id, 30000);
      return this.returnDetail(user, id);
    });
  }
  returnDetail(user: string, id: string) {
    const r = this.store.get(
      "SELECT r.*,i.title,i.image,i.label FROM returns r JOIN order_items i ON i.id=r.item_id WHERE r.id=? AND r.user_id=?",
      id,
      user,
    );
    if (!r) fail("NOT_FOUND", "售后单不存在", 404);
    return r;
  }
  returnAction(user: string, id: string, action: string, tracking = "") {
    return this.transaction(() => {
      const r = this.returnDetail(user, id);
      if (action === "cancel") {
        if (r.status === "cancelled") return r;
        if (!["requested", "approved"].includes(r.status))
          fail("INVALID_STATE", "已寄回或已结束的售后无法撤销", 409);
        this.store.run(
          "UPDATE returns SET status='cancelled',updated_at=? WHERE id=?",
          this.now(),
          id,
        );
        this.store.run(
          "UPDATE jobs SET status='cancelled' WHERE entity_id=? AND status='pending'",
          id,
        );
        this.event(r.order_id, "return_cancelled", "退货申请已撤销");
      } else if (action === "ship") {
        if (r.status === "returning") return r;
        if (r.status !== "approved")
          fail("INVALID_STATE", "售后尚未审核通过", 409);
        tracking = required(tracking, "退货快递单号", 60);
        this.store.run(
          "UPDATE returns SET status='returning',tracking=?,updated_at=? WHERE id=?",
          tracking,
          this.now(),
          id,
        );
        this.job("refund_return", id, 30000);
        this.event(r.order_id, "return_shipped", "退货已寄回，等待仓库验收");
      } else fail("INVALID_ACTION", "未知售后操作");
      return this.returnDetail(user, id);
    });
  }
  processJob(job: Row) {
    const now = this.now();
    if (job.kind === "expire") {
      const o = this.store.get(
        "SELECT * FROM orders WHERE id=?",
        job.entity_id,
      );
      if (o?.status === "pending_payment")
        this.cancelInternal(o.user_id, o.id, "超时未付款，订单自动取消");
    } else if (job.kind === "ship") {
      const o = this.store.get(
        "SELECT * FROM orders WHERE id=?",
        job.entity_id,
      );
      if (o?.status === "pending_shipment") {
        this.store.run(
          "UPDATE orders SET status='shipped',shipped_at=? WHERE id=?",
          now,
          o.id,
        );
        this.event(o.id, "shipped", "京东物流已揽收，包裹离开本地模拟仓库");
        this.job("deliver", o.id, 120000);
      }
    } else if (job.kind === "deliver") {
      const o = this.store.get(
        "SELECT * FROM orders WHERE id=?",
        job.entity_id,
      );
      if (o?.status === "shipped" && !o.delivered_at) {
        this.store.run(
          "UPDATE orders SET delivered_at=? WHERE id=?",
          now,
          o.id,
        );
        this.event(o.id, "delivered", "包裹已送达，请确认收货");
      }
    } else if (job.kind === "approve_return") {
      const r = this.store.get(
        "SELECT * FROM returns WHERE id=?",
        job.entity_id,
      );
      if (r?.status === "requested") {
        this.store.run(
          "UPDATE returns SET status='approved',updated_at=? WHERE id=?",
          now,
          r.id,
        );
        this.event(
          r.order_id,
          "return_approved",
          "退货审核通过，请填写模拟退货快递单号",
        );
      }
    } else if (job.kind === "refund_return") {
      const r = this.store.get(
        "SELECT * FROM returns WHERE id=?",
        job.entity_id,
      );
      if (r?.status === "returning") {
        const i = this.store.get(
          "SELECT * FROM order_items WHERE id=?",
          r.item_id,
        )!;
        const o = this.store.get(
          "SELECT * FROM orders WHERE id=?",
          r.order_id,
        )!;
        if (
          i.returned_quantity + r.quantity > i.quantity ||
          o.refunded + r.amount > o.total
        )
          fail("REFUND_LIMIT", "退款超出可退额度", 409);
        this.stock(i.sku_id, r.quantity, o.id, "return");
        this.store.run(
          "UPDATE order_items SET returned_quantity=returned_quantity+?,refunded=refunded+? WHERE id=?",
          r.quantity,
          r.amount,
          i.id,
        );
        this.store.run(
          "UPDATE returns SET status='refunded',updated_at=? WHERE id=?",
          now,
          r.id,
        );
        const allReturned =
          this.store.get(
            "SELECT SUM(quantity-returned_quantity) n FROM order_items WHERE order_id=?",
            o.id,
          )!.n === 0;
        this.store.run(
          "UPDATE orders SET refunded=refunded+?,payment_status=? WHERE id=?",
          r.amount,
          allReturned ? "refunded" : "partially_refunded",
          o.id,
        );
        if (allReturned && o.coupon_id)
          this.store.run(
            "UPDATE user_coupons SET status='available',order_id=NULL WHERE id=? AND coupon_id IN(SELECT id FROM coupons WHERE expires_at>?)",
            o.coupon_id,
            now,
          );
        this.event(
          o.id,
          "refunded",
          `仓库验收完成，已模拟退款 ¥${(r.amount / 100).toFixed(2)}`,
        );
      }
    } else fail("UNKNOWN_JOB", "未知模拟任务");
    this.store.run("UPDATE jobs SET status='done' WHERE id=?", job.id);
  }
  tick() {
    const auto =
      this.store.get("SELECT value FROM metadata WHERE key='auto_advance'")
        ?.value === "true";
    const jobs = this.store.all(
      "SELECT * FROM jobs WHERE status='pending' AND due_at<=? AND (?=1 OR kind='expire') ORDER BY due_at,id LIMIT 100",
      this.now(),
      auto ? 1 : 0,
    );
    for (const j of jobs) {
      try {
        this.transaction(() => this.processJob(j));
      } catch (e) {
        this.store.run(
          "UPDATE jobs SET status='failed',error=? WHERE id=?",
          e instanceof Error ? e.message : String(e),
          j.id,
        );
      }
    }
    return jobs.length;
  }
  advance(user: string, entityId: string, kind?: string) {
    return this.transaction(() => {
      const o = this.store.get(
        "SELECT id FROM orders WHERE id=? AND user_id=?",
        entityId,
        user,
      );
      const r = this.store.get(
        "SELECT id FROM returns WHERE id=? AND user_id=?",
        entityId,
        user,
      );
      if (!o && !r) fail("NOT_FOUND", "记录不存在", 404);
      const job = this.store.get(
        "SELECT * FROM jobs WHERE entity_id=? AND status='pending' AND kind!='expire'" +
          (kind ? " AND kind=?" : "") +
          " ORDER BY due_at LIMIT 1",
        ...[entityId, ...(kind ? [kind] : [])],
      );
      if (!job) fail("NO_PENDING_JOB", "当前没有可推进的步骤", 409);
      this.processJob(job);
      return { kind: job.kind };
    });
  }
  demo(user: string) {
    return {
      now: this.now(),
      auto:
        this.store.get("SELECT value FROM metadata WHERE key='auto_advance'")
          ?.value === "true",
      jobs: this.store.all(
        "SELECT j.* FROM jobs j WHERE (entity_id IN(SELECT id FROM orders WHERE user_id=?) OR entity_id IN(SELECT id FROM returns WHERE user_id=?)) ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END,due_at DESC LIMIT 100",
        user,
        user,
      ),
      orders: this.orders(user),
      returns: this.store.all(
        "SELECT r.*,i.title FROM returns r JOIN order_items i ON i.id=r.item_id WHERE r.user_id=? ORDER BY r.created_at DESC",
        user,
      ),
    };
  }
}
