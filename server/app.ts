import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomBytes } from "node:crypto";
import { Store, type Row } from "./db.ts";
import { Mall, BusinessError, fail, required } from "./mall.ts";
import { hashPassword, checkPassword } from "./security.ts";
import { catalog } from "./seed.ts";
import { validate } from "./validate.ts";
export function createApp(store: Store, clock?: () => number) {
  const app = express();
  const mall = new Mall(store, clock);
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    if (
      req.path.startsWith("/api") &&
      !["GET", "HEAD", "OPTIONS"].includes(req.method)
    ) {
      const origin = req.headers.origin;
      if (origin) {
        try {
          if (
            !["localhost", "127.0.0.1", "[::1]"].includes(
              new URL(origin).hostname,
            ) ||
            new URL(origin).host !== req.headers.host
          )
            return next(
              new BusinessError("ORIGIN_REJECTED", "不接受跨站写入请求", 403),
            );
        } catch {
          return next(new BusinessError("ORIGIN_REJECTED", "来源无效", 403));
        }
      }
      if (!req.is("application/json"))
        return next(
          new BusinessError("JSON_REQUIRED", "请求必须使用 JSON", 415),
        );
    }
    next();
  });
  app.use(express.json({ limit: "128kb", inflate: false }));
  app.use("/api", (req, _res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    )
      return next(
        new BusinessError("INVALID_INPUT", "请求内容必须为 JSON 对象"),
      );
    next();
  });
  app.get("/api/health", (_req, res) => {
    res.json({
      application: "jd-local-mall",
      ok: true,
      seeded: store.get("SELECT COUNT(*) n FROM products")!.n === 200,
      schema: Number(
        store.get("SELECT value FROM metadata WHERE key='schema_version'")!
          .value,
      ),
    });
  });
  app.use("/api/v1", (req, res, next) => {
    const cookie = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("jd_local_session="))
      ?.slice(17);
    let session = cookie
      ? store.get("SELECT * FROM sessions WHERE id=?", cookie)
      : undefined;
    if (session && session.created_at < Date.now() - 30 * 86400000) {
      store.run("DELETE FROM sessions WHERE id=?", session.id);
      session = undefined;
    }
    if (!session) {
      const id = randomBytes(32).toString("hex");
      store.run("INSERT INTO sessions VALUES(?,NULL,?)", id, Date.now());
      session = { id, user_id: null };
      res.cookie("jd_local_session", id, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 86400000,
        path: "/",
      });
    }
    res.locals.session = session;
    res.locals.user = session.user_id
      ? store.get(
          "SELECT id,username,nickname FROM users WHERE id=?",
          session.user_id,
        )
      : null;
    res.locals.owner = session.user_id || "guest:" + session.id;
    next();
  });
  const user = (res: Response): string => {
    if (!res.locals.user) fail("AUTH_REQUIRED", "请先登录", 401);
    return res.locals.user.id;
  };
  const key = (req: Request) => String(req.headers["idempotency-key"] || "");
  const signIn = (res: Response, id: string) => {
    const guest = "guest:" + res.locals.session.id;
    store.tx(() => mall.mergeCart(guest, id));
    store.run("DELETE FROM sessions WHERE id=?", res.locals.session.id);
    const sid = randomBytes(32).toString("hex");
    store.run("INSERT INTO sessions VALUES(?,?,?)", sid, id, Date.now());
    res.cookie("jd_local_session", sid, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 86400000,
      path: "/",
    });
    return store.get("SELECT id,username,nickname FROM users WHERE id=?", id);
  };
  app.get("/api/v1/bootstrap", (_req, res) => {
    const data = catalog();
    res.json({
      user: res.locals.user,
      categories: store.all("SELECT * FROM categories ORDER BY position"),
      promos: data.promos,
      cartCount: mall
        .cart(res.locals.owner)
        .reduce((n, i) => n + i.quantity, 0),
      now: mall.now(),
    });
  });
  app.post("/api/v1/auth/demo", (req, res) => {
    const id = req.body.account === "other" ? "other" : "demo";
    res.json({ user: signIn(res, id) });
  });
  app.post("/api/v1/auth/login", (req, res) => {
    const username = required(req.body.username, "用户名", 32),
      password = required(req.body.password, "密码", 100);
    const u = store.get("SELECT * FROM users WHERE username=?", username);
    if (!u || !checkPassword(password, u.password_hash))
      fail("INVALID_LOGIN", "用户名或密码错误", 401);
    res.json({ user: signIn(res, u.id) });
  });
  app.post("/api/v1/auth/register", (req, res) => {
    const username = required(req.body.username, "用户名", 32),
      password = required(req.body.password, "密码", 100),
      nickname = required(req.body.nickname || username, "昵称", 30);
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username))
      fail("INVALID_USERNAME", "用户名为 3–32 位字母、数字或下划线");
    if (password.length < 8) fail("WEAK_PASSWORD", "密码至少 8 位");
    if (store.get("SELECT id FROM users WHERE username=?", username))
      fail("USERNAME_EXISTS", "用户名已存在", 409);
    const id = mall.id("user");
    store.run(
      "INSERT INTO users VALUES(?,?,?,?,?)",
      id,
      username,
      hashPassword(password),
      nickname,
      mall.now(),
    );
    res.status(201).json({ user: signIn(res, id) });
  });
  app.post("/api/v1/auth/logout", (_req, res) => {
    store.run("DELETE FROM sessions WHERE id=?", res.locals.session.id);
    res.clearCookie("jd_local_session", { path: "/" });
    res.json({ ok: true });
  });
  app.get("/api/v1/products", (req, res) =>
    res.json(mall.listProducts(req.query)),
  );
  app.get("/api/v1/catalog/meta", (req, res) =>
    res.json(mall.catalogMeta(req.query)),
  );
  app.get("/api/v1/products/:id", (req, res) =>
    res.json(mall.product(String(req.params.id))),
  );
  app.get("/api/v1/shops/:id", (req, res) => {
    const shop = store.get(
      "SELECT * FROM shops WHERE id=?",
      String(req.params.id),
    );
    if (!shop) fail("NOT_FOUND", "店铺不存在", 404);
    res.json(shop);
  });
  app.get("/api/v1/cart", (_req, res) => res.json(mall.cart(res.locals.owner)));
  app.post("/api/v1/cart", (req, res) =>
    res.json(
      mall.updateCart(
        res.locals.owner,
        required(req.body.skuId, "规格编号"),
        req.body,
        true,
      ),
    ),
  );
  app.patch("/api/v1/cart/:id", (req, res) =>
    res.json(
      mall.updateCart(res.locals.owner, String(req.params.id), req.body),
    ),
  );
  app.delete("/api/v1/cart/:id", (req, res) => {
    store.run(
      "DELETE FROM cart WHERE owner=? AND sku_id=?",
      res.locals.owner,
      String(req.params.id),
    );
    res.json(mall.cart(res.locals.owner));
  });
  app.post("/api/v1/cart/selection", (req, res) => {
    store.run(
      "UPDATE cart SET selected=? WHERE owner=?",
      req.body.selected ? 1 : 0,
      res.locals.owner,
    );
    res.json(mall.cart(res.locals.owner));
  });
  app.get("/api/v1/addresses", (_req, res) =>
    res.json(mall.addresses(user(res))),
  );
  app.post("/api/v1/addresses", (req, res) =>
    res.status(201).json(mall.saveAddress(user(res), req.body)),
  );
  app.put("/api/v1/addresses/:id", (req, res) =>
    res.json(mall.saveAddress(user(res), req.body, String(req.params.id))),
  );
  app.delete("/api/v1/addresses/:id", (req, res) =>
    res.json(mall.deleteAddress(user(res), String(req.params.id))),
  );
  app.get("/api/v1/coupons", (_req, res) => res.json(mall.coupons(user(res))));
  app.post("/api/v1/coupons/:id/claim", (req, res) =>
    res.json(mall.claimCoupon(user(res), String(req.params.id))),
  );
  app.get("/api/v1/favorites", (_req, res) => {
    const id = user(res);
    res.json(
      store
        .all(
          "SELECT product_id FROM favorites WHERE user_id=? ORDER BY created_at DESC",
          id,
        )
        .map((p) => mall.product(p.product_id)),
    );
  });
  app.post("/api/v1/favorites/:id", (req, res) => {
    const id = user(res);
    mall.product(String(req.params.id));
    store.run(
      "INSERT OR IGNORE INTO favorites VALUES(?,?,?)",
      id,
      String(req.params.id),
      mall.now(),
    );
    res.json({ ok: true });
  });
  app.delete("/api/v1/favorites/:id", (req, res) => {
    store.run(
      "DELETE FROM favorites WHERE user_id=? AND product_id=?",
      user(res),
      String(req.params.id),
    );
    res.json({ ok: true });
  });
  app.post("/api/v1/checkout/quote", (req, res) =>
    res.json(mall.quote(user(res), req.body)),
  );
  app.post("/api/v1/orders", (req, res) =>
    res.status(201).json(mall.createOrder(user(res), req.body, key(req))),
  );
  app.get("/api/v1/orders", (req, res) =>
    res.json(mall.orders(user(res), req.query)),
  );
  app.get("/api/v1/orders/:id", (req, res) =>
    res.json(mall.order(user(res), String(req.params.id))),
  );
  app.post("/api/v1/orders/:id/cancel", (req, res) =>
    res.json(mall.cancel(user(res), String(req.params.id), key(req))),
  );
  app.post("/api/v1/orders/:id/receive", (req, res) =>
    res.json(mall.receive(user(res), String(req.params.id), key(req))),
  );
  app.post("/api/v1/orders/:id/rebuy", (req, res) => {
    const id = user(res);
    const o = mall.order(id, String(req.params.id));
    res.json(
      store.tx(() => {
        for (const i of o.items)
          mall.updateCart(id, i.sku_id, { quantity: i.quantity }, true);
        return mall.cart(id);
      }),
    );
  });
  app.get("/api/v1/payments/:id", (req, res) =>
    res.json(mall.paymentGroup(user(res), String(req.params.id))),
  );
  app.post("/api/v1/payments/:id", (req, res) =>
    res.json(
      mall.pay(
        user(res),
        String(req.params.id),
        req.body.success !== false,
        key(req),
      ),
    ),
  );
  app.post("/api/v1/reviews", (req, res) =>
    res
      .status(201)
      .json(
        mall.review(
          user(res),
          required(req.body.itemId, "订单商品"),
          req.body.rating,
          req.body.content,
        ),
      ),
  );
  app.get("/api/v1/returns", (_req, res) => {
    const id = user(res);
    res.json(
      store
        .all(
          "SELECT id FROM returns WHERE user_id=? ORDER BY created_at DESC",
          id,
        )
        .map((r) => mall.returnDetail(id, r.id)),
    );
  });
  app.post("/api/v1/returns", (req, res) =>
    res.status(201).json(mall.requestReturn(user(res), req.body, key(req))),
  );
  app.get("/api/v1/returns/:id", (req, res) =>
    res.json(mall.returnDetail(user(res), String(req.params.id))),
  );
  app.post("/api/v1/returns/:id/:action", (req, res) =>
    res.json(
      mall.returnAction(
        user(res),
        String(req.params.id),
        String(req.params.action),
        req.body.tracking,
      ),
    ),
  );
  app.get("/api/v1/demo", (_req, res) => res.json(mall.demo(user(res))));
  app.post("/api/v1/demo/auto", (req, res) => {
    if (user(res) !== "demo")
      fail("FORBIDDEN", "请使用主体验账号调整全局演示时钟", 403);
    store.run(
      "UPDATE metadata SET value=? WHERE key='auto_advance'",
      req.body.enabled ? "true" : "false",
    );
    res.json(mall.demo(user(res)));
  });
  app.post("/api/v1/demo/advance", (req, res) =>
    res.json(
      mall.advance(
        user(res),
        required(req.body.entityId, "记录编号"),
        req.body.kind,
      ),
    ),
  );
  app.get("/api/v1/demo/check", (_req, res) => {
    if (user(res) !== "demo")
      fail("FORBIDDEN", "仅主体验账号可执行数据检查", 403);
    res.json(validate(store));
  });
  app.use("/api", (req, _res, next) =>
    next(new BusinessError("NOT_FOUND", "接口不存在", 404)),
  );
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof BusinessError) {
        res
          .status(error.status)
          .json({ error: { code: error.code, message: error.message } });
        return;
      }
      const e = error as Row;
      if (e.type === "entity.parse.failed") {
        res
          .status(400)
          .json({ error: { code: "INVALID_JSON", message: "请求格式不正确" } });
        return;
      }
      if (e.status === 413 || e.status === 415) {
        res.status(e.status).json({
          error: {
            code: "INVALID_BODY",
            message: "请求内容过大或编码不受支持",
          },
        });
        return;
      }
      console.error(error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "服务暂时无法处理，请稍后重试",
        },
      });
    },
  );
  return { app, mall };
}
