import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../server/db.ts";
import { Mall } from "../server/mall.ts";
import { seed } from "../server/seed.ts";

const phoneIds = [
  "p0038",
  "p0051",
  "p0064",
  "p0077",
  "p0090",
  "p0103",
  "p0116",
  "p0129",
  "p0142",
  "p0155",
  "p0168",
  "p0181",
  "p0194",
];
function withCatalog(fn: (mall: Mall, store: Store) => void) {
  const store = new Store(":memory:");
  try {
    seed(store);
    fn(new Mall(store), store);
  } finally {
    store.close();
  }
}

test("手机搜索只返回13款整机，短标题机型不丢失，功能提及不冒充整机", () =>
  withCatalog((mall) => {
    for (const q of [
      "手机",
      "智能手机",
      "智能机",
      "smartphone",
      "ＳＭＡＲＴＰＨＯＮＥ",
    ]) {
      const result = mall.listProducts({ q });
      assert.equal(result.total, 13);
      assert.deepEqual(
        result.items.map((p) => p.id),
        phoneIds,
      );
    }
    assert.equal(
      mall.listProducts({ category: "digital" }).total,
      17,
      "数码分类仍可浏览全部数码商品",
    );
    assert.equal(mall.listProducts({ q: "数码" }).total, 17);
  }));

test("品牌加手机支持有无空格，型号别名召回，配件仍可独立搜索", () =>
  withCatalog((mall) => {
    const ids = (q: string) =>
      mall
        .listProducts({ q })
        .items.map((p) => p.id)
        .sort();
    assert.deepEqual(ids("苹果手机"), ["p0064", "p0129", "p0142", "p0181"]);
    assert.deepEqual(ids("苹果 手机"), ids("苹果手机"));
    assert.deepEqual(ids("小米手机"), ["p0051", "p0090", "p0103", "p0155"]);
    assert.deepEqual(ids("手机散热器"), ["p0018"]);
    assert.deepEqual(ids("手机 云台"), ["p0022"]);
    assert.deepEqual(ids("投影仪"), ["p0031"]);
    assert.deepEqual(ids("手机壳"), []);
    assert.deepEqual(ids("华为手机"), [], "目录没有的整机不能用兼容配件凑结果");
  }));

test("手机筛选排序分页使用同一匹配集合，品牌选项只来自搜索结果", () =>
  withCatalog((mall) => {
    const all = mall.listProducts({ q: "手机", sort: "price_asc", limit: 200 });
    assert.ok(
      all.items.every((p, i) => i === 0 || p.price >= all.items[i - 1].price),
    );
    const page = mall.listProducts({
      q: "手机",
      sort: "price_asc",
      page: 2,
      limit: 3,
    });
    assert.equal(page.total, 13);
    assert.deepEqual(
      page.items.map((p) => p.id),
      all.items.slice(3, 6).map((p) => p.id),
    );
    const filtered = mall.listProducts({
      q: "手机",
      stock: "1",
      self: "1",
      min: "1000",
      max: "3000",
    });
    assert.ok(filtered.items.length > 0);
    assert.ok(
      filtered.items.every(
        (p) =>
          phoneIds.includes(p.id) &&
          p.stock > 0 &&
          p.price >= 100000 &&
          p.price <= 300000 &&
          p.self_operated,
      ),
    );
    const brands = mall.catalogMeta({ q: "手机" }).brands;
    assert.deepEqual(new Set(brands), new Set(all.items.map((p) => p.brand)));
    assert.ok(!brands.includes("大疆 DJI Osmo"));
    assert.equal(
      mall.listProducts({ q: "手机", category: "appliance" }).total,
      0,
    );
    assert.ok(
      mall
        .listProducts({ q: "图书" })
        .items.every((p) => p.category_id === "books"),
    );
  }));

test("综合排序优先标题/品牌相关性，不受首页推荐位置支配", () =>
  withCatalog((mall, store) => {
    store.run(
      "UPDATE products SET title='入门便携咖啡机',brand='品牌乙',position=0 WHERE id='p0001'",
    );
    store.run(
      "UPDATE products SET title='咖啡机',brand='品牌甲',position=999 WHERE id='p0002'",
    );
    store.run(
      "UPDATE products SET title='咖啡机 家用款',brand='品牌丙',position=998 WHERE id='p0003'",
    );
    const result = mall.listProducts({ q: "咖啡机" });
    assert.equal(result.items[0].id, "p0002");
    assert.equal(result.items[1].id, "p0003");
    const literalPercent = mall.listProducts({ q: "%" });
    assert.ok(literalPercent.total < 200);
    assert.ok(
      literalPercent.items.every(
        (p) => p.title.includes("%") || p.brand.includes("%"),
      ),
    );
    assert.equal(mall.listProducts({ q: "' OR 1=1 --" }).total, 0);
  }));

test("现有数据库原位补齐搜索索引且重启幂等，不重置交易资料", () =>
  withCatalog((_mall, store) => {
    const tables = [
      "users",
      "sessions",
      "cart",
      "addresses",
      "skus",
      "orders",
      "order_items",
      "stock_ledger",
      "reviews",
      "jobs",
    ];
    const before = tables.map((t) => store.all("SELECT * FROM " + t));
    store.run("DELETE FROM product_search");
    seed(store);
    seed(store);
    assert.deepEqual(
      tables.map((t) => store.all("SELECT * FROM " + t)),
      before,
    );
    assert.equal(
      store.get(
        "SELECT COUNT(*) n FROM product_search WHERE product_type='mobile_phone'",
      )!.n,
      13,
    );
    assert.equal(new Mall(store).listProducts({ q: "手机" }).total, 13);
  }));
