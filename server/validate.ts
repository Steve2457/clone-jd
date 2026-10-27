import fs from "node:fs";
import path from "node:path";
import { Store } from "./db.ts";
export function validate(store: Store) {
  const errors: string[] = [];
  const check = (label: string, sql: string) => {
    const rows = store.all(sql);
    if (rows.length)
      errors.push(`${label}: ${JSON.stringify(rows.slice(0, 5))}`);
  };
  check("外键", "PRAGMA foreign_key_check");
  check(
    "库存流水不平",
    `SELECT s.id,s.stock,s.initial_stock+COALESCE(SUM(l.delta),0) expected FROM skus s LEFT JOIN stock_ledger l ON l.sku_id=s.id GROUP BY s.id HAVING stock!=expected OR stock<0`,
  );
  check(
    "订单金额",
    `SELECT o.id FROM orders o JOIN order_items i ON i.order_id=o.id GROUP BY o.id HAVING o.subtotal!=SUM(i.unit_price*i.quantity) OR o.discount!=SUM(i.discount) OR o.total!=SUM(i.total)+o.shipping OR o.total!=o.subtotal-o.discount+o.shipping`,
  );
  check(
    "订单项金额",
    `SELECT id FROM order_items WHERE unit_price*quantity-discount!=total OR returned_quantity>quantity OR refunded>total`,
  );
  check(
    "退款对账",
    `SELECT o.id FROM orders o WHERE o.refunded != CASE WHEN o.status='cancelled' AND o.payment_status='refunded' THEN o.total ELSE (SELECT COALESCE(SUM(amount),0) FROM returns r WHERE r.order_id=o.id AND r.status='refunded') END`,
  );
  check(
    "库存业务余额",
    `SELECT s.id FROM skus s WHERE s.stock != s.initial_stock-COALESCE((SELECT SUM(i.quantity-i.returned_quantity) FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.sku_id=s.id AND o.status!='cancelled'),0)`,
  );
  check(
    "优惠券归属与状态",
    `SELECT uc.id FROM user_coupons uc LEFT JOIN orders o ON o.id=uc.order_id WHERE (uc.status IN ('locked','used') AND (o.id IS NULL OR uc.user_id!=o.user_id OR o.status='cancelled')) OR (uc.status='locked' AND o.status!='pending_payment')`,
  );
  check(
    "评价归属",
    `SELECT r.id FROM reviews r JOIN order_items i ON i.id=r.order_item_id JOIN orders o ON o.id=i.order_id WHERE r.user_id!=o.user_id OR r.product_id!=i.product_id OR o.status!='completed' OR r.created_at<o.completed_at`,
  );
  check(
    "时间顺序",
    `SELECT id FROM orders WHERE expires_at<created_at OR paid_at<created_at OR shipped_at<paid_at OR delivered_at<shipped_at OR completed_at<delivered_at OR cancelled_at<created_at`,
  );
  check(
    "售后数量",
    `SELECT i.id FROM order_items i WHERE i.returned_quantity!=(SELECT COALESCE(SUM(quantity),0) FROM returns r WHERE r.item_id=i.id AND r.status='refunded') OR i.refunded!=(SELECT COALESCE(SUM(amount),0) FROM returns r WHERE r.item_id=i.id AND r.status='refunded')`,
  );
  check(
    "不可达商品",
    `SELECT p.id FROM products p LEFT JOIN skus s ON s.product_id=p.id WHERE s.id IS NULL`,
  );
  check("模拟任务失败", "SELECT id,error FROM jobs WHERE status='failed'");
  for (const p of store.all("SELECT id,image FROM products"))
    if (!fs.existsSync(path.resolve("public" + p.image)))
      errors.push("缺少图片 " + p.id);
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve("data/asset-manifest.json"), "utf8"),
  );
  for (const asset of manifest)
    if (!fs.existsSync(path.resolve("public" + asset.file)))
      errors.push("资源清单文件缺失 " + asset.file);
  check(
    "收款对账",
    `SELECT g.id FROM checkout_groups g WHERE COALESCE((SELECT SUM(amount) FROM payments p WHERE p.group_id=g.id AND p.status='success'),0) != COALESCE((SELECT SUM(total) FROM orders o WHERE o.group_id=g.id AND o.paid_at IS NOT NULL),0)`,
  );
  const counts = Object.fromEntries(
    [
      "products",
      "skus",
      "users",
      "orders",
      "order_items",
      "reviews",
      "returns",
      "shops",
    ].map((table) => [table, store.get("SELECT COUNT(*) n FROM " + table)!.n]),
  );
  return { ok: errors.length === 0, errors, counts };
}
