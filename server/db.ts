import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
export type Row = Record<string, any>;
export class Store {
  db: DatabaseSync;
  constructor(public filename: string) {
    if (filename !== ":memory:")
      fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
    );
    this.migrate();
  }
  all(sql: string, ...params: SQLInputValue[]): Row[] {
    return this.db.prepare(sql).all(...params) as Row[];
  }
  get(sql: string, ...params: SQLInputValue[]): Row | undefined {
    return this.db.prepare(sql).get(...params) as Row | undefined;
  }
  run(sql: string, ...params: SQLInputValue[]) {
    return this.db.prepare(sql).run(...params);
  }
  tx<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.db.close();
  }
  migrate() {
    this.db.exec(`
    CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,nickname TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,position INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS shops(id TEXT PRIMARY KEY,name TEXT NOT NULL,self_operated INTEGER NOT NULL,free_threshold INTEGER NOT NULL DEFAULT 5900,base_shipping INTEGER NOT NULL DEFAULT 600);
    CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,category_id TEXT NOT NULL REFERENCES categories(id),shop_id TEXT NOT NULL REFERENCES shops(id),title TEXT NOT NULL,brand TEXT NOT NULL,image TEXT NOT NULL,description TEXT NOT NULL,source_url TEXT NOT NULL,featured INTEGER NOT NULL,returnable INTEGER NOT NULL,position INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS skus(id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),label TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>0),stock INTEGER NOT NULL CHECK(stock>=0),initial_stock INTEGER NOT NULL CHECK(initial_stock>=0),weight_g INTEGER NOT NULL CHECK(weight_g>0),free_shipping INTEGER NOT NULL,pack_count INTEGER NOT NULL CHECK(pack_count>0));
    CREATE TABLE IF NOT EXISTS stock_ledger(id INTEGER PRIMARY KEY AUTOINCREMENT,sku_id TEXT NOT NULL REFERENCES skus(id),order_id TEXT,delta INTEGER NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS addresses(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,phone TEXT NOT NULL,province TEXT NOT NULL,city TEXT NOT NULL,district TEXT NOT NULL,detail TEXT NOT NULL,is_default INTEGER NOT NULL DEFAULT 0);
    CREATE UNIQUE INDEX IF NOT EXISTS one_default_address ON addresses(user_id) WHERE is_default=1;
    CREATE TABLE IF NOT EXISTS cart(owner TEXT NOT NULL,sku_id TEXT NOT NULL REFERENCES skus(id),quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),selected INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(owner,sku_id));
    CREATE TABLE IF NOT EXISTS favorites(user_id TEXT NOT NULL REFERENCES users(id),product_id TEXT NOT NULL REFERENCES products(id),created_at INTEGER NOT NULL,PRIMARY KEY(user_id,product_id));
    CREATE TABLE IF NOT EXISTS coupons(id TEXT PRIMARY KEY,name TEXT NOT NULL,discount INTEGER NOT NULL CHECK(discount>0),min_spend INTEGER NOT NULL,shop_id TEXT REFERENCES shops(id),category_id TEXT REFERENCES categories(id),expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS user_coupons(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),coupon_id TEXT NOT NULL REFERENCES coupons(id),status TEXT NOT NULL CHECK(status IN ('available','locked','used')),order_id TEXT,UNIQUE(user_id,coupon_id));
    CREATE TABLE IF NOT EXISTS checkout_groups(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,group_id TEXT NOT NULL REFERENCES checkout_groups(id),user_id TEXT NOT NULL REFERENCES users(id),shop_id TEXT NOT NULL REFERENCES shops(id),status TEXT NOT NULL CHECK(status IN ('pending_payment','pending_shipment','shipped','completed','cancelled')),payment_status TEXT NOT NULL CHECK(payment_status IN ('unpaid','paid','partially_refunded','refunded')),subtotal INTEGER NOT NULL,discount INTEGER NOT NULL,shipping INTEGER NOT NULL,total INTEGER NOT NULL CHECK(total>=0),refunded INTEGER NOT NULL DEFAULT 0 CHECK(refunded>=0 AND refunded<=total),address_json TEXT NOT NULL,coupon_id TEXT REFERENCES user_coupons(id),created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,paid_at INTEGER,shipped_at INTEGER,delivered_at INTEGER,completed_at INTEGER,cancelled_at INTEGER);
    CREATE TABLE IF NOT EXISTS order_items(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),sku_id TEXT NOT NULL REFERENCES skus(id),product_id TEXT NOT NULL REFERENCES products(id),title TEXT NOT NULL,label TEXT NOT NULL,image TEXT NOT NULL,unit_price INTEGER NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),discount INTEGER NOT NULL,total INTEGER NOT NULL CHECK(total>=0),returned_quantity INTEGER NOT NULL DEFAULT 0 CHECK(returned_quantity BETWEEN 0 AND quantity),refunded INTEGER NOT NULL DEFAULT 0 CHECK(refunded BETWEEN 0 AND total));
    CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY,group_id TEXT NOT NULL REFERENCES checkout_groups(id),user_id TEXT NOT NULL REFERENCES users(id),amount INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('success','failed')),created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS order_events(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id TEXT NOT NULL REFERENCES orders(id),type TEXT NOT NULL,message TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),product_id TEXT NOT NULL REFERENCES products(id),order_item_id TEXT NOT NULL UNIQUE REFERENCES order_items(id),rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),content TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS returns(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),order_id TEXT NOT NULL REFERENCES orders(id),item_id TEXT NOT NULL REFERENCES order_items(id),quantity INTEGER NOT NULL CHECK(quantity>0),reason TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('requested','approved','returning','refunded','rejected','cancelled')),amount INTEGER NOT NULL,tracking TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,kind TEXT NOT NULL,entity_id TEXT NOT NULL,due_at INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','done','cancelled','failed')),error TEXT,UNIQUE(kind,entity_id));
    CREATE TABLE IF NOT EXISTS idempotency(owner TEXT NOT NULL,action TEXT NOT NULL,key TEXT NOT NULL,payload TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(owner,action,key));
    CREATE TABLE IF NOT EXISTS product_search(product_id TEXT PRIMARY KEY REFERENCES products(id),product_type TEXT NOT NULL,terms TEXT NOT NULL);
    INSERT OR IGNORE INTO metadata(key,value) VALUES('schema_version','1'),('auto_advance','true');
    UPDATE metadata SET value='2' WHERE key='schema_version';
  `);
  }
}
