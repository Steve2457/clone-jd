import fs from "node:fs";
import path from "node:path";
const catalog = JSON.parse(fs.readFileSync("data/catalog.json", "utf8"));
const manifest = JSON.parse(
  fs.readFileSync("data/asset-manifest.json", "utf8"),
).filter((x) => x.kind !== "simulated-pack");
for (const product of catalog.products) {
  const bytes = fs.readFileSync(path.join("public", product.image));
  const ext = path.extname(product.image).slice(1);
  const data = `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${bytes.toString("base64")}`;
  for (const count of [2, 3]) {
    const positions =
      count === 2
        ? [
            [8, 78, 270],
            [278, 78, 270],
          ]
        : [
            [150, 6, 260],
            [10, 216, 260],
            [286, 216, 260],
          ];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="560" viewBox="0 0 560 560"><rect width="560" height="560" fill="white"/>${positions.map(([x, y, size]) => `<image href="${data}" x="${x}" y="${y}" width="${size}" height="${size}"/>`).join("")}<rect x="110" y="500" rx="22" width="340" height="42" fill="#fff2f2"/><text x="280" y="528" font-family="Microsoft YaHei,sans-serif" text-anchor="middle" fill="#e2231a" font-size="19">同款 ${count} 件组合 · 本地演示规格</text></svg>`;
    const file = `/assets/${product.id}-pack${count}.svg`;
    fs.writeFileSync(path.join("public", file), svg);
    manifest.push({
      file,
      source: product.image,
      sourceUrl: product.sourceUrl,
      kind: "simulated-pack",
      capturedAt: "2026-10-26",
    });
  }
}
fs.writeFileSync("data/asset-manifest.json", JSON.stringify(manifest, null, 2));
console.log("已生成 400 张本地组合规格图片");
