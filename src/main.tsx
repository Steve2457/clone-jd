import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import {
  ShoppingCart,
  Search,
  MapPin,
  ChevronDown,
  ChevronRight,
  Heart,
  UserRound,
  Truck,
  ShieldCheck,
  Headphones,
  ArrowUp,
  CheckCircle2,
  X,
  Package,
  Gift,
  Star,
  Settings2,
  LogOut,
  Home as HomeIcon,
} from "lucide-react";
import { api, ApiError, money } from "./api";
import type { Bootstrap, Product, Data } from "./types";
import {
  Home,
  SearchPage,
  ProductPage,
  CartPage,
  CheckoutPage,
  PaymentPage,
  LoginPage,
  Account,
  OrdersPage,
  OrderDetail,
  AddressesPage,
  CouponsPage,
  FavoritesPage,
  ReturnsPage,
  DemoPage,
  HelpPage,
  ShopPage,
} from "./pages";
import "./styles.css";
type AppContextValue = {
  boot: Bootstrap | null;
  refresh: () => Promise<void>;
  notify: (s: string, kind?: string) => void;
  run: <T>(fn: () => Promise<T>, success?: string) => Promise<T | undefined>;
  region: string;
  setRegion: (s: string) => void;
};
const Context = createContext<AppContextValue>(null!);
export const useApp = () => useContext(Context);
export function useData<T = any>(path: string | null, interval = 0) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    const id = ++generation.current;
    try {
      const result = await api<T>(path);
      if (id === generation.current) {
        setData(result);
        setError("");
      }
    } catch (e) {
      if (id === generation.current) setError((e as Error).message);
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setData(null);
    setLoading(true);
    void reload();
    const timer = interval ? setInterval(() => void reload(), interval) : null;
    return () => {
      generation.current++;
      if (timer) clearInterval(timer);
    };
  }, [reload, interval]);
  return { data, error, loading, reload, setData };
}
export function Loading() {
  return (
    <div className="loading">
      <span className="spinner" />
      正在加载好物…
    </div>
  );
}
export function Empty({
  title = "这里还没有内容",
  text = "去发现更多值得入手的好物吧",
  action = "/search",
  label = "去逛逛",
}: {
  title?: string;
  text?: string;
  action?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <Package size={58} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{text}</p>
      <Link className="btn primary" to={action}>
        {label}
      </Link>
    </div>
  );
}
export function ErrorBox({ error }: { error: string }) {
  return error ? (
    <div className="error-box" role="alert">
      {error}
    </div>
  ) : null;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button aria-label="关闭" onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Price({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const [a, b] = money(value).split(".");
  return (
    <span className={"price " + className}>
      <small>¥</small>
      {a}
      <small>.{b}</small>
    </span>
  );
}
export function ProductCard({ p }: { p: Product }) {
  const { run, refresh, notify } = useApp();
  return (
    <article className="product-card">
      <Link to={"/product/" + p.id}>
        <div className="product-img">
          <img src={p.image} alt={p.title} loading="lazy" />
        </div>
        <h3>
          {p.self_operated ? (
            <span className="tag red">自营</span>
          ) : (
            <span className="tag pale">精选</span>
          )}
          {p.title}
        </h3>
      </Link>
      <div className="product-selling">
        {p.stock > 0 ? "品质好物 · 放心选购" : "暂时缺货 · 敬请期待"}
      </div>
      <div className="price-row">
        <Price value={p.price} />
        <button
          aria-label={"加入购物车 " + p.title}
          className="quick-add"
          disabled={!p.stock}
          onClick={() =>
            void run(async () => {
              await api("/cart", "POST", {
                skuId: p.default_sku_id,
                quantity: 1,
              });
              await refresh();
              notify("已加入购物车");
            })
          }
        >
          +
        </button>
      </div>
      <div className="product-tags">
        <span>{p.returnable ? "7天无理由" : "售后详见商品"}</span>
        <span>{p.price >= 5900 ? "满59包邮" : "优惠好物"}</span>
      </div>
      <div className="product-stats">
        已售 {p.sales} 件{" "}
        <span>
          {p.review_count
            ? p.rating + "分 · " + p.review_count + "条评价"
            : "新品上架"}
        </span>
      </div>
      <Link to={"/shop/" + p.shop_id} className="product-shop">
        {p.shop_name}
        <Headphones size={12} />
      </Link>
    </article>
  );
}
export function ProductGrid({
  items,
  className = "",
}: {
  items: Product[];
  className?: string;
}) {
  return (
    <div className={"product-grid " + className}>
      {items.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}
function Header() {
  const { boot, region, setRegion, refresh, run } = useApp();
  const [q, setQ] = useState(""),
    [regionOpen, setRegionOpen] = useState(false);
  const nav = useNavigate();
  const [params] = useSearchParams();
  const loc = useLocation();
  useEffect(() => setQ(params.get("q") || ""), [loc.search]);
  return (
    <>
      <div className="local-ribbon">
        <span>京东全球版 · 本地演示商城</span>
        <span>
          所有支付与配送均为模拟{" "}
          <Link to="/demo">
            演示控制台 <ChevronRight size={11} />
          </Link>
        </span>
      </div>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="top-left">
            <Link to="/">
              <HomeIcon size={12} />
              京东首页
            </Link>
            <button onClick={() => setRegionOpen(!regionOpen)}>
              <MapPin size={12} />
              {region}
              <ChevronDown size={11} />
            </button>
            {regionOpen && (
              <div className="region-pop">
                <strong>选择配送地区</strong>
                <p>结算时以收货地址为准</p>
                <div>
                  {[
                    "北京",
                    "上海",
                    "广州",
                    "深圳",
                    "杭州",
                    "成都",
                    "武汉",
                    "西安",
                    "重庆",
                    "天津",
                    "南京",
                    "其他地区",
                  ].map((r) => (
                    <button
                      key={r}
                      className={region === r ? "active" : ""}
                      onClick={() => {
                        setRegion(r);
                        setRegionOpen(false);
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {boot?.user ? (
              <>
                <Link to="/account" className="user-name">
                  {boot.user.nickname}
                </Link>
                <button
                  title="退出登录"
                  onClick={() =>
                    void run(async () => {
                      await api("/auth/logout", "POST");
                      await refresh();
                      nav("/");
                    })
                  }
                >
                  <LogOut size={12} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="red-text">
                  你好，请登录
                </Link>
                <Link to="/login?register=1">免费注册</Link>
              </>
            )}
          </div>
          <div className="top-right">
            <Link to="/cart">
              <ShoppingCart size={12} />
              购物车 {boot?.cartCount || 0}
            </Link>
            <Link to="/account/orders">我的订单</Link>
            <Link to="/account">
              我的京东
              <ChevronDown size={11} />
            </Link>
            <Link to="/account/coupons">领券中心</Link>
            <Link to="/help">
              客户服务
              <ChevronDown size={11} />
            </Link>
            <Link to="/demo">演示控制</Link>
          </div>
        </div>
      </div>
      <header className="header wrap">
        <Link className="logo" to="/" aria-label="京东全球版首页">
          <div className="joy-mark">
            <span />
            <i />
          </div>
          <strong>京东</strong>
          <small>全球</small>
        </Link>
        <div className="header-search">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              nav("/search?q=" + encodeURIComponent(q));
            }}
          >
            <input
              aria-label="搜索商品"
              placeholder="搜索你喜欢的商品"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit">
              <Search size={18} />
              搜索
            </button>
          </form>
          <div className="hotwords">
            {["平板电脑", "咖啡机", "手机", "男士卫衣", "跑步鞋", "图书"].map(
              (w, i) => (
                <Link
                  key={w}
                  className={i === 0 ? "red-text" : ""}
                  to={"/search?q=" + encodeURIComponent(w)}
                >
                  {w}
                </Link>
              ),
            )}
          </div>
        </div>
        <Link className="header-cart" to="/cart">
          <ShoppingCart size={22} />
          我的购物车<span>{boot?.cartCount || 0}</span>
        </Link>
      </header>
    </>
  );
}
function Footer() {
  return (
    <footer>
      <div className="service-strip wrap">
        {[
          ["多", "品类齐全，轻松购物"],
          ["快", "本地模拟，极速体验"],
          ["好", "精选好物，品质生活"],
          ["省", "优惠好价，畅选无忧"],
        ].map(([a, b]) => (
          <div key={a}>
            <strong>{a}</strong>
            <b>{b}</b>
          </div>
        ))}
      </div>
      <div className="footer-links wrap">
        {[
          ["购物指南", "购物流程", "账户与登录", "常见问题"],
          ["配送方式", "配送服务", "运费说明", "物流查询"],
          ["支付方式", "模拟支付", "支付失败", "退款说明"],
          ["售后服务", "售后政策", "退货流程", "联系我们"],
        ].map((col) => (
          <div key={col[0]}>
            <b>{col[0]}</b>
            {col.slice(1).map((t) => (
              <Link key={t} to={"/help?topic=" + encodeURIComponent(t)}>
                {t}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        关于本地商城 <span>|</span> 自洽数据 <span>|</span> 持久化订单{" "}
        <span>|</span> 本地演示环境
        <br />
        <p>
          京东全球版界面与公开商品素材的本地复刻 · 非京东官方网站 ·
          不产生真实交易
        </p>
      </div>
    </footer>
  );
}
function SideRail() {
  const { notify } = useApp();
  return (
    <aside className="side-rail">
      <Link to="/cart" title="购物车">
        <ShoppingCart />
        <small>购物车</small>
      </Link>
      <Link to="/account" title="我的京东">
        <UserRound />
        <small>我的</small>
      </Link>
      <Link to="/account/favorites" title="我的收藏">
        <Heart />
        <small>收藏</small>
      </Link>
      <Link to="/help" title="客服">
        <Headphones />
        <small>客服</small>
      </Link>
      <button
        title="回到顶部"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <ArrowUp />
        <small>顶部</small>
      </button>
    </aside>
  );
}
function ScrollToTop() {
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  return null;
}
function App() {
  const [boot, setBoot] = useState<Bootstrap | null>(null),
    [startupError, setStartupError] = useState(""),
    [toast, setToast] = useState<{ text: string; kind: string } | null>(null),
    [region, setRegionState] = useState(
      localStorage.getItem("jd-region") || "北京",
    );
  const nav = useNavigate();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const refresh = useCallback(async () => {
    try {
      setBoot(await api<Bootstrap>("/bootstrap"));
      setStartupError("");
    } catch (e) {
      setStartupError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const notify = (text: string, kind = "success") => {
    setToast({ text, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };
  const run = async <T,>(
    fn: () => Promise<T>,
    success?: string,
  ): Promise<T | undefined> => {
    try {
      const r = await fn();
      if (success) notify(success);
      return r;
    } catch (e) {
      notify((e as Error).message, "error");
      if (e instanceof ApiError && e.status === 401)
        nav(
          "/login?next=" +
            encodeURIComponent(location.pathname + location.search),
        );
      return undefined;
    }
  };
  return (
    <Context.Provider
      value={{
        boot,
        refresh,
        notify,
        run,
        region,
        setRegion: (s) => {
          setRegionState(s);
          localStorage.setItem("jd-region", s);
        },
      }}
    >
      <ScrollToTop />
      <Header />
      {startupError ? (
        <main className="wrap">
          <ErrorBox error={startupError} />
          <button className="btn" onClick={() => void refresh()}>
            重新连接
          </button>
        </main>
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/shop/:id" element={<ShopPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment/:id" element={<PaymentPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<Account />}>
            <Route index element={<OrdersPage dashboard />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="addresses" element={<AddressesPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="returns" element={<ReturnsPage />} />
          </Route>
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route
            path="*"
            element={
              <Empty
                title="页面不存在"
                text="这个地址暂不可用，回首页继续逛逛吧"
                action="/"
                label="返回首页"
              />
            }
          />
        </Routes>
      )}
      <Footer />
      <SideRail />
      {toast && (
        <div className={"toast " + toast.kind} role="status">
          {toast.kind === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <X size={18} />
          )}{" "}
          {toast.text}
        </div>
      )}
    </Context.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
