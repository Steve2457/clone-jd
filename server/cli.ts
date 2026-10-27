import fs from "node:fs";
import path from "node:path";
import { Store } from "./db.ts";
import { seed } from "./seed.ts";
import { validate } from "./validate.ts";
const file = path.resolve(process.env.DB_PATH || "data/mall.sqlite");
const mode = process.argv[2] || "check";
const pidFile = process.env.DB_PATH ? file + ".pid" : "data/server.pid";
if (mode === "reset" && fs.existsSync(pidFile)) {
  const pid = Number(fs.readFileSync(pidFile, "utf8"));
  try {
    process.kill(pid, 0);
    console.error("商城仍在运行，请先关闭服务再重置，避免旧请求污染数据。");
    process.exit(1);
  } catch {}
}
if (mode === "reset" && fs.existsSync(file)) {
  const backupDir = path.resolve("data/backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const old = new Store(file);
  old.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  old.close();
  const backup = path.join(
    backupDir,
    "mall-" + new Date().toISOString().replace(/[:.]/g, "-") + ".sqlite",
  );
  fs.copyFileSync(file, backup);
  console.log("已备份 " + backup);
  for (const suffix of ["", "-wal", "-shm"])
    if (fs.existsSync(file + suffix)) fs.unlinkSync(file + suffix);
}
const store = new Store(file);
if (["init", "reset"].includes(mode)) seed(store);
const report = validate(store);
console.log(JSON.stringify(report, null, 2));
store.close();
if (!report.ok) process.exitCode = 1;
