import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const home = JSON.parse(fs.readFileSync("data/home-source.json", "utf8"));
const search = JSON.parse(fs.readFileSync("data/search-source.json", "utf8"));
const bundles = [
  JSON.parse(fs.readFileSync("data/home-assets.json", "utf8")),
  ...JSON.parse(fs.readFileSync("data/search-assets.json", "utf8")),
];
const mapping = {};
const manifest = [];
for (const a of JSON.parse(
  fs.readFileSync("data/asset-manifest.json", "utf8"),
)) {
  if (a.url && fs.existsSync(path.join("public", a.file))) {
    mapping[a.url] = a.file;
    manifest.push(a);
  }
}
for (const bundle of bundles)
  for (const a of bundle.assets) {
    if (mapping[a.url]) continue;
    const extension =
      a.contentType === "image/avif"
        ? ".avif"
        : a.contentType === "image/webp"
          ? ".webp"
          : a.contentType === "image/png"
            ? ".png"
            : ".jpg";
    const name = a.id + extension;
    if (!fs.existsSync(path.join("public/assets", name))) {
      if (!fs.existsSync(a.path)) continue;
      fs.copyFileSync(a.path, path.join("public/assets", name));
    }
    mapping[a.url] = "/assets/" + name;
    manifest.push({
      url: a.url,
      file: "/assets/" + name,
      source: "京东公开页面",
      capturedAt: "2026-10-26",
      kind: "observed",
    });
  }
// Only exact public image URLs already observed in the browser are eligible.
const missing = [
  ...new Set(
    [...search, ...home.products, ...home.promos]
      .map((p) => p.image)
      .filter((url) => !mapping[url]),
  ),
];
for (let i = 0; i < missing.length; i += 8)
  await Promise.all(
    missing.slice(i, i + 8).map(async (url) => {
      const u = new URL(url);
      if (!u.hostname.endsWith(".360buyimg.com"))
        throw Error("Unexpected asset host");
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw Error("Asset HTTP " + response.status);
      const type = response.headers.get("content-type") || "";
      if (!type.startsWith("image/")) throw Error("Not an image");
      const name =
        createHash("sha256").update(url).digest("hex").slice(0, 16) +
        (type.includes("avif")
          ? ".avif"
          : type.includes("png")
            ? ".png"
            : type.includes("webp")
              ? ".webp"
              : ".jpg");
      fs.writeFileSync(
        path.join("public/assets", name),
        Buffer.from(await response.arrayBuffer()),
      );
      mapping[url] = "/assets/" + name;
      manifest.push({
        url,
        file: mapping[url],
        source: "京东公开商品卡片",
        capturedAt: "2026-10-26",
        kind: "observed",
      });
    }),
  );
const categories = [
  ["digital", "手机 / 数码", "手机、耳机、智能设备"],
  ["appliance", "家用电器", "厨房电器、生活电器"],
  ["office", "电脑 / 办公", "笔记本、电脑配件、文具"],
  ["home", "家纺 / 家居 / 厨具", "厨房用品、家纺收纳"],
  ["furniture", "家具 / 家装 / 灯具", "照明、家装好物"],
  ["fashion", "内衣 / 男装 / 女装 / 童装", "舒适服饰、日常穿搭"],
  ["bags", "箱包 / 钟表 / 珠宝 / 女鞋", "双肩包、旅行出行"],
  ["sport", "运动 / 户外 / 男鞋", "跑步鞋、健身器材"],
  ["auto", "汽车用品 / 车载电器", "车内清洁、出行装备"],
  ["baby", "母婴 / 洗护喂养", "婴儿护理、安心成长"],
  ["toys", "玩具乐器 / 宠物生活", "益智玩具、宠物用品"],
  ["cleaning", "家庭清洁 / 个护", "洗衣清洁、口腔护理"],
  ["books", "图书 / 童书 / 文学", "文学阅读、经典好书"],
].map(([id, name, description]) => ({ id, name, description }));
function categoryFor(t) {
  for (const [key, re] of [
    ["sport", /健身|握力|仰卧|甩脂|手套/],
    ["baby", /婴|宝宝|隔尿/],
    ["toys", /魔方|玩具|猫砂/],
    ["auto", /安全座椅/],
    ["office", /得力|硬盘|电话机/],
    ["digital", /腾讯|云台|手机散热|投影/],
    ["cleaning", /刀片|牙刷|舌苔|爆炸盐|体温/],
    ["home", /枕头/],
  ])
    if (re.test(t)) return key;
  return "appliance";
}
const selected = home.products.map((p, i) => ({
  ...p,
  sourceId: "home-" + (i + 1),
  sourceUrl: "https://global.jd.com/",
  category: categoryFor(p.title),
  selfOperated: true,
  shop: "京东自营",
}));
const seen = new Set(selected.map((p) => p.title));
for (let row = 0; selected.length < 200 && row < 16; row++)
  for (const cat of categories) {
    const p = search.filter((p) => p.category === cat.id)[row];
    if (p && !seen.has(p.title) && mapping[p.image] && selected.length < 200) {
      selected.push(p);
      seen.add(p.title);
    }
  }
function brandOf(t) {
  const m = t.match(/^([\u4e00-\u9fa5A-Za-z. ]{2,18})[（(]/);
  if (m) return m[1].trim();
  const known = [
    "小熊",
    "九阳",
    "美的",
    "得力",
    "飞利浦",
    "华为",
    "小米",
    "Apple",
    "vivo",
    "OPPO",
    "联想",
    "华硕",
    "荣耀",
    "机械革命",
    "安踏",
    "李宁",
    "特步",
    "耐克",
    "阿迪达斯",
    "苏泊尔",
    "三只松鼠",
    "蓝月亮",
    "奥妙",
    "立白",
    "威露士",
    "汰渍",
    "京东京造",
    "babycare",
  ];
  return (
    known.find((x) => t.toLowerCase().includes(x.toLowerCase())) ||
    t.split(/[\s（(【]/)[0].slice(0, 8) ||
    "精选品牌"
  );
}
const products = selected.map((p, i) => ({
  id: "p" + String(i + 1).padStart(4, "0"),
  title: p.title.replace(/【(?:价保|保价|保价双|价保双).*?】/g, ""),
  category: p.category,
  productType: p.productType || "",
  searchTerms: p.searchTerms || [],
  brand: brandOf(p.title),
  image: mapping[p.image],
  price: Math.max(100, Math.round(p.price * 100)),
  sourceUrl: p.sourceUrl,
  sourceId: p.sourceId,
  selfOperated: p.selfOperated,
  shop: p.selfOperated ? "京东自营" : p.shop || "品牌精选旗舰店",
  featured: i < 37,
  description:
    "精选品质，细节用心。商品名称及图片参考京东公开目录，销售价格为本地冻结价格，组合规格与库存为演示数据。",
}));
if (products.length !== 200 || products.some((p) => !p.image))
  throw Error("目录数量或素材不完整");
const promos = [
  ...new Map(
    home.promos
      .filter((p) => mapping[p.image])
      .map((p) => [p.image, { image: mapping[p.image], sourceUrl: p.link }]),
  ).values(),
];
const catalog = {
  version: 1,
  seed: 42,
  referenceTime: "2026-10-26T04:00:00.000Z",
  categories,
  products,
  promos,
};
fs.writeFileSync("data/catalog.json", JSON.stringify(catalog, null, 2));
fs.writeFileSync("data/asset-manifest.json", JSON.stringify(manifest, null, 2));
console.log(
  JSON.stringify({
    products: products.length,
    categories: categories.length,
    images: manifest.length,
    promos: promos.length,
  }),
);
