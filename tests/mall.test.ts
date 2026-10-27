import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { Store } from "../server/db.ts";
import { Mall, BusinessError, type CheckoutInput } from "../server/mall.ts";
import { seed, referenceTime, catalog } from "../server/seed.ts";
import { validate } from "../server/validate.ts";
import { createApp } from "../server/app.ts";
import { hashPassword } from "../server/security.ts";

function fixture(file = ":memory:") {
  const store = new Store(file);
  let time = referenceTime;
  const image = catalog().products[0].image;
  store.run("INSERT INTO categories VALUES(?,?,?,?)", "a", "测试品类", "", 0);
  store.run("INSERT INTO categories VALUES(?,?,?,?)", "b", "另一品类", "", 1);
  for (const u of ["demo", "other"]) {
    store.run(
      "INSERT INTO users VALUES(?,?,?,?,?)",
      u,
      u,
      hashPassword("JdDemo123!"),
      "演示用户",
      time,
    );
    store.run(
      "INSERT INTO addresses VALUES(?,?,?,?,?,?,?,?,?)",
      "addr-" + u,
      u,
      "演示收货人",
      "13800000000",
      "北京市",
      "北京市",
      "朝阳区",
      "测试路1号",
      1,
    );
  }
  for (const shop of ["s1", "s2"])
    store.run(
      "INSERT INTO shops VALUES(?,?,?,?,?)",
      shop,
      "店铺" + shop,
      shop === "s1" ? 1 : 0,
      5900,
      600,
    );
  for (const [id, price, shop, cat] of [
    ["a", 3301, "s1", "a"],
    ["b", 6602, "s1", "a"],
    ["c", 4900, "s2", "b"],
  ] as const) {
    store.run(
      "INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      id,
      cat,
      shop,
      "测试好物" + id,
      "测试品牌",
      image,
      "描述",
      "https://global.jd.com/",
      1,
      1,
      id.charCodeAt(0),
    );
    store.run(
      "INSERT INTO skus VALUES(?,?,?,?,?,?,?,?,?)",
      id + "-1",
      id,
      "标准款",
      price,
      20,
      20,
      1000,
      0,
      1,
    );
  }
  store.run(
    "INSERT INTO coupons VALUES(?,?,?,?,?,?,?)",
    "c1",
    "满49减5",
    500,
    4900,
    null,
    null,
    time + 86400000,
  );
  store.run(
    "INSERT INTO coupons VALUES(?,?,?,?,?,?,?)",
    "c2",
    "品类券",
    1000,
    9900,
    "s1",
    "a",
    time + 86400000,
  );
  for (const u of ["demo", "other"])
    for (const c of ["c1", "c2"])
      store.run(
        "INSERT INTO user_coupons VALUES(?,?,?,?,NULL)",
        u + "-" + c,
        u,
        c,
        "available",
      );
  const mall = new Mall(store, () => time);
  return {
    store,
    mall,
    advance: (ms: number) => (time += ms),
    now: () => time,
  };
}
const input = (sku = "a-1", quantity = 1): CheckoutInput => ({
  addressId: "addr-demo",
  items: [{ skuId: sku, quantity }],
});
function error(code: string, fn: () => unknown) {
  assert.throws(
    fn,
    (e: unknown) => e instanceof BusinessError && e.code === code,
  );
}
function check(store: Store) {
  assert.deepEqual(validate(store).errors, []);
}
function complete(m: Mall, body = input()) {
  const result = m.createOrder("demo", body, crypto.randomUUID());
  m.pay("demo", result.groupId, true, crypto.randomUUID());
  for (const id of result.orderIds) {
    m.advance("demo", id, "ship");
    m.advance("demo", id, "deliver");
    m.receive("demo", id, crypto.randomUUID());
  }
  return m.order("demo", result.orderIds[0]);
}

test("独立金额样例：9903分减500，按最大余数分摊167/333，无运费", () => {
  const { mall, store } = fixture();
  const q = mall.quote("demo", {
    addressId: "addr-demo",
    items: [
      { skuId: "a-1", quantity: 1 },
      { skuId: "b-1", quantity: 1 },
    ],
    coupons: { s1: "demo-c1" },
  });
  assert.deepEqual(
    [q.subtotal, q.discount, q.shipping, q.total],
    [9903, 500, 0, 9403],
  );
  assert.deepEqual(
    q.groups[0].items.map((i) => i.discount),
    [167, 333],
  );
  store.close();
});
test("59元免基础运费按优惠后金额；包邮、区域重量向上取整", () => {
  const { mall, store } = fixture();
  const a = mall.addresses("demo")[0];
  const item = {
    quantity: 1,
    weight_g: 1000,
    free_shipping: 0,
    base_shipping: 600,
    free_threshold: 5900,
  };
  assert.equal(mall.shipping([item], 5899, a), 600);
  assert.equal(mall.shipping([item], 5900, a), 0);
  assert.equal(mall.shipping([{ ...item, weight_g: 25000 }], 5900, a), 300);
  assert.equal(
    mall.shipping([{ ...item, weight_g: 25000 }], 5900, { city: "合肥市" }),
    1300,
  );
  assert.equal(
    mall.shipping([{ ...item, weight_g: 25000, free_shipping: 1 }], 100, a),
    0,
  );
  store.close();
});
test("优惠券资格：门槛、归属、店铺、品类、过期、重复领取", () => {
  const { mall, store } = fixture();
  error("COUPON_THRESHOLD", () =>
    mall.quote("demo", { ...input(), coupons: { s1: "demo-c1" } }),
  );
  error("INVALID_COUPON", () =>
    mall.quote("demo", { ...input("b-1"), coupons: { s1: "other-c1" } }),
  );
  error("INVALID_COUPON", () =>
    mall.quote("demo", { ...input("c-1", 3), coupons: { s2: "demo-c2" } }),
  );
  store.run("UPDATE products SET category_id='b' WHERE id='b'");
  error("COUPON_THRESHOLD", () =>
    mall.quote("demo", { ...input("b-1", 2), coupons: { s1: "demo-c2" } }),
  );
  store.run("UPDATE coupons SET expires_at=? WHERE id='c1'", referenceTime - 1);
  error("INVALID_COUPON", () =>
    mall.quote("demo", { ...input("b-1"), coupons: { s1: "demo-c1" } }),
  );
  mall.claimCoupon("demo", "c2");
  assert.equal(
    store.get("SELECT COUNT(*) n FROM user_coupons WHERE user_id='demo'")!.n,
    2,
  );
  store.close();
});
test("多商家拆单、取消后合并实付重新计算；订单地址为快照", () => {
  const { mall, store } = fixture();
  const c = mall.createOrder(
    "demo",
    {
      addressId: "addr-demo",
      items: [
        { skuId: "a-1", quantity: 1 },
        { skuId: "c-1", quantity: 1 },
      ],
    },
    "multi",
  );
  assert.equal(c.orderIds.length, 2);
  assert.equal(c.total, 9401);
  const first = mall.order("demo", c.orderIds[0]);
  mall.cancel("demo", first.id, "cancel");
  assert.equal(mall.paymentGroup("demo", c.groupId).total, 5500);
  mall.saveAddress(
    "demo",
    { ...mall.addresses("demo")[0], detail: "新的地址" },
    "addr-demo",
  );
  assert.equal(mall.order("demo", first.id).address.detail, "测试路1号");
  mall.pay("demo", c.groupId, true, "pay");
  assert.equal(
    store.get("SELECT amount FROM payments WHERE status='success'")!.amount,
    5500,
  );
  check(store);
  store.close();
});
test("下单事务保留库存并移除购物车；锁券、取消、幂等键冲突", () => {
  const { mall, store } = fixture();
  mall.updateCart("demo", "b-1", { quantity: 1 }, true);
  const body = { addressId: "addr-demo", coupons: { s1: "demo-c1" } };
  const c = mall.createOrder("demo", body, "same");
  assert.deepEqual(mall.createOrder("demo", body, "same"), c);
  assert.equal(mall.cart("demo").length, 0);
  assert.equal(mall.sku("b-1").stock, 19);
  error("IDEMPOTENCY_CONFLICT", () =>
    mall.createOrder("demo", input(), "same"),
  );
  assert.equal(
    store.get("SELECT status FROM user_coupons WHERE id='demo-c1'")!.status,
    "locked",
  );
  mall.cancel("demo", c.orderIds[0], "cancel");
  mall.cancel("demo", c.orderIds[0], "cancel2");
  assert.equal(mall.sku("b-1").stock, 20);
  assert.equal(
    store.get("SELECT status FROM user_coupons WHERE id='demo-c1'")!.status,
    "available",
  );
  check(store);
  store.close();
});
test("报价变化、同券跨店铺、非法商品项均无部分写入", () => {
  const { mall, store } = fixture();
  error("PRICE_CHANGED", () =>
    mall.createOrder("demo", { ...input(), expectedTotal: 1 }, "price"),
  );
  error("INVALID_COUPON", () =>
    mall.createOrder(
      "demo",
      {
        addressId: "addr-demo",
        items: [
          { skuId: "b-1", quantity: 1 },
          { skuId: "c-1", quantity: 1 },
        ],
        coupons: { s1: "demo-c1", s2: "demo-c1" },
      },
      "bad",
    ),
  );
  error("INVALID_INPUT", () =>
    mall.quote("demo", { addressId: "addr-demo", items: [null as any] }),
  );
  assert.equal(store.get("SELECT COUNT(*) n FROM orders")!.n, 0);
  assert.equal(mall.sku("b-1").stock, 20);
  store.close();
});
test("最后一件库存竞争，失败请求没有半成品订单", () => {
  const { mall, store } = fixture();
  store.run("UPDATE skus SET stock=1,initial_stock=1 WHERE id='a-1'");
  mall.createOrder("demo", input(), "last");
  error("INSUFFICIENT_STOCK", () =>
    mall.createOrder("other", { ...input(), addressId: "addr-other" }, "race"),
  );
  assert.equal(mall.sku("a-1").stock, 0);
  assert.equal(store.get("SELECT COUNT(*) n FROM checkout_groups")!.n, 1);
  check(store);
  store.close();
});
test("游客购物车合并，两个账号地址和购物车隔离", () => {
  const { mall, store } = fixture();
  mall.updateCart("guest:x", "a-1", { quantity: 2 }, true);
  mall.updateCart("demo", "a-1", { quantity: 1 }, true);
  mall.mergeCart("guest:x", "demo");
  assert.equal(mall.cart("demo")[0].quantity, 3);
  assert.equal(mall.cart("guest:x").length, 0);
  assert.equal(mall.cart("other").length, 0);
  error("INVALID_ADDRESS", () => mall.quote("other", input()));
  error("NOT_FOUND", () =>
    mall.saveAddress("other", mall.addresses("demo")[0], "addr-demo"),
  );
  store.close();
});
test("支付失败可重试，重复成功支付不生成第二笔扣款", () => {
  const { mall, store } = fixture();
  const c = mall.createOrder("demo", input(), "c");
  mall.pay("demo", c.groupId, false, "fail");
  assert.equal(mall.order("demo", c.orderIds[0]).status, "pending_payment");
  mall.pay("demo", c.groupId, true, "ok");
  mall.pay("demo", c.groupId, true, "ok");
  mall.pay("demo", c.groupId, true, "another");
  assert.equal(
    store.get("SELECT COUNT(*) n FROM payments WHERE status='success'")!.n,
    1,
  );
  assert.equal(mall.sku("a-1").stock, 19);
  check(store);
  store.close();
});
test("已支付未发货取消全额退款；已关闭支付不能假成功", () => {
  const { mall, store } = fixture();
  const c = mall.createOrder("demo", input(), "c");
  mall.pay("demo", c.groupId, true, "p");
  const o = mall.cancel("demo", c.orderIds[0], "x");
  assert.equal(o.refunded, 3901);
  assert.equal(mall.sku("a-1").stock, 20);
  error("INVALID_STATE", () => mall.pay("demo", c.groupId, true, "later"));
  check(store);
  store.close();
});
test("暂停自动模拟仍处理30分钟付款超时并释放券和库存", () => {
  const { mall, store, advance } = fixture();
  const c = mall.createOrder(
    "demo",
    { ...input("b-1"), coupons: { s1: "demo-c1" } },
    "c",
  );
  store.run("UPDATE metadata SET value='false' WHERE key='auto_advance'");
  advance(1800000);
  error("ORDER_EXPIRED", () => mall.pay("demo", c.groupId, true, "late"));
  mall.tick();
  assert.equal(mall.order("demo", c.orderIds[0]).status, "cancelled");
  assert.equal(mall.sku("b-1").stock, 20);
  check(store);
  store.close();
});
test("非法状态和越权拦截：发货后取消、未送达收货、越权推进", () => {
  const { mall, store } = fixture();
  const c = mall.createOrder("demo", input(), "c");
  const id = c.orderIds[0];
  error("NOT_FOUND", () => mall.order("other", id));
  error("NOT_FOUND", () => mall.cancel("other", id, "x"));
  error("NOT_FOUND", () => mall.paymentGroup("other", c.groupId));
  error("NOT_FOUND", () => mall.advance("other", id));
  mall.pay("demo", c.groupId, true, "p");
  mall.advance("demo", id, "ship");
  error("INVALID_STATE", () => mall.cancel("demo", id, "x"));
  error("INVALID_STATE", () => mall.receive("demo", id, "r"));
  check(store);
  store.close();
});
test("评价仅购买者收货后每个订单项一次，评分与记录一致", () => {
  const { mall, store } = fixture();
  const o = complete(mall);
  const i = o.items[0];
  error("NOT_FOUND", () => mall.review("other", i.id, 5, "越权"));
  mall.review("demo", i.id, 4, "本地购物验收体验");
  error("ALREADY_REVIEWED", () => mall.review("demo", i.id, 5, "重复评价"));
  assert.equal(mall.product("a").rating, 4);
  assert.equal(mall.product("a").review_count, 1);
  check(store);
  store.close();
});
test("三次部分退款覆盖分币余数，商品全退返券，退款不能超额", () => {
  const { mall, store } = fixture();
  const o = complete(mall, { ...input("a-1", 3), coupons: { s1: "demo-c1" } });
  const amounts = [];
  for (let n = 0; n < 3; n++) {
    const body = { itemId: o.items[0].id, quantity: 1, reason: "模拟退货" };
    const r = mall.requestReturn("demo", body, "r" + n);
    assert.deepEqual(mall.requestReturn("demo", body, "r" + n), { ...r });
    amounts.push(r.amount);
    error(n < 2 ? "RETURN_IN_PROGRESS" : "RETURN_QUANTITY", () =>
      mall.requestReturn("demo", body, "active" + n),
    );
    mall.advance("demo", r.id, "approve_return");
    mall.returnAction("demo", r.id, "ship", "LOCAL-" + n);
    mall.advance("demo", r.id, "refund_return");
    error("NO_PENDING_JOB", () => mall.advance("demo", r.id, "refund_return"));
    check(store);
    if (n < 2)
      assert.equal(
        store.get("SELECT status FROM user_coupons WHERE id='demo-c1'")!.status,
        "used",
      );
  }
  assert.deepEqual(amounts, [3134, 3134, 3135]);
  assert.equal(mall.order("demo", o.id).refunded, 9403);
  assert.equal(mall.sku("a-1").stock, 20);
  assert.equal(
    store.get("SELECT status FROM user_coupons WHERE id='demo-c1'")!.status,
    "available",
  );
  error("RETURN_QUANTITY", () =>
    mall.requestReturn(
      "demo",
      { itemId: o.items[0].id, quantity: 1, reason: "多退" },
      "too-many",
    ),
  );
  store.close();
});
test("收货后退款不退原运费，撤销售后允许重提且不恢复库存", () => {
  const { mall, store } = fixture();
  const o = complete(mall);
  const body = { itemId: o.items[0].id, quantity: 1, reason: "体验退货" };
  const r = mall.requestReturn("demo", body, "r");
  mall.returnAction("demo", r.id, "cancel");
  assert.equal(mall.sku("a-1").stock, 19);
  const r2 = mall.requestReturn("demo", body, "r2");
  mall.advance("demo", r2.id);
  mall.returnAction("demo", r2.id, "ship", "LOCAL");
  mall.advance("demo", r2.id);
  assert.equal(mall.order("demo", o.id).refunded, 3301);
  assert.equal(o.total, 3901);
  check(store);
  store.close();
});
test("7天窗口、不可退商品和未批准寄回均明确失败", () => {
  const { mall, store, advance } = fixture();
  const o = complete(mall);
  const body = { itemId: o.items[0].id, quantity: 1, reason: "测试" };
  const r = mall.requestReturn("demo", body, "r");
  error("INVALID_STATE", () =>
    mall.returnAction("demo", r.id, "ship", "LOCAL"),
  );
  mall.returnAction("demo", r.id, "cancel");
  store.run("UPDATE products SET returnable=0 WHERE id='a'");
  error("NOT_RETURNABLE", () => mall.requestReturn("demo", body, "no"));
  store.run("UPDATE products SET returnable=1 WHERE id='a'");
  advance(7 * 86400000 + 1);
  error("RETURN_WINDOW", () => mall.requestReturn("demo", body, "old"));
  store.close();
});
test("进程重启后持久任务继续；暂停不会推进发货", () => {
  fs.mkdirSync("test-results", { recursive: true });
  const file = path.resolve(
    "test-results/restart-" + crypto.randomUUID() + ".sqlite",
  );
  const f = fixture(file);
  const c = f.mall.createOrder("demo", input(), "c");
  f.mall.pay("demo", c.groupId, true, "p");
  f.store.close();
  const store = new Store(file);
  let time = referenceTime + 60001;
  const m = new Mall(store, () => time);
  store.run("UPDATE metadata SET value='false' WHERE key='auto_advance'");
  m.tick();
  assert.equal(m.order("demo", c.orderIds[0]).status, "pending_shipment");
  store.run("UPDATE metadata SET value='true' WHERE key='auto_advance'");
  m.tick();
  assert.equal(m.order("demo", c.orderIds[0]).status, "shipped");
  time += 120001;
  m.tick();
  assert.ok(m.order("demo", c.orderIds[0]).delivered_at);
  check(store);
  store.close();
});
test("搜索组合筛选、分页、转义通配符和金额排序", () => {
  const { mall, store } = fixture();
  const r = mall.listProducts({
    q: "测试 好物",
    self: "1",
    stock: "1",
    min: "30",
    max: "70",
    sort: "price_desc",
    limit: "1",
    page: "2",
  });
  assert.equal(r.total, 2);
  assert.equal(r.items[0].id, "a");
  assert.equal(mall.listProducts({ q: "%' OR 1=1 --" }).total, 0);
  store.close();
});
test("固定种子重复生成规范状态一致，校验器能发现库存破坏", () => {
  const a = new Store(":memory:");
  const b = new Store(":memory:");
  seed(a);
  seed(b);
  check(a);
  check(b);
  for (const table of [
    "users",
    "categories",
    "products",
    "skus",
    "orders",
    "order_items",
    "payments",
    "stock_ledger",
    "reviews",
    "jobs",
    "idempotency",
  ])
    assert.deepEqual(
      a.all("SELECT * FROM " + table),
      b.all("SELECT * FROM " + table),
      table,
    );
  assert.equal(a.get("SELECT COUNT(*) n FROM products")!.n, 200);
  assert.equal(a.get("SELECT COUNT(*) n FROM skus")!.n, 600);
  a.run("UPDATE skus SET stock=stock+1 WHERE id=?", "p0001-1");
  assert.equal(validate(a).ok, false);
  a.close();
  b.close();
});

test("CLI连续重置先备份，恢复同一规范状态并清除会话与额外任务", () => {
  fs.mkdirSync("test-results", { recursive: true });
  const file = path.resolve(
    "test-results/reset-" + crypto.randomUUID() + ".sqlite",
  );
  const reset = () => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "server/cli.ts", "reset"],
      { env: { ...process.env, DB_PATH: file }, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  const state = (s: Store) =>
    Object.fromEntries(
      s
        .all(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('metadata','sqlite_sequence') ORDER BY name",
        )
        .map((t) => [t.name, s.all("SELECT * FROM " + t.name)]),
    );
  reset();
  let store = new Store(file);
  const before = state(store);
  store.run(
    "INSERT INTO sessions VALUES(?,NULL,?)",
    "disposable-test-session",
    Date.now(),
  );
  new Mall(store, () => referenceTime).createOrder(
    "demo",
    { addressId: "addr-demo", items: [{ skuId: "p0001-1", quantity: 1 }] },
    "reset-test",
  );
  store.close();
  assert.match(reset(), /已备份/);
  store = new Store(file);
  assert.deepEqual(state(store), before);
  check(store);
  store.close();
});

test("HTTP集成：Cookie轮换/合并/隔离、注册登录、越权、防跨站、并发最后库存", async () => {
  const { store, now } = fixture();
  const { app } = createApp(store, now);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const port = (server.address() as { port: number }).port;
  const root = "http://127.0.0.1:" + port + "/api/v1";
  function client() {
    let cookie = "";
    return async (
      route: string,
      method = "GET",
      body?: unknown,
      key?: string,
    ) => {
      const response = await fetch(root + route, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        ...(method !== "GET" ? { body: JSON.stringify(body ?? {}) } : {}),
      });
      const set = response.headers.getSetCookie().at(-1);
      if (set) cookie = set.split(";")[0];
      return {
        status: response.status,
        data: (await response.json()) as any,
        cookie,
        set,
      };
    };
  }
  try {
    const a = client(),
      b = client();
    const guest = await a("/bootstrap");
    assert.match(guest.set!, /HttpOnly/);
    assert.match(guest.set!, /SameSite=Lax/);
    await a("/cart", "POST", { skuId: "b-1", quantity: 1 });
    const login = await a("/auth/demo", "POST");
    assert.notEqual(guest.cookie, login.cookie);
    assert.equal((await a("/cart")).data.length, 1);
    await b("/auth/demo", "POST", { account: "other" });
    assert.equal((await b("/cart")).data.length, 0);
    assert.equal((await b("/addresses")).data[0].id, "addr-other");
    const made = await a("/orders", "POST", input("b-1"), "order");
    assert.equal(made.status, 201);
    for (const [route, method, body] of [
      ["/orders/" + made.data.orderIds[0], "GET", {}],
      ["/orders/" + made.data.orderIds[0] + "/cancel", "POST", {}],
      ["/payments/" + made.data.groupId, "GET", {}],
      ["/demo/advance", "POST", { entityId: made.data.orderIds[0] }],
    ] as const)
      assert.equal((await b(route, method, body, "other")).status, 404);
    assert.equal(
      (await b("/demo/auto", "POST", { enabled: false })).status,
      403,
    );
    assert.equal(
      (
        await a(
          "/orders",
          "POST",
          { addressId: "addr-demo", items: [null] },
          "null",
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(root + "/auth/demo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://example.org",
          },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(root + "/auth/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "[]",
        })
      ).status,
      400,
    );
    const compressed = await fetch(root + "/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" },
      body: gzipSync("{}"),
    });
    assert.equal(compressed.status, 415, "compressed bodies stay disabled");
    const oversized = await fetch(root + "/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "x".repeat(140000) }),
    });
    assert.equal(oversized.status, 413);
    const c = client();
    assert.equal(
      (
        await c("/auth/register", "POST", {
          username: "new_user",
          password: "NewLocal123!",
          nickname: "新用户",
        })
      ).status,
      201,
    );
    await c("/auth/logout", "POST");
    assert.equal((await c("/orders")).status, 401);
    assert.equal(
      (
        await c("/auth/login", "POST", {
          username: "new_user",
          password: "NewLocal123!",
        })
      ).status,
      200,
    );
    store.run("UPDATE skus SET stock=1,initial_stock=1 WHERE id='a-1'");
    const races = await Promise.all([
      a("/orders", "POST", input(), "raceA"),
      b("/orders", "POST", { ...input(), addressId: "addr-other" }, "raceB"),
    ]);
    assert.deepEqual(races.map((r) => r.status).sort(), [201, 409]);
    check(store);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    store.close();
  }
});
