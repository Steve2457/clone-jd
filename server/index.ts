import fs from "node:fs";
import path from "node:path";
import express from "express";
import { Store } from "./db.ts";
import { seed } from "./seed.ts";
import { createApp } from "./app.ts";
const file = path.resolve(process.env.DB_PATH || "data/mall.sqlite");
const store = new Store(file);
seed(store);
const { app, mall } = createApp(store);
const production =
  fs.existsSync(path.resolve("dist/index.html")) &&
  process.env.NODE_ENV !== "development" &&
  !process.argv.includes("--dev");
if (production) {
  app.use((_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    );
    next();
  });
  app.use(express.static(path.resolve("dist")));
  app.get("/{*splat}", (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const pidFile = process.env.DB_PATH ? file + ".pid" : "data/server.pid";
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, "127.0.0.1", () => {
  fs.writeFileSync(pidFile, String(process.pid));
  console.log(`京东本地商城已启动：http://localhost:${port}`);
});
server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `端口 ${port} 已占用。请关闭已有商城进程，或设置 PORT 使用其他端口。`
      : error.message,
  );
  process.exit(1);
});
const timer = setInterval(() => mall.tick(), 1000);
timer.unref();
function close() {
  clearInterval(timer);
  server.close(() => {
    store.close();
    if (
      fs.existsSync(pidFile) &&
      fs.readFileSync(pidFile, "utf8") === String(process.pid)
    )
      fs.unlinkSync(pidFile);
    process.exit(0);
  });
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
