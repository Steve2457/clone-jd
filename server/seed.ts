import fs from "node:fs";
import path from "node:path";
import { Store } from "./db.ts";
import { Mall } from "./mall.ts";
import { hashPassword } from "./security.ts";
export const referenceTime = Date.parse("2026-10-26T04:00:00.000Z");
export const catalog = () =>
  JSON.parse(fs.readFileSync(path.resolve("data/catalog.json"), "utf8"));
export function syncProductSearch(store: Store, data = catalog()) {
  for (const p of data.products) {
    store.run(
      `INSERT INTO product_search(product_id,product_type,terms)
       SELECT id,?,? FROM products WHERE id=?
       ON CONFLICT(product_id) DO UPDATE SET product_type=excluded.product_type,terms=excluded.terms`,
      p.productType || "",
      (p.searchTerms || []).join(" "),
      p.id,
    );
  }
}
export function seed(store: Store) {
  const data = catalog();
  if (store.get("SELECT COUNT(*) n FROM products")!.n) {
    // Upgrade search metadata in place; never reset transactions, inventory or accounts.
    store.tx(() => syncProductSearch(store, data));
    return;
  }
  store.tx(() => {
    store.run("INSERT OR REPLACE INTO metadata VALUES('seed_version','1')");
    store.run(
      "INSERT OR REPLACE INTO metadata VALUES('clock',?)",
      JSON.stringify({ reference: referenceTime, started: Date.now() }),
    );
    data.categories.forEach((c: any, i: number) =>
      store.run(
        "INSERT INTO categories VALUES(?,?,?,?)",
        c.id,
        c.name,
        c.description,
        i,
      ),
    );
    const shops = new Map<string, string>();
    data.products.forEach((p: any, i: number) => {
      const shopName = p.selfOperated ? "京东自营" : p.shop;
      let shopId = shops.get(shopName);
      if (!shopId) {
        shopId = "s" + String(shops.size + 1).padStart(3, "0");
        shops.set(shopName, shopId);
        store.run(
          "INSERT INTO shops VALUES(?,?,?,?,?)",
          shopId,
          shopName,
          p.selfOperated ? 1 : 0,
          5900,
          600,
        );
      }
      store.run(
        "INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        p.id,
        p.category,
        shopId,
        p.title,
        p.brand,
        p.image,
        p.description,
        p.sourceUrl,
        p.featured ? 1 : 0,
        i % 23 === 22 ? 0 : 1,
        i,
      );
      for (let v = 0; v < 3; v++) {
        const count = v + 1;
        const stock =
          i % 29 === 28
            ? 0
            : i === 7 && v === 0
              ? 1
              : i % 17 === 16 && v === 2
                ? 0
                : 35 + ((i * 17 + v * 11) % 65);
        const price = Math.round(
          p.price * count * (v === 0 ? 1 : v === 1 ? 0.98 : 0.96),
        );
        store.run(
          "INSERT INTO skus VALUES(?,?,?,?,?,?,?,?,?)",
          p.id + "-" + count,
          p.id,
          ["标准款 · 1件装", "双件组合 · 2件装", "家庭组合 · 3件装"][v],
          price,
          stock,
          stock,
          (200 + ((i * 113) % 2600)) * count,
          i % 7 === 0 ? 1 : 0,
          count,
        );
      }
    });
    syncProductSearch(store, data);
    for (let i = 0; i < 12; i++) {
      const id = i === 0 ? "demo" : i === 1 ? "other" : "reader" + i;
      const username = i === 0 ? "demo" : i === 1 ? "demo2" : "reader" + i;
      store.run(
        "INSERT INTO users VALUES(?,?,?,?,?)",
        id,
        username,
        hashPassword("JdDemo123!", ("local-seed-" + i).padEnd(32, "0")),
        i === 0
          ? "京东体验官"
          : i === 1
            ? "小京同学"
            : ["向阳而生", "悦享生活", "好物发现家", "认真生活", "城市漫游者"][
                i % 5
              ],
        referenceTime - 30 * 86400000,
      );
      store.run(
        "INSERT INTO addresses VALUES(?,?,?,?,?,?,?,?,?)",
        "addr-" + id,
        id,
        i === 0 ? "体验用户" : "演示用户",
        "1380000" + String(i).padStart(4, "0"),
        "北京市",
        "北京市",
        "朝阳区",
        "演示路 88 号 本地体验中心（虚构地址）",
        1,
      );
    }
    const defs = [
      ["c1", "新人好礼", 500, 4900, null, null, 365],
      ["c2", "品质生活券", 2000, 19900, null, null, 365],
      ["c3", "大额购物券", 4000, 39900, null, null, 365],
      ["c4", "数码专享券", 10000, 199900, null, "digital", 365],
      ["c5", "家居焕新券", 1000, 9900, null, "home", 365],
      ["c6", "已过期体验券", 1000, 5000, null, null, -1],
    ];
    for (const c of defs)
      store.run(
        "INSERT INTO coupons VALUES(?,?,?,?,?,?,?)",
        c[0] as string,
        c[1] as string,
        c[2] as number,
        c[3] as number,
        c[4] as null,
        c[5] as string | null,
        referenceTime + (c[6] as number) * 86400000,
      );
    for (const user of ["demo", "other"])
      for (const c of ["c1", "c2", "c3", "c6"])
        store.run(
          "INSERT INTO user_coupons VALUES(?,?,?,'available',NULL)",
          "uc-" + user + "-" + c,
          user,
          c,
        );
  });
  let t = referenceTime - 4 * 86400000;
  let seq = 0;
  const mall = new Mall(store, () => t);
  mall.id = (prefix: string) =>
    prefix + "_seed_" + String(++seq).padStart(6, "0");
  const available = store.all(
    "SELECT id FROM skus WHERE stock>=10 AND pack_count=1 ORDER BY product_id",
  );
  const comments = [
    "包装很仔细，商品与描述一致，使用体验不错。",
    "品质挺好，做工细节让人满意，配送很方便。",
    "挑选了很久，这款很适合日常使用。",
    "整体符合预期，性价比不错，会继续关注。",
    "收到就试用了，操作方便，推荐给需要的朋友。",
  ];
  for (let i = 0; i < 80; i++) {
    const user = i < 8 ? "demo" : i < 10 ? "other" : "reader" + (2 + (i % 10));
    t = referenceTime - (5 - (i % 3)) * 86400000 + i * 60000;
    const sku = available[i % available.length].id;
    const created = mall.createOrder(
      user,
      {
        addressId: "addr-" + user,
        items: [{ skuId: sku, quantity: 1 + (i % 2) }],
      },
      "seed-create-" + i,
    );
    t += 1000;
    mall.pay(user, created.groupId, true, "seed-pay-" + i);
    t += 60000;
    mall.advance(user, created.orderIds[0], "ship");
    t += 120000;
    mall.advance(user, created.orderIds[0], "deliver");
    t += 1000;
    const o = mall.receive(user, created.orderIds[0], "seed-receive-" + i);
    if (i > 3)
      mall.review(
        user,
        o.items[0].id,
        i % 9 === 0 ? 4 : 5,
        comments[i % comments.length],
      );
  }
  t = referenceTime - 45000;
  for (let i = 0; i < 3; i++) {
    const created = mall.createOrder(
      "demo",
      {
        addressId: "addr-demo",
        items: [{ skuId: available[85 + i].id, quantity: 1 }],
      },
      "seed-current-" + i,
    );
    if (i > 0) mall.pay("demo", created.groupId, true, "seed-current-pay-" + i);
    if (i === 2) mall.advance("demo", created.orderIds[0], "ship");
  }
  const cancelled = mall.createOrder(
    "demo",
    {
      addressId: "addr-demo",
      items: [{ skuId: available[90].id, quantity: 1 }],
    },
    "seed-cancelled",
  );
  mall.cancel("demo", cancelled.orderIds[0], "seed-cancel");
  store.run(
    "INSERT INTO favorites VALUES(?,?,?)",
    "demo",
    "p0006",
    referenceTime - 86400000,
  );
  store.run(
    "INSERT INTO favorites VALUES(?,?,?)",
    "demo",
    "p0022",
    referenceTime - 86400000,
  );
  store.run(
    "INSERT OR REPLACE INTO metadata VALUES('clock',?)",
    JSON.stringify({ reference: referenceTime, started: Date.now() }),
  );
}
