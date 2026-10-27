import React, { useEffect, useState, useRef, type FormEvent } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  Heart,
  Truck,
  ShieldCheck,
  Headphones,
  ShoppingCart,
  UserRound,
  Package,
  CreditCard,
  MessageSquare,
  Star,
  CheckCircle2,
  MapPin,
  Plus,
  Trash2,
  Settings2,
  Search,
  Gift,
  ArrowRight,
  RefreshCw,
  Check,
  Clock,
} from "lucide-react";
import {
  useApp,
  useData,
  Loading,
  Empty,
  ErrorBox,
  Modal,
  Price,
  ProductGrid,
} from "./main";
import { api, operationId, money, date, labels } from "./api";
import type { Data, Product } from "./types";
function groupBy(items: Data[], key: string): Record<string, Data[]> {
  return items.reduce((g: Record<string, Data[]>, i) => {
    (g[i[key]] ??= []).push(i);
    return g;
  }, {});
}

export function Home() {
  const { boot } = useApp();
  const [slide, setSlide] = useState(3),
    [tab, setTab] = useState("recommend");
  const query =
    tab === "recommend"
      ? "featured=1"
      : tab === "value"
        ? "collection=value"
        : "category=" + tab;
  const { data, loading, error } = useData("/products?" + query + "&limit=40");
  useEffect(() => {
    const t = setInterval(() => setSlide((v) => (v + 1) % 4), 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <main className="home-page wrap">
      <section className="home-hero">
        <nav className="category-menu" aria-label="商品分类">
          {boot?.categories.map((c) => (
            <Link key={c.id} to={"/search?category=" + c.id}>
              <span>{c.name}</span>
              <ChevronRight size={12} />
            </Link>
          ))}
        </nav>
        <div className="hero-center">
          <div className="hero-slider">
            <Link
              to={
                "/search?collection=" + ["new", "value", "new", "value"][slide]
              }
            >
              {boot?.promos[slide] && (
                <img src={boot.promos[slide].image} alt="京东全球版精选活动" />
              )}
            </Link>
            <button
              className="slide-arrow prev"
              aria-label="上一张活动"
              onClick={() => setSlide((slide + 3) % 4)}
            >
              <ChevronLeft />
            </button>
            <button
              className="slide-arrow next"
              aria-label="下一张活动"
              onClick={() => setSlide((slide + 1) % 4)}
            >
              <ChevronRight />
            </button>
            <div className="slide-dots">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  aria-label={"活动第" + (i + 1) + "张"}
                  className={slide === i ? "active" : ""}
                  onClick={() => setSlide(i)}
                />
              ))}
            </div>
          </div>
          <div className="hero-small">
            {[4, 5].map((i, k) => (
              <Link key={i} to={"/search?category=" + (k ? "home" : "books")}>
                {boot?.promos[i] && (
                  <img
                    src={boot.promos[i].image}
                    alt={k ? "家居馆" : "图书馆"}
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
        <aside className="welcome-card">
          <div className="welcome-user">
            <div className="avatar">
              <UserRound size={30} />
            </div>
            <div>
              <b>HI～{boot?.user ? boot.user.nickname : "欢迎来到京东"}</b>
              <p>
                {boot?.user ? (
                  <Link to="/account">
                    我的京东 <ChevronRight size={10} />
                  </Link>
                ) : (
                  <>
                    <Link to="/login">登录</Link>
                    <span> | </span>
                    <Link to="/login?register=1">注册</Link>
                  </>
                )}
              </p>
            </div>
          </div>
          <Link className="welcome-coupon" to="/account/coupons">
            新人有礼 · 领券享好价 <ChevronRight size={13} />
          </Link>
          <div className="news">
            <h3>
              全球特讯 <Link to="/help">更多 ›</Link>
            </h3>
            <Link to="/help?topic=购物流程">购物新体验，全球好物轻松选</Link>
            <Link to="/help?topic=运费说明">国内配送满59元免基础运费</Link>
            <Link to="/help?topic=售后政策">安心购物，售后服务全流程</Link>
          </div>
          <div className="welcome-services">
            <Link to="/account/orders">
              <Truck />
              <span>物流服务</span>
            </Link>
            <Link to="/help">
              <Headphones />
              <span>客户服务</span>
            </Link>
            <Link to="/account/returns">
              <Heart />
              <span>售后政策</span>
            </Link>
          </div>
          <h3 className="payment-title">国际支付</h3>
          <p className="payment-sub">本地模拟支付中心</p>
          <div className="payment-brands">
            <b>VISA</b>
            <b className="mastercard">●●</b>
            <b className="unionpay">银联</b>
            <span>微信支付</span>
            <span>京东支付</span>
            <b>JCB</b>
          </div>
        </aside>
      </section>
      <h2 className="section-title">
        <i />
        频道广场
        <i />
      </h2>
      <section className="channel-grid">
        {[6, 7, 8, 9, 10, 11].map((i, k) => (
          <Link
            key={i}
            to={
              [
                "/search?collection=new",
                "/search?sort=sales",
                "/search?collection=value",
                "/search?category=fashion",
                "/search?category=office",
                "/search?category=home",
              ][k]
            }
            className={k < 2 ? "tall" : ""}
          >
            {boot?.promos[i] && (
              <img
                src={boot.promos[i].image}
                alt={
                  [
                    "新品首发",
                    "超级排行榜",
                    "京喜自营",
                    "京东服饰",
                    "电脑数码",
                    "京东京造",
                  ][k]
                }
              />
            )}
          </Link>
        ))}
      </section>
      <h2 className="section-title">
        <i />
        为你推荐
        <i />
      </h2>
      <div className="recommend-tabs">
        {[
          ["recommend", "精选好物", "为你推荐"],
          ["value", "特价精选", "好价不容错过"],
          ["digital", "手机数码", "科技焕新生活"],
          ["home", "居家优品", "让家更舒适"],
          ["sport", "运动户外", "一起活力出发"],
          ["books", "图书文娱", "遇见阅读之美"],
        ].map(([id, a, b]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            <b>{a}</b>
            <small>{b}</small>
          </button>
        ))}
      </div>
      <ErrorBox error={error} />
      {loading ? <Loading /> : <ProductGrid items={data?.items || []} />}
      <Link className="browse-more" to="/search">
        发现更多好物 <ArrowRight size={16} />
      </Link>
    </main>
  );
}
export function SearchPage({ shopId }: { shopId?: string } = {}) {
  const { boot } = useApp();
  const [params, setParams] = useSearchParams();
  const [low, setLow] = useState(params.get("min") || ""),
    [high, setHigh] = useState(params.get("max") || ""),
    [more, setMore] = useState(false);
  const actual = new URLSearchParams(params);
  if (shopId) actual.set("shop", shopId);
  const { data, loading, error } = useData("/products?" + actual.toString());
  const { data: meta } = useData("/catalog/meta?" + actual.toString());
  const category = boot?.categories.find(
    (c) => c.id === params.get("category"),
  );
  useEffect(() => {
    setLow(params.get("min") || "");
    setHigh(params.get("max") || "");
  }, [params.get("min"), params.get("max")]);
  const change = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    value ? p.set(key, value) : p.delete(key);
    if (key !== "page") p.delete("page");
    setParams(p);
  };
  const filter = (e: FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams(params);
    low ? p.set("min", low) : p.delete("min");
    high ? p.set("max", high) : p.delete("max");
    p.delete("page");
    setParams(p);
  };
  return (
    <main className="search-page wide-wrap">
      <div className="breadcrumb">
        <Link to="/">全部结果</Link>
        <ChevronRight size={12} />
        <b>{params.get("q") || category?.name || "全部商品"}</b>
        <span>共 {data?.total || 0} 件商品</span>
      </div>
      <section className="filter-panel">
        <div className="search-tabs">
          <b>全部商品</b>
          <button onClick={() => change("sort", "new")}>新品</button>
          <Link to="/search?collection=value">特价好物</Link>
          <span>
            配送至 <b>中国内地</b>
          </span>
        </div>
        <div className="filter-row">
          <label>分类</label>
          <div className="filter-values">
            <button
              className={!category ? "active" : ""}
              onClick={() => change("category", "")}
            >
              全部
            </button>
            {boot?.categories.map((c) => (
              <button
                className={category?.id === c.id ? "active" : ""}
                key={c.id}
                onClick={() => change("category", c.id)}
              >
                {c.id === "digital" ? "手机数码" : c.name.split(" / ")[0]}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-row">
          <label>品牌</label>
          <div className="filter-values">
            <button
              className={!params.get("brand") ? "active" : ""}
              onClick={() => change("brand", "")}
            >
              全部
            </button>
            {(meta?.brands || []).slice(0, more ? 200 : 12).map((b: string) => (
              <button
                key={b}
                className={params.get("brand") === b ? "active" : ""}
                onClick={() => change("brand", b)}
              >
                {b}
              </button>
            ))}
          </div>
          <button className="muted" onClick={() => setMore(!more)}>
            {more ? "收起" : "更多"}⌄
          </button>
        </div>
        <div className="filter-row selected-filters">
          <label>已选条件</label>
          <div className="filter-values">
            {["brand", "category", "self", "stock", "min", "max", "collection"]
              .filter((k) => params.has(k))
              .map((k) => (
                <button
                  key={k}
                  className="filter-chip"
                  onClick={() => change(k, "")}
                >
                  {
                    {
                      brand: "品牌",
                      category: "分类",
                      self: "京东自营",
                      stock: "仅有货",
                      min: "最低价",
                      max: "最高价",
                      collection: "精选",
                    }[k as "brand"]
                  }{" "}
                  {["self", "stock", "category"].includes(k)
                    ? ""
                    : params.get(k)}{" "}
                  ×
                </button>
              ))}
            <button
              onClick={() => {
                const p = new URLSearchParams();
                if (params.get("q")) p.set("q", params.get("q")!);
                setLow("");
                setHigh("");
                setParams(p);
              }}
            >
              清除筛选
            </button>
          </div>
        </div>
      </section>
      <div className="sort-bar">
        <div className="sort-buttons">
          {[
            ["", "综合"],
            ["sales", "销量"],
            ["price_asc", "价格 ↑"],
            ["price_desc", "价格 ↓"],
            ["rating", "评价"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={(params.get("sort") || "") === v ? "active" : ""}
              onClick={() => change("sort", v)}
            >
              {l}
            </button>
          ))}
        </div>
        <form className="price-filter" onSubmit={filter}>
          <input
            aria-label="最低价"
            type="number"
            min="0"
            placeholder="¥ 最低价"
            value={low}
            onChange={(e) => setLow(e.target.value)}
          />
          <span>—</span>
          <input
            aria-label="最高价"
            type="number"
            min="0"
            placeholder="¥ 最高价"
            value={high}
            onChange={(e) => setHigh(e.target.value)}
          />
          <button>确定</button>
        </form>
        <label>
          <input
            type="checkbox"
            checked={params.get("self") === "1"}
            onChange={(e) => change("self", e.target.checked ? "1" : "")}
          />
          京东自营
        </label>
        <label>
          <input
            type="checkbox"
            checked={params.get("stock") === "1"}
            onChange={(e) => change("stock", e.target.checked ? "1" : "")}
          />
          仅显示有货
        </label>
        <span className="sort-count">
          <b>{data?.page || 1}</b> / {data?.pages || 1}
        </span>
      </div>
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : data?.items?.length ? (
        <ProductGrid className="search-grid" items={data.items} />
      ) : (
        <Empty
          title="暂时没有找到相关商品"
          text="试试其他关键词，或减少一些筛选条件"
        />
      )}
      <div className="pagination">
        <button
          disabled={(data?.page || 1) <= 1}
          onClick={() => change("page", String((data?.page || 1) - 1))}
        >
          ‹ 上一页
        </button>
        {Array.from({ length: data?.pages || 0 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={n === data.page ? "active" : ""}
            onClick={() => {
              change("page", String(n));
              window.scrollTo({ top: 150 });
            }}
          >
            {n}
          </button>
        ))}
        <button
          disabled={!data?.pages || data.page >= data.pages}
          onClick={() => {
            change("page", String(data.page + 1));
            window.scrollTo({ top: 150 });
          }}
        >
          下一页 ›
        </button>
      </div>
    </main>
  );
}
export function ShopPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [term, setTerm] = useState(params.get("q") || "");
  const { data } = useData("/shops/" + id);
  return (
    <>
      <section className="shop-banner wide-wrap">
        <div className="shop-avatar">
          <ShoppingCart size={30} />
        </div>
        <div>
          <span className="tag red">
            {data?.self_operated ? "自营" : "品牌店铺"}
          </span>
          <h2>{data?.name || "精选店铺"}</h2>
          <p>精选好物 · 用心服务 · 安心选购</p>
        </div>
        <form
          className="shop-search"
          onSubmit={(e) => {
            e.preventDefault();
            const p = new URLSearchParams(params);
            term ? p.set("q", term) : p.delete("q");
            p.delete("page");
            setParams(p);
          }}
        >
          <input
            aria-label="店内搜索"
            placeholder="在本店搜索商品"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <button className="btn primary small">搜本店</button>
        </form>
        <Link to="/account/coupons" className="btn">
          进店领券
        </Link>
      </section>
      <SearchPage shopId={id} />
    </>
  );
}

export function ProductPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: p, loading, error } = useData<Data>("/products/" + id);
  const { boot, run, refresh, notify } = useApp();
  const nav = useNavigate();
  const [qty, setQty] = useState(1),
    [section, setSection] = useState("details"),
    [zoom, setZoom] = useState(false);
  const { data: favs, reload: reloadFav } = useData<Data[]>(
    boot?.user ? "/favorites" : null,
  );
  const selected =
    p?.skus.find((s: Data) => s.id === params.get("sku")) || p?.skus[0];
  const favorite = favs?.some((x) => x.id === id);
  useEffect(() => setQty(1), [selected?.id]);
  const { data: related } = useData(
    p ? "/products?category=" + p.category_id + "&limit=6" : null,
  );
  if (loading) return <Loading />;
  if (error || !p)
    return (
      <main className="wrap">
        <ErrorBox error={error} />
      </main>
    );
  const add = () =>
    void run(async () => {
      await api("/cart", "POST", { skuId: selected.id, quantity: qty });
      await refresh();
      notify("已成功加入购物车");
    });
  return (
    <main className="detail-page wide-wrap">
      <div className="breadcrumb">
        <Link to="/">首页</Link>
        <ChevronRight size={12} />
        <Link to={"/search?category=" + p.category_id}>{p.category_name}</Link>
        <ChevronRight size={12} />
        <span>{p.brand}</span>
      </div>
      <div className="shop-bar">
        <Link to={"/shop/" + p.shop_id}>
          <span className="tag red">{p.self_operated ? "自营" : "精选"}</span>
          <strong>{p.shop_name}</strong>
          <small>精选镇店好物，快来逛逛</small>
        </Link>
        <div>
          <Link className="btn light" to={"/shop/" + p.shop_id}>
            进店逛逛
          </Link>
          <Link className="btn light" to="/help">
            <Headphones size={14} />
            联系客服
          </Link>
        </div>
      </div>
      <section className="product-main">
        <div className="gallery">
          <div
            className="gallery-main"
            onClick={() => setZoom(true)}
            role="button"
            tabIndex={0}
            aria-label="查看商品大图"
            onKeyDown={(e) => {
              if (e.key === "Enter") setZoom(true);
            }}
          >
            <img src={selected.image || p.image} alt={p.title} />
            {selected.pack_count > 1 && (
              <span className="pack-badge">
                同款 {selected.pack_count} 件组合
              </span>
            )}
            <small>点击查看大图</small>
          </div>
          <div className="gallery-thumbs">
            <button className="active" onClick={() => setZoom(true)}>
              <img src={selected.image || p.image} alt="商品主图" />
            </button>
            <div>
              <ShieldCheck size={18} />
              品质好物 · 细节用心
            </div>
          </div>
        </div>
        <div className="purchase-panel">
          <div className="purchase-label">
            <b>京东精选</b>
            <span>好物好价 · 品质生活</span>
          </div>
          <h1>
            <span className="tag red">{p.self_operated ? "自营" : "精选"}</span>
            {p.title}{" "}
            {selected.pack_count > 1 ? "【" + selected.label + "】" : ""}
          </h1>
          <div className="detail-price">
            <div>
              <small>京东价</small>
              <Price value={selected.price} />
              <span className="price-hint">本地冻结价格</span>
            </div>
            <Link to="#reviews" onClick={() => setSection("reviews")}>
              累计评价 <strong>{p.review_count}</strong>
            </Link>
          </div>
          <div className="benefit-line">
            <span>优惠</span>
            <Link to="/account/coupons">满199减20</Link>
            <Link to="/account/coupons">满399减40</Link>
            <Link to="/account/coupons">领券 ›</Link>
          </div>
          <div className="purchase-row">
            <label>配送</label>
            <div>
              <p>
                <MapPin size={14} /> 中国内地{" "}
                <b className={selected.stock ? "green" : "red-text"}>
                  {selected.stock
                    ? "有货，剩余 " + selected.stock + " 件"
                    : "暂时无货"}
                </b>
              </p>
              <p className="muted">
                {selected.free_shipping
                  ? "此规格免运费"
                  : "满59元免基础运费，其他运费以结算为准"}
              </p>
            </div>
          </div>
          <div className="purchase-row">
            <label>服务</label>
            <div className="service-tags">
              <span>
                <Truck size={14} /> 模拟物流
              </span>
              <span>
                <ShieldCheck size={14} />{" "}
                {p.returnable ? "7天无理由退货" : "不支持无理由退货"}
              </span>
              <span>本地售后</span>
            </div>
          </div>
          <div className="purchase-row">
            <label>选择规格</label>
            <div className="sku-options">
              {p.skus.map((s: Data) => (
                <button
                  key={s.id}
                  className={selected.id === s.id ? "active" : ""}
                  onClick={() => {
                    setParams({ sku: s.id });
                  }}
                >
                  <img src={s.image || p.image} alt="" />
                  <span>
                    {s.label}
                    <small>{s.stock ? "¥" + money(s.price) : "无货"}</small>
                  </span>
                  {selected.id === s.id && <Check size={12} />}
                </button>
              ))}
            </div>
          </div>
          <div className="purchase-row">
            <label>数量</label>
            <Quantity
              value={qty}
              max={Math.max(1, Math.min(99, selected.stock))}
              onChange={setQty}
            />
          </div>
          <div className="purchase-buttons">
            <button
              className="btn primary"
              disabled={!selected.stock}
              onClick={add}
            >
              <ShoppingCart size={21} />
              加入购物车
            </button>
            <button
              className="btn coral"
              disabled={!selected.stock}
              onClick={() =>
                nav("/checkout?sku=" + selected.id + "&quantity=" + qty)
              }
            >
              立即购买
            </button>
            <button
              className={"favorite-button " + (favorite ? "active" : "")}
              onClick={() =>
                void run(async () => {
                  await api("/favorites/" + p.id, favorite ? "DELETE" : "POST");
                  await reloadFav();
                  notify(favorite ? "已取消收藏" : "已收藏商品");
                })
              }
            >
              <Heart size={20} fill={favorite ? "currentColor" : "none"} />
              <span>{favorite ? "已收藏" : "收藏"}</span>
            </button>
          </div>
          <p className="purchase-tip">
            温馨提示：组合规格为本地演示配置；支付、配送及售后均在本地模拟。
          </p>
        </div>
      </section>
      <section className="detail-bottom">
        <aside className="detail-shop">
          <h3>{p.shop_name}</h3>
          <p>品质 · 服务 · 信赖</p>
          <Link className="btn" to={"/shop/" + p.shop_id}>
            进入店铺
          </Link>
          <img src={selected.image || p.image} alt="店铺精选" />
        </aside>
        <div className="detail-content">
          <div className="detail-tabs">
            {[
              ["details", "商品介绍"],
              ["specs", "规格参数"],
              ["reviews", "商品评价 (" + p.review_count + ")"],
              ["service", "售后保障"],
            ].map(([v, t]) => (
              <button
                key={v}
                className={section === v ? "active" : ""}
                onClick={() => setSection(v)}
              >
                {t}
              </button>
            ))}
          </div>
          {section === "details" && (
            <div className="product-description">
              <h2>{p.brand} · 精选好物</h2>
              <p>{p.title}</p>
              <img src={selected.image || p.image} alt={p.title} />
              <div className="quality-grid">
                <div>
                  <ShieldCheck />
                  <b>品质之选</b>
                  <p>商品实拍素材，一目了然</p>
                </div>
                <div>
                  <Package />
                  <b>用心包装</b>
                  <p>模拟仓储发货，订单可追踪</p>
                </div>
                <div>
                  <Heart />
                  <b>安心售后</b>
                  <p>支持范围内轻松申请</p>
                </div>
              </div>
            </div>
          )}
          {section === "specs" && (
            <div className="spec-table">
              {[
                ["商品编号", p.id],
                ["品牌", p.brand],
                ["商品名称", p.title],
                ["分类", p.category_name],
                ["销售店铺", p.shop_name],
                ["当前规格", selected.label],
                ["组合数量", selected.pack_count + " 件"],
                ["演示计费重量", selected.weight_g + " g"],
                [
                  "售后政策",
                  p.returnable ? "确认收货后7天内支持退货" : "不支持无理由退货",
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <label>{k}</label>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          )}
          {section === "reviews" && (
            <div id="reviews" className="reviews">
              <div className="review-score">
                <strong>{p.rating || "—"}</strong>
                <div>
                  <div className="stars">★★★★★</div>
                  <p>{p.review_count} 位本地买家的评价</p>
                </div>
              </div>
              {p.reviews.length ? (
                p.reviews.map((r: Data) => (
                  <div className="review-item" key={r.id}>
                    <div>
                      <span className="avatar small">
                        <UserRound size={18} />
                      </span>
                      {r.nickname}
                      <small>{date(r.created_at)}</small>
                    </div>
                    <span className="stars">{"★".repeat(r.rating)}</span>
                    <p>{r.content}</p>
                  </div>
                ))
              ) : (
                <p className="muted">
                  暂无评价，购买并确认收货后分享你的体验吧。
                </p>
              )}
            </div>
          )}
          {section === "service" && (
            <div className="service-copy">
              <h3>售后保障</h3>
              <p>
                {p.returnable
                  ? "本商品支持确认收货后7天内申请退货退款，请保持商品完好。"
                  : "本商品不支持无理由退货；未发货前仍可取消订单。"}
              </p>
              <h3>退款说明</h3>
              <p>
                退款以实际成交金额及优惠分摊为准。提交申请后，可在“我的京东 →
                退款售后”查看审核、寄回与退款进度。
              </p>
              <Link to="/help?topic=售后政策">查看完整售后规则 ›</Link>
            </div>
          )}
        </div>
      </section>
      <h2 className="section-title">
        <i />
        猜你喜欢
        <i />
      </h2>
      <ProductGrid
        items={related?.items?.filter((x: Product) => x.id !== p.id) || []}
      />
      {zoom && (
        <Modal title="商品大图" onClose={() => setZoom(false)}>
          <img
            className="zoom-image"
            src={selected.image || p.image}
            alt={p.title}
          />
        </Modal>
      )}
    </main>
  );
}
function Quantity({
  value,
  onChange,
  max = 99,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="quantity">
      <button
        aria-label="减少数量"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <input
        type="number"
        aria-label="商品数量"
        min="1"
        max={max}
        value={value}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value));
          if (n >= 1 && n <= max) onChange(n);
        }}
      />
      <button
        aria-label="增加数量"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

export function CartPage() {
  const { data: items, loading, error, reload } = useData<Data[]>("/cart");
  const { run, refresh, notify } = useApp();
  const nav = useNavigate();
  const [remove, setRemove] = useState<Data | null>(null);
  const selected = items?.filter((i) => i.selected) || [];
  const groups = groupBy(items || [], "shop_id");
  const update = (i: Data, body: Data) =>
    void run(async () => {
      await api("/cart/" + i.id, "PATCH", body);
      await reload();
      await refresh();
    });
  if (loading) return <Loading />;
  return (
    <main className="wrap cart-page">
      <div className="page-heading">
        <h1>
          我的购物车 <span>{items?.length || 0}</span>
        </h1>
        <Link to="/search">继续购物 ›</Link>
      </div>
      <ErrorBox error={error} />
      {items?.length ? (
        <>
          <div className="cart-table-head">
            <label>
              <input
                type="checkbox"
                aria-label="购物车全选"
                checked={items.every((i) => i.selected)}
                onChange={(e) =>
                  void run(async () => {
                    await api("/cart/selection", "POST", {
                      selected: e.target.checked,
                    });
                    await reload();
                  })
                }
              />
              全选
            </label>
            <span>商品</span>
            <span>单价</span>
            <span>数量</span>
            <span>小计</span>
            <span>操作</span>
          </div>
          {Object.entries(groups).map(([shopId, group]) => (
            <section key={shopId} className="cart-shop">
              <h3>
                <span className="tag red">
                  {group![0].self_operated ? "自营" : "店铺"}
                </span>
                <Link to={"/shop/" + shopId}>{group![0].shop_name}</Link>
                <span>购满59元免基础运费</span>
              </h3>
              {group!.map((i) => (
                <div
                  key={i.id}
                  className={"cart-row " + (i.selected ? "selected" : "")}
                >
                  <input
                    aria-label={"选中 " + i.title}
                    type="checkbox"
                    checked={i.selected}
                    onChange={(e) => update(i, { selected: e.target.checked })}
                  />
                  <Link
                    className="line-product"
                    to={"/product/" + i.product_id + "?sku=" + i.id}
                  >
                    <img src={i.image} alt={i.title} />
                    <div>
                      <p>{i.title}</p>
                      <small>{i.label}</small>
                      <div className="green">
                        {i.stock >= i.quantity
                          ? "有货"
                          : "库存不足，请调整数量"}
                      </div>
                    </div>
                  </Link>
                  <span>¥{money(i.price)}</span>
                  <Quantity
                    value={i.quantity}
                    max={Math.max(i.quantity, Math.min(99, i.stock))}
                    onChange={(n) => update(i, { quantity: n })}
                  />
                  <b>¥{money(i.subtotal)}</b>
                  <div className="row-actions">
                    <button onClick={() => setRemove(i)}>删除</button>
                    <button
                      onClick={() =>
                        void run(async () => {
                          await api("/favorites/" + i.product_id, "POST");
                          await api("/cart/" + i.id, "DELETE");
                          await reload();
                          await refresh();
                          notify("已移入收藏");
                        })
                      }
                    >
                      移入收藏
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))}
          <div className="cart-summary">
            <span>
              已选择 <b>{selected.reduce((n, i) => n + i.quantity, 0)}</b>{" "}
              件商品
            </span>
            <div>
              <span>商品合计（不含运费）：</span>
              <Price value={selected.reduce((n, i) => n + i.subtotal, 0)} />
              <button
                className="btn primary"
                disabled={!selected.length}
                onClick={() => nav("/checkout")}
              >
                去结算 <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <Empty title="购物车还是空的" />
      )}
      {remove && (
        <Modal title="删除商品" onClose={() => setRemove(null)}>
          <p>确定从购物车中删除“{remove.title}”吗？</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setRemove(null)}>
              再想想
            </button>
            <button
              className="btn primary"
              onClick={() =>
                void run(async () => {
                  await api("/cart/" + remove.id, "DELETE");
                  setRemove(null);
                  await reload();
                  await refresh();
                })
              }
            >
              确认删除
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function LoginRequired() {
  return (
    <Navigate
      to={
        "/login?next=" + encodeURIComponent(location.pathname + location.search)
      }
      replace
    />
  );
}
const provinces = [
  "北京市",
  "上海市",
  "天津市",
  "重庆市",
  "广东省",
  "浙江省",
  "江苏省",
  "山东省",
  "四川省",
  "湖北省",
  "湖南省",
  "河南省",
  "河北省",
  "福建省",
  "安徽省",
  "江西省",
  "陕西省",
  "山西省",
  "辽宁省",
  "吉林省",
  "黑龙江省",
  "云南省",
  "贵州省",
  "海南省",
  "甘肃省",
  "青海省",
  "内蒙古自治区",
  "广西壮族自治区",
  "宁夏回族自治区",
  "新疆维吾尔自治区",
  "西藏自治区",
];
function AddressEditor({
  initial,
  onClose,
  onSave,
}: {
  initial?: Data;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [form, setForm] = useState<Data>(
    initial || {
      name: "",
      phone: "",
      province: "北京市",
      city: "北京市",
      district: "",
      detail: "",
      is_default: false,
    },
  );
  const { run } = useApp();
  const [saving, setSaving] = useState(false);
  const update = (key: string, value: any) =>
    setForm({ ...form, [key]: value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    void run(async () => {
      await api(
        "/addresses" + (initial ? "/" + initial.id : ""),
        initial ? "PUT" : "POST",
        form,
      );
      await onSave();
      onClose();
    }, "收货地址已保存").finally(() => setSaving(false));
  };
  return (
    <Modal title={initial ? "编辑收货地址" : "新增收货地址"} onClose={onClose}>
      <form className="form address-form" onSubmit={submit}>
        <label>
          收货人
          <input
            required
            maxLength={30}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="请输入收货人姓名"
          />
        </label>
        <label>
          手机号码
          <input
            required
            inputMode="tel"
            pattern="1[0-9]{10}"
            maxLength={11}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="11位手机号码"
          />
        </label>
        <div className="form-grid">
          <label>
            省份
            <select
              value={form.province}
              onChange={(e) => update("province", e.target.value)}
            >
              {provinces.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            城市
            <input
              required
              maxLength={30}
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="如：杭州市"
            />
          </label>
          <label>
            区县
            <input
              required
              maxLength={30}
              value={form.district}
              onChange={(e) => update("district", e.target.value)}
              placeholder="如：西湖区"
            />
          </label>
        </div>
        <label>
          详细地址
          <textarea
            required
            maxLength={150}
            value={form.detail}
            onChange={(e) => update("detail", e.target.value)}
            placeholder="街道、门牌、楼栋等详细信息"
          />
        </label>
        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={Boolean(form.is_default)}
            onChange={(e) => update("is_default", e.target.checked)}
          />
          设为默认地址
        </label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" disabled={saving}>
            保存收货地址
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function CheckoutPage() {
  const { boot, run, refresh } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { data: addresses, reload: reloadAddresses } = useData<Data[]>(
    boot?.user ? "/addresses" : null,
  );
  const { data: coupons } = useData<Data[]>(boot?.user ? "/coupons" : null);
  const [addressId, setAddressId] = useState(""),
    [selection, setSelection] = useState<Record<string, string>>({}),
    [quote, setQuote] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [adding, setAdding] = useState(false),
    [submitting, setSubmitting] = useState(false);
  const key = useRef(operationId());
  useEffect(() => {
    if (addresses?.length && !addresses.some((a) => a.id === addressId))
      setAddressId(addresses[0].id);
  }, [addresses, addressId]);
  const sku = params.get("sku"),
    quantity = Math.floor(Number(params.get("quantity")) || 1);
  const input = {
    addressId,
    coupons: selection,
    ...(sku ? { items: [{ skuId: sku, quantity }] } : {}),
  };
  const encoded = JSON.stringify(input);
  useEffect(() => {
    if (!addressId) return;
    let active = true;
    setQuote(null);
    setError("");
    api("/checkout/quote", "POST", JSON.parse(encoded))
      .then((q) => {
        if (active) setQuote(q);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [addressId, encoded]);
  if (!boot) return <Loading />;
  if (!boot.user) return <LoginRequired />;
  const submit = () => {
    if (!quote) return;
    setSubmitting(true);
    void run(async () => {
      const r = await api(
        "/orders",
        "POST",
        { ...input, expectedTotal: quote.total },
        key.current,
      );
      await refresh();
      nav("/payment/" + r.groupId);
    }).finally(() => setSubmitting(false));
  };
  return (
    <main className="wrap checkout-page">
      <div className="page-heading">
        <h1>填写并核对订单信息</h1>
        <div className="checkout-progress">
          <span>1 我的购物车</span>
          <b>2 填写核对订单</b>
          <span>3 成功提交订单</span>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h3>收货人信息</h3>
          <button className="link-button" onClick={() => setAdding(true)}>
            + 新增收货地址
          </button>
        </div>
        <div className="address-grid">
          {addresses?.map((a) => (
            <button
              className={"address-card " + (addressId === a.id ? "active" : "")}
              key={a.id}
              onClick={() => setAddressId(a.id)}
            >
              <b>
                {a.name}
                <span>{a.phone}</span>
              </b>
              <p>
                {a.province} {a.city} {a.district}
              </p>
              <p>{a.detail}</p>
              {a.is_default ? <small>默认地址</small> : null}
              {addressId === a.id && (
                <Check className="address-check" size={15} />
              )}
            </button>
          ))}
          {addresses?.length === 0 && (
            <button className="address-add" onClick={() => setAdding(true)}>
              <Plus />
              添加收货地址
            </button>
          )}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h3>支付方式</h3>
        </div>
        <button className="payment-option selected">
          <CreditCard size={18} />
          在线支付（本地模拟）
          <Check size={14} />
        </button>
        <p className="muted">不连接支付机构，不会发生真实扣款。</p>
      </section>
      <ErrorBox error={error} />
      {quote?.groups.map((g: Data) => (
        <section className="panel checkout-shop" key={g.shopId}>
          <div className="panel-heading">
            <h3>配送商品 · {g.shopName}</h3>
            <Link to="/cart">返回修改购物车</Link>
          </div>
          <div className="delivery-info">
            <Truck size={18} />
            <b>普通快递</b>
            <span>付款后模拟发货，可在订单中跟踪物流</span>
          </div>
          {g.items.map((i: Data) => (
            <div className="checkout-item" key={i.id}>
              <img src={i.image} alt={i.title} />
              <div>
                <Link to={"/product/" + i.product_id}>{i.title}</Link>
                <small>{i.label}</small>
                <span className="green">有货</span>
              </div>
              <b>¥{money(i.price)}</b>
              <span>× {i.quantity}</span>
              <Price value={i.total} />
            </div>
          ))}
          <div className="coupon-select">
            <label htmlFor={"coupon-" + g.shopId}>使用优惠券</label>
            <select
              id={"coupon-" + g.shopId}
              value={selection[g.shopId] || ""}
              onChange={(e) =>
                setSelection({ ...selection, [g.shopId]: e.target.value })
              }
            >
              <option value="">不使用优惠券</option>
              {coupons
                ?.filter(
                  (c) =>
                    c.user_coupon_id &&
                    c.status === "available" &&
                    !c.expired &&
                    (!c.shop_id || c.shop_id === g.shopId),
                )
                .map((c) => {
                  const eligible = g.items
                    .filter(
                      (i: Data) =>
                        !c.category_id || i.category_id === c.category_id,
                    )
                    .reduce((n: number, i: Data) => n + i.subtotal, 0);
                  const used = Object.entries(selection).some(
                    ([s, v]) => s !== g.shopId && v === c.user_coupon_id,
                  );
                  return (
                    <option
                      key={c.id}
                      value={c.user_coupon_id}
                      disabled={eligible < c.min_spend || used}
                    >
                      {c.name} 满{money(c.min_spend)}减{money(c.discount)}
                      {eligible < c.min_spend
                        ? "（未达门槛）"
                        : used
                          ? "（已用于其他订单）"
                          : ""}
                    </option>
                  );
                })}
            </select>
            <Link to="/account/coupons">去领券</Link>
            <span>
              优惠 ¥{money(g.discount)} · 运费 ¥{money(g.shipping)}
            </span>
          </div>
        </section>
      ))}
      {!quote && !error && addressId && <Loading />}
      <section className="checkout-total panel">
        <div className="totals">
          <p>
            <span>商品总金额：</span>
            <b>¥{money(quote?.subtotal)}</b>
          </p>
          <p>
            <span>优惠：</span>
            <b className="red-text">− ¥{money(quote?.discount)}</b>
          </p>
          <p>
            <span>运费：</span>
            <b>¥{money(quote?.shipping)}</b>
          </p>
          <p className="grand-total">
            <span>应付总额：</span>
            <Price value={quote?.total || 0} />
          </p>
        </div>
        <div className="submit-order">
          {quote && (
            <p>
              寄送至：{quote.address.province} {quote.address.city}{" "}
              {quote.address.district} {quote.address.detail}
              <br />
              收货人：{quote.address.name} {quote.address.phone}
            </p>
          )}
          <button
            className="btn primary"
            disabled={!quote || submitting}
            onClick={submit}
          >
            {submitting ? "正在提交…" : "提交订单"}
          </button>
        </div>
      </section>
      {adding && (
        <AddressEditor
          onClose={() => setAdding(false)}
          onSave={reloadAddresses}
        />
      )}
    </main>
  );
}

export function PaymentPage() {
  const { id } = useParams();
  const { boot, run, notify } = useApp();
  const { data, loading, error, reload } = useData<Data>(
    boot?.user ? "/payments/" + id : null,
    2000,
  );
  const [method, setMethod] = useState("京东支付"),
    [busy, setBusy] = useState(false);
  const key = useRef(operationId());
  if (!boot) return <Loading />;
  if (!boot.user) return <LoginRequired />;
  if (loading) return <Loading />;
  const pending =
    data?.orders.filter((o: Data) => o.status === "pending_payment") || [];
  const paid = data?.orders.some((o: Data) => o.payment_status !== "unpaid");
  const pay = (success: boolean) => {
    setBusy(true);
    void run(async () => {
      const r = await api("/payments/" + id, "POST", { success }, key.current);
      key.current = operationId();
      await reload();
      notify(
        r.success ? "模拟支付成功" : "模拟支付失败，订单仍待付款，可重新支付",
        r.success ? "success" : "error",
      );
    }).finally(() => setBusy(false));
  };
  return (
    <main className="wrap payment-page">
      <ErrorBox error={error} />
      {data && (
        <>
          <section className="payment-status panel">
            <div
              className={
                "payment-icon " + (!pending.length && paid ? "success" : "")
              }
            >
              <CheckCircle2 size={42} />
            </div>
            <div>
              <h1>
                {pending.length
                  ? "订单提交成功，请尽快付款！"
                  : paid
                    ? "支付已完成，感谢您的购买！"
                    : "该结算单已关闭"}
              </h1>
              <p>
                {pending.length
                  ? "请在订单创建后30分钟内完成支付，超时将自动取消。"
                  : paid
                    ? "可进入我的订单查看物流进度。"
                    : "订单已取消或超时，您可以重新选购。"}
              </p>
              <small>结算编号：{id}</small>
            </div>
            <div className="payment-amount">
              <span>{pending.length ? "应付金额" : "本次结算"}</span>
              <Price
                value={
                  pending.length
                    ? data.total
                    : data.orders.reduce(
                        (n: number, o: Data) =>
                          n + (o.payment_status !== "unpaid" ? o.total : 0),
                        0,
                      )
                }
              />
            </div>
          </section>
          {pending.length > 0 ? (
            <section className="panel cashier">
              <h2>选择支付方式</h2>
              <div className="cashier-methods">
                {["京东支付", "微信支付", "银行卡"].map((m) => (
                  <button
                    key={m}
                    className={method === m ? "active" : ""}
                    onClick={() => setMethod(m)}
                  >
                    <CreditCard />
                    {m}
                    {method === m && <Check size={15} />}
                  </button>
                ))}
              </div>
              <div className="payment-demo-notice">
                <ShieldCheck size={32} />
                <div>
                  <b>{method} · 本地模拟收银台</b>
                  <p>
                    点击下方按钮完成模拟支付，无需扫码、银行卡信息或验证码。
                  </p>
                </div>
              </div>
              <div className="cashier-actions">
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={() => pay(true)}
                >
                  {busy ? "处理中…" : "确认模拟支付"}
                </button>
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => pay(false)}
                >
                  测试支付失败
                </button>
                <Link to="/account/orders">稍后付款</Link>
              </div>
            </section>
          ) : (
            <div className="payment-success-actions">
              <Link className="btn primary" to="/account/orders">
                查看我的订单
              </Link>
              <Link className="btn" to="/search">
                继续购物
              </Link>
            </div>
          )}
          <section className="panel">
            <h3>本次订单</h3>
            {data.orders.map((o: Data) => (
              <div className="payment-order" key={o.id}>
                <Link to={"/account/orders/" + o.id}>
                  {o.shop_name} · {o.id}
                </Link>
                <span>
                  {labels[o.status]}{" "}
                  {o.payment_status === "refunded" ? "· 已退款" : ""}
                </span>
                <b>¥{money(o.total)}</b>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

export function LoginPage() {
  const { boot, run, refresh } = useApp();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const register = params.get("register") === "1";
  const [form, setForm] = useState({
    username: "",
    password: "",
    nickname: "",
  });
  const [busy, setBusy] = useState(false),
    [signedIn, setSignedIn] = useState(false);
  const next = params.get("next") || "/account";
  const go = () =>
    nav(
      next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
        ? next
        : "/account",
      { replace: true },
    );
  const login = (demo?: string) => {
    setBusy(true);
    void run(async () => {
      await api(
        demo ? "/auth/demo" : register ? "/auth/register" : "/auth/login",
        "POST",
        demo ? { account: demo } : form,
      );
      await refresh();
      setSignedIn(true);
    }).finally(() => setBusy(false));
  };
  useEffect(() => {
    if (signedIn && boot?.user) go();
  }, [signedIn, boot?.user]);
  return (
    <main className="login-area">
      <div className="login-inner wrap">
        <section className="login-art">
          <div className="art-circle circle-one" />
          <div className="art-circle circle-two" />
          <span className="login-global">JD GLOBAL</span>
          <h1>
            好物无界
            <br />
            生活有品
          </h1>
          <p>发现心动好物，开启品质生活</p>
          <div className="login-art-products">
            {boot?.promos[8] && (
              <img src={boot.promos[8].image} alt="品质生活精选" />
            )}
          </div>
        </section>
        <section className="login-card">
          <h2>{register ? "欢迎注册" : "欢迎登录"}</h2>
          <p className="muted">京东全球版 · 本地体验账号</p>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              login();
            }}
          >
            {register && (
              <label>
                昵称
                <input
                  autoComplete="nickname"
                  required
                  value={form.nickname}
                  onChange={(e) =>
                    setForm({ ...form, nickname: e.target.value })
                  }
                />
              </label>
            )}
            <label>
              用户名
              <input
                autoComplete="username"
                required
                minLength={3}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="请输入用户名"
              />
            </label>
            <label>
              密码
              <input
                autoComplete={register ? "new-password" : "current-password"}
                type="password"
                minLength={8}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="至少8位密码"
              />
            </label>
            <button className="btn primary full" disabled={busy}>
              {register ? "注册本地账号" : "登 录"}
            </button>
          </form>
          <div className="login-switch">
            <button
              onClick={() => {
                const p = new URLSearchParams(params);
                register ? p.delete("register") : p.set("register", "1");
                setParams(p);
              }}
            >
              {register ? "已有账号，去登录" : "还没有账号？免费注册"}
            </button>
          </div>
          <div className="demo-login">
            <span>快速体验</span>
            <button
              className="btn"
              disabled={busy}
              onClick={() => login("demo")}
            >
              一键登录体验官
            </button>
            <button
              className="btn light"
              disabled={busy}
              onClick={() => login("other")}
            >
              切换第二个演示账号
            </button>
            <small>
              演示账号 demo / demo2
              <br />
              密码 JdDemo123! · 请勿使用真实京东密码
            </small>
          </div>
        </section>
      </div>
    </main>
  );
}

export function Account() {
  const { boot } = useApp();
  if (!boot) return <Loading />;
  if (!boot.user) return <LoginRequired />;
  return (
    <main className="account-layout wrap">
      <aside className="account-nav">
        <h2>我的京东</h2>
        <div className="account-user">
          <span className="avatar">
            <UserRound />
          </span>
          <b>{boot.user.nickname}</b>
          <small>品质生活，从这里开始</small>
        </div>
        <b className="nav-group">订单中心</b>
        <NavLink end to="/account">
          我的首页
        </NavLink>
        <NavLink end to="/account/orders">
          我的订单
        </NavLink>
        <NavLink to="/account/returns">退款售后</NavLink>
        <b className="nav-group">我的资产</b>
        <NavLink to="/account/coupons">优惠券</NavLink>
        <NavLink to="/account/favorites">我的收藏</NavLink>
        <b className="nav-group">账户设置</b>
        <NavLink to="/account/addresses">收货地址</NavLink>
        <NavLink to="/demo">演示控制台</NavLink>
      </aside>
      <div className="account-content">
        <Outlet />
      </div>
    </main>
  );
}

export function OrdersPage({ dashboard = false }: { dashboard?: boolean }) {
  const [params, setParams] = useSearchParams();
  const {
    data: orders,
    error,
    loading,
    reload,
  } = useData<Data[]>("/orders?" + params.toString(), 3000);
  const [q, setQ] = useState(params.get("q") || "");
  const { boot } = useApp();
  const filter = params.get("status") || "";
  return (
    <>
      <div className="page-heading">
        <h1>{dashboard ? "我的京东" : "我的订单"}</h1>
        <Link to="/search">发现更多好物 ›</Link>
      </div>
      {dashboard && (
        <section className="account-dashboard">
          <div>
            <span className="avatar">
              <UserRound size={32} />
            </span>
            <h2>你好，{boot?.user?.nickname}</h2>
            <p>每一份心意，都值得被认真对待</p>
          </div>
          <Link to="/account/orders?status=pending_payment">
            <CreditCard />
            <b>待付款</b>
          </Link>
          <Link to="/account/orders?status=shipped">
            <Truck />
            <b>待收货</b>
          </Link>
          <Link to="/account/orders?status=completed">
            <MessageSquare />
            <b>待评价</b>
          </Link>
          <Link to="/account/returns">
            <ShieldCheck />
            <b>售后服务</b>
          </Link>
        </section>
      )}
      <section className="panel order-filters">
        <div>
          {[
            ["", "全部订单"],
            ["pending_payment", "待付款"],
            ["pending_shipment", "待发货"],
            ["shipped", "待收货"],
            ["completed", "已完成"],
            ["cancelled", "已取消"],
          ].map(([v, t]) => (
            <button
              className={filter === v ? "active" : ""}
              key={v}
              onClick={() => {
                const p = new URLSearchParams(params);
                v ? p.set("status", v) : p.delete("status");
                setParams(p);
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const p = new URLSearchParams(params);
            q ? p.set("q", q) : p.delete("q");
            setParams(p);
          }}
        >
          <input
            aria-label="搜索订单"
            placeholder="商品名称 / 订单号"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button aria-label="搜索订单">
            <Search size={16} />
          </button>
        </form>
      </section>
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : orders?.length ? (
        orders.map((o) => <OrderCard key={o.id} order={o} reload={reload} />)
      ) : (
        <Empty title="还没有相关订单" />
      )}
    </>
  );
}
function OrderCard({
  order: o,
  reload,
}: {
  order: Data;
  reload: () => Promise<void>;
}) {
  return (
    <section className="order-card">
      <div className="order-card-head">
        <span>{date(o.created_at)}</span>
        <span>
          订单号：<Link to={"/account/orders/" + o.id}>{o.id}</Link>
        </span>
        <b>{o.shop_name}</b>
      </div>
      <div className="order-card-body">
        <div className="order-products">
          {o.items.map((i: Data) => (
            <Link
              key={i.id}
              className="line-product"
              to={"/product/" + i.product_id + "?sku=" + i.sku_id}
            >
              <img src={i.image} alt={i.title} />
              <div>
                <p>{i.title}</p>
                <small>{i.label}</small>
              </div>
              <span>×{i.quantity}</span>
            </Link>
          ))}
        </div>
        <div className="order-recipient">
          <UserRound size={14} />
          {o.address.name}
        </div>
        <div className="order-money">
          <b>¥{money(o.total)}</b>
          <small>含运费 ¥{money(o.shipping)}</small>
          <span>{labels[o.payment_status]}</span>
        </div>
        <div className="order-status">
          <strong className={o.status === "pending_payment" ? "red-text" : ""}>
            {labels[o.status]}
          </strong>
          <Link to={"/account/orders/" + o.id}>订单详情</Link>
          {o.delivered_at && o.status === "shipped" && (
            <span className="green">已送达</span>
          )}
        </div>
        <OrderActions order={o} reload={reload} />
      </div>
    </section>
  );
}
function OrderActions({
  order: o,
  reload,
}: {
  order: Data;
  reload: () => Promise<void>;
}) {
  const { run, refresh, notify } = useApp();
  const [confirm, setConfirm] = useState<string | null>(null);
  const action = () =>
    void run(async () => {
      await api("/orders/" + o.id + "/" + confirm, "POST", {}, operationId());
      setConfirm(null);
      await reload();
      notify("操作成功");
    });
  return (
    <div className="order-actions">
      {o.status === "pending_payment" && (
        <Link className="btn primary small" to={"/payment/" + o.group_id}>
          立即付款
        </Link>
      )}
      {["pending_payment", "pending_shipment"].includes(o.status) && (
        <button onClick={() => setConfirm("cancel")}>取消订单</button>
      )}
      {o.status === "shipped" && (
        <button
          className="btn primary small"
          disabled={!o.delivered_at}
          onClick={() => setConfirm("receive")}
        >
          {o.delivered_at ? "确认收货" : "配送途中"}
        </button>
      )}
      {o.status === "completed" && (
        <Link className="btn small" to={"/account/orders/" + o.id}>
          评价 / 申请售后
        </Link>
      )}
      <button
        onClick={() =>
          void run(async () => {
            await api("/orders/" + o.id + "/rebuy", "POST");
            await refresh();
            notify("商品已加入购物车");
          })
        }
      >
        再次购买
      </button>
      {confirm && (
        <Modal
          title={confirm === "cancel" ? "取消订单" : "确认收货"}
          onClose={() => setConfirm(null)}
        >
          <p>
            {confirm === "cancel"
              ? "取消后将释放库存和优惠券。已支付订单会自动模拟退款。"
              : "确认商品已经收到？确认后可以评价并申请售后。"}
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirm(null)}>
              暂不操作
            </button>
            <button className="btn primary" onClick={action}>
              {confirm === "cancel" ? "确认取消" : "确认收货"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const {
    data: o,
    loading,
    error,
    reload,
  } = useData<Data>("/orders/" + id, 2000);
  const [review, setReview] = useState<Data | null>(null),
    [returnItem, setReturnItem] = useState<Data | null>(null);
  if (loading) return <Loading />;
  if (error || !o) return <ErrorBox error={error} />;
  const steps = ["提交订单", "付款成功", "商品发货", "商品送达", "完成订单"];
  const times = [
    o.created_at,
    o.paid_at,
    o.shipped_at,
    o.delivered_at,
    o.completed_at,
  ];
  return (
    <>
      <div className="page-heading">
        <h1>订单详情</h1>
        <Link to="/account/orders">返回订单列表 ›</Link>
      </div>
      <section className="panel order-detail-status">
        <div>
          <small>订单号：{o.id}</small>
          <h2>{labels[o.status]}</h2>
          <p>
            {labels[o.payment_status]}
            {o.refunded > 0 ? " · 已退款 ¥" + money(o.refunded) : ""}
          </p>
          <OrderActions order={o} reload={reload} />
        </div>
        <div className="order-progress">
          {steps.map((t, i) => (
            <div key={t} className={times[i] ? "done" : ""}>
              <span>{times[i] ? <Check size={18} /> : i + 1}</span>
              <b>{t}</b>
              <small>{times[i] ? date(times[i]) : "等待处理"}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="order-info-grid">
        <section className="panel">
          <h3>
            <MapPin size={16} />
            收货信息
          </h3>
          <p>收货人：{o.address.name}</p>
          <p>联系电话：{o.address.phone}</p>
          <p>
            收货地址：{o.address.province} {o.address.city} {o.address.district}{" "}
            {o.address.detail}
          </p>
        </section>
        <section className="panel">
          <h3>
            <Truck size={16} />
            物流与订单动态
          </h3>
          <div className="timeline">
            {o.events
              .slice()
              .reverse()
              .map((e: Data) => (
                <div key={e.id}>
                  <i />
                  <p>
                    {e.message}
                    <small>{date(e.created_at)}</small>
                  </p>
                </div>
              ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <h3>{o.shop_name}</h3>
        {o.items.map((i: Data) => (
          <div className="order-detail-item" key={i.id}>
            <Link
              className="line-product"
              to={"/product/" + i.product_id + "?sku=" + i.sku_id}
            >
              <img src={i.image} alt={i.title} />
              <div>
                <p>{i.title}</p>
                <small>{i.label}</small>
              </div>
            </Link>
            <div>
              <p>
                ¥{money(i.unit_price)} × {i.quantity}
              </p>
              <small>优惠分摊 ¥{money(i.discount)}</small>
              <p>实付 ¥{money(i.total)}</p>
              {i.returned_quantity > 0 && (
                <small>已退 {i.returned_quantity} 件</small>
              )}
            </div>
            <div className="item-actions">
              {o.status === "completed" && (
                <>
                  <button
                    className="btn small"
                    disabled={Boolean(i.review_id)}
                    onClick={() => setReview(i)}
                  >
                    {i.review_id ? "已评价" : "评价商品"}
                  </button>
                  <button
                    className="btn small"
                    disabled={
                      !i.returnable || i.returned_quantity >= i.quantity
                    }
                    onClick={() => setReturnItem(i)}
                  >
                    {!i.returnable
                      ? "不支持无理由退货"
                      : i.returned_quantity >= i.quantity
                        ? "已全部退货"
                        : "申请退货退款"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        <div className="totals">
          <p>
            <span>商品金额：</span>
            <b>¥{money(o.subtotal)}</b>
          </p>
          <p>
            <span>优惠：</span>
            <b>− ¥{money(o.discount)}</b>
          </p>
          <p>
            <span>运费：</span>
            <b>¥{money(o.shipping)}</b>
          </p>
          <p>
            <span>订单实付：</span>
            <Price value={o.total} />
          </p>
        </div>
      </section>
      {o.returns.length > 0 && (
        <section className="panel">
          <h3>售后记录</h3>
          {o.returns.map((r: Data) => (
            <div className="payment-order" key={r.id}>
              <Link to="/account/returns">{r.id}</Link>
              <span>{labels[r.status]}</span>
              <b>¥{money(r.amount)}</b>
            </div>
          ))}
        </section>
      )}
      {review && (
        <ReviewForm
          item={review}
          onClose={() => setReview(null)}
          onSave={reload}
        />
      )}{" "}
      {returnItem && (
        <ReturnForm
          item={returnItem}
          onClose={() => setReturnItem(null)}
          onSave={reload}
        />
      )}
    </>
  );
}
function ReviewForm({
  item,
  onClose,
  onSave,
}: {
  item: Data;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [rating, setRating] = useState(5),
    [content, setContent] = useState("");
  const { run } = useApp();
  return (
    <Modal title="评价商品" onClose={onClose}>
      <p>{item.title}</p>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await api("/reviews", "POST", { itemId: item.id, rating, content });
            await onSave();
            onClose();
          }, "评价已发布");
        }}
      >
        <div className="rating-input">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              aria-label={n + "星"}
              key={n}
              onClick={() => setRating(n)}
            >
              <Star fill={n <= rating ? "#ffb400" : "none"} color="#ffb400" />
            </button>
          ))}
          <span>{rating} 星</span>
        </div>
        <label>
          分享使用感受
          <textarea
            required
            maxLength={1000}
            rows={4}
            placeholder="写下真实的本地体验…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        <button className="btn primary">提交评价</button>
      </form>
    </Modal>
  );
}
function ReturnForm({
  item,
  onClose,
  onSave,
}: {
  item: Data;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(1),
    [reason, setReason] = useState("七天无理由退货"),
    [note, setNote] = useState("");
  const key = useRef(operationId());
  const { run } = useApp();
  return (
    <Modal title="申请退货退款" onClose={onClose}>
      <div className="line-product">
        <img src={item.image} alt={item.title} />
        <p>{item.title}</p>
      </div>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await api(
              "/returns",
              "POST",
              {
                itemId: item.id,
                quantity,
                reason: reason + (note ? "：" + note : ""),
              },
              key.current,
            );
            await onSave();
            onClose();
          }, "售后申请已提交，可在退款售后查看进度");
        }}
      >
        <label>
          退货原因
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>七天无理由退货</option>
            <option>商品与预期不符</option>
            <option>商品质量问题</option>
            <option>拍错或不需要</option>
          </select>
        </label>
        <label>
          退货数量
          <Quantity
            value={quantity}
            max={item.quantity - item.returned_quantity}
            onChange={setQuantity}
          />
        </label>
        <label>
          问题描述
          <textarea
            maxLength={400}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="可补充说明（选填）"
          />
        </label>
        <p className="muted">
          退款按成交商品金额与已分摊优惠计算，不包含收货后退货的原运费。审核通过后需填写模拟寄回单号。
        </p>
        <button className="btn primary">提交售后申请</button>
      </form>
    </Modal>
  );
}

export function AddressesPage() {
  const {
    data: addresses,
    loading,
    error,
    reload,
  } = useData<Data[]>("/addresses");
  const { run } = useApp();
  const [editing, setEditing] = useState<Data | null | false>(false),
    [deleting, setDeleting] = useState<Data | null>(null);
  return (
    <>
      <div className="page-heading">
        <h1>收货地址</h1>
        <button className="btn primary small" onClick={() => setEditing(null)}>
          <Plus size={14} />
          新增收货地址
        </button>
      </div>
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : (
        <section className="account-addresses">
          {addresses?.length ? (
            addresses.map((a) => (
              <article className="panel" key={a.id}>
                <h3>
                  {a.name}
                  {a.is_default ? (
                    <span className="tag red">默认地址</span>
                  ) : null}
                </h3>
                <p>收货人：{a.name}</p>
                <p>联系电话：{a.phone}</p>
                <p>
                  所在地区：{a.province} {a.city} {a.district}
                </p>
                <p>详细地址：{a.detail}</p>
                <div>
                  <button className="link-button" onClick={() => setEditing(a)}>
                    编辑
                  </button>
                  {!a.is_default && (
                    <button
                      className="link-button"
                      onClick={() =>
                        void run(async () => {
                          await api("/addresses/" + a.id, "PUT", {
                            ...a,
                            is_default: true,
                          });
                          await reload();
                        }, "已设为默认地址")
                      }
                    >
                      设为默认
                    </button>
                  )}
                  <button
                    className="link-button"
                    onClick={() => setDeleting(a)}
                  >
                    删除
                  </button>
                </div>
              </article>
            ))
          ) : (
            <Empty
              title="还没有收货地址"
              text="点击右上方新增地址，让好物准确送达"
              action="/search"
            />
          )}
        </section>
      )}
      {editing !== false && (
        <AddressEditor
          initial={editing || undefined}
          onClose={() => setEditing(false)}
          onSave={reload}
        />
      )}{" "}
      {deleting && (
        <Modal title="删除收货地址" onClose={() => setDeleting(null)}>
          <p>删除“{deleting.name}”的这个地址？历史订单中的地址不会改变。</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDeleting(null)}>
              取消
            </button>
            <button
              className="btn primary"
              onClick={() =>
                void run(async () => {
                  await api("/addresses/" + deleting.id, "DELETE");
                  setDeleting(null);
                  await reload();
                })
              }
            >
              确认删除
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function CouponsPage() {
  const { data: coupons, loading, error, reload } = useData<Data[]>("/coupons");
  const { run } = useApp();
  const [filter, setFilter] = useState("all");
  const shown = coupons?.filter(
    (c) =>
      filter === "all" ||
      (filter === "available" && c.status === "available" && !c.expired) ||
      (filter === "expired" && c.expired) ||
      (filter === "used" && ["used", "locked"].includes(c.status)),
  );
  return (
    <>
      <div className="page-heading">
        <h1>我的优惠券</h1>
        <span className="muted">每个店铺订单可使用一张优惠券</span>
      </div>
      <div className="tabs panel">
        {[
          ["all", "全部优惠券"],
          ["available", "可使用"],
          ["used", "已使用 / 已锁定"],
          ["expired", "已过期"],
        ].map(([v, t]) => (
          <button
            key={v}
            className={filter === v ? "active" : ""}
            onClick={() => setFilter(v)}
          >
            {t}
          </button>
        ))}
      </div>
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : (
        <div className="coupon-grid">
          {shown?.map((c) => (
            <article
              className={"coupon-card " + (c.expired ? "expired" : "")}
              key={c.id}
            >
              <div className="coupon-value">
                <Price value={c.discount} />
                <span>满 {money(c.min_spend)} 元可用</span>
              </div>
              <div className="coupon-body">
                <h3>{c.name}</h3>
                <p>
                  {c.category_id ? "限指定品类" : "全品类商品通用"} ·
                  不与其他券叠加
                </p>
                <small>有效期至 {date(c.expires_at).split(" ")[0]}</small>
                {c.expired ? (
                  <span className="coupon-state">已过期</span>
                ) : !c.user_coupon_id ? (
                  <button
                    className="btn primary small"
                    onClick={() =>
                      void run(async () => {
                        await api("/coupons/" + c.id + "/claim", "POST");
                        await reload();
                      }, "领取成功")
                    }
                  >
                    立即领取
                  </button>
                ) : c.status === "available" ? (
                  <Link
                    className="btn small"
                    to={
                      "/search" +
                      (c.category_id ? "?category=" + c.category_id : "")
                    }
                  >
                    去使用
                  </Link>
                ) : (
                  <span className="coupon-state">
                    {c.status === "locked" ? "订单已锁定" : "已使用"}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
export function FavoritesPage() {
  const {
    data: items,
    loading,
    error,
    reload,
  } = useData<Product[]>("/favorites");
  const { run } = useApp();
  return (
    <>
      <div className="page-heading">
        <h1>我的收藏</h1>
        <span>{items?.length || 0} 件心动好物</span>
      </div>
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : items?.length ? (
        <div className="favorites-grid">
          {items.map((p) => (
            <article key={p.id} className="favorite-card">
              <Link to={"/product/" + p.id}>
                <img src={p.image} alt={p.title} />
                <h3>{p.title}</h3>
                <Price value={p.price} />
              </Link>
              <button
                className="link-button"
                onClick={() =>
                  void run(async () => {
                    await api("/favorites/" + p.id, "DELETE");
                    await reload();
                  })
                }
              >
                取消收藏
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="还没有收藏商品" text="看到喜欢的好物，点亮收藏爱心吧" />
      )}
    </>
  );
}

export function ReturnsPage() {
  const {
    data: returns,
    loading,
    error,
    reload,
  } = useData<Data[]>("/returns", 2000);
  const { run, notify } = useApp();
  const [ship, setShip] = useState<Data | null>(null),
    [tracking, setTracking] = useState(""),
    [cancel, setCancel] = useState<Data | null>(null);
  return (
    <>
      <div className="page-heading">
        <h1>退款售后</h1>
        <Link to="/help?topic=售后政策">售后规则 ›</Link>
      </div>
      <div className="info-note">
        <ShieldCheck size={18} />
        未发货订单可在订单详情取消并退款；已完成订单可在7天内对支持退货的商品申请售后。
      </div>
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : returns?.length ? (
        returns.map((r) => (
          <section className="panel return-card" key={r.id}>
            <div className="return-head">
              <span>服务单号：{r.id}</span>
              <b className="red-text">{labels[r.status]}</b>
            </div>
            <div className="return-body">
              <div className="line-product">
                <img src={r.image} alt={r.title} />
                <div>
                  <p>{r.title}</p>
                  <small>
                    {r.label} · {r.quantity} 件
                  </small>
                </div>
              </div>
              <div>
                <small>退款金额</small>
                <Price value={r.amount} />
              </div>
              <div className="row-actions">
                {r.status === "approved" && (
                  <button
                    className="btn primary small"
                    onClick={() => {
                      setShip(r);
                      setTracking("");
                    }}
                  >
                    填写寄回单号
                  </button>
                )}
                {["requested", "approved"].includes(r.status) && (
                  <button onClick={() => setCancel(r)}>撤销申请</button>
                )}
                <Link to={"/account/orders/" + r.order_id}>查看订单</Link>
              </div>
            </div>
            <p>申请原因：{r.reason}</p>
            <p className="muted">
              申请时间：{date(r.created_at)}
              {r.tracking ? " · 寄回单号：" + r.tracking : ""}
            </p>
            <div className="return-progress">
              {["requested", "approved", "returning", "refunded"].map(
                (s, i) => (
                  <span
                    key={s}
                    className={
                      [
                        "requested",
                        "approved",
                        "returning",
                        "refunded",
                      ].indexOf(r.status) >= i
                        ? "active"
                        : ""
                    }
                  >
                    {i + 1}. {labels[s]}
                  </span>
                ),
              )}
            </div>
          </section>
        ))
      ) : (
        <Empty
          title="暂无售后申请"
          text="进入已完成订单，即可对符合条件的商品申请退货"
          action="/account/orders"
          label="查看我的订单"
        />
      )}
      {ship && (
        <Modal title="填写退货物流" onClose={() => setShip(null)}>
          <p>模拟退货地址：北京市朝阳区演示路88号本地退货中心</p>
          <p className="muted">
            无需真实寄件，填写任意非空的模拟单号即可推进本地退货流程。
          </p>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api("/returns/" + ship.id + "/ship", "POST", {
                  tracking,
                });
                setShip(null);
                await reload();
                notify("寄回信息已提交，等待模拟仓库验收");
              });
            }}
          >
            <label>
              退货快递单号
              <input
                required
                maxLength={60}
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="例如 LOCAL-RETURN-001"
              />
            </label>
            <button className="btn primary">确认寄回</button>
          </form>
        </Modal>
      )}
      {cancel && (
        <Modal title="撤销售后申请" onClose={() => setCancel(null)}>
          <p>撤销后本次售后不再继续，符合条件时可以重新申请。</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setCancel(null)}>
              暂不撤销
            </button>
            <button
              className="btn primary"
              onClick={() =>
                void run(async () => {
                  await api("/returns/" + cancel.id + "/cancel", "POST");
                  setCancel(null);
                  await reload();
                })
              }
            >
              确认撤销
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function DemoPage() {
  const { boot, run, notify } = useApp();
  const { data, loading, error, reload } = useData<Data>(
    boot?.user ? "/demo" : null,
    2000,
  );
  const [report, setReport] = useState<Data | null>(null);
  if (!boot) return <Loading />;
  if (!boot.user) return <LoginRequired />;
  const names: Record<string, string> = {
    ship: "立即发货",
    deliver: "模拟送达",
    approve_return: "审核退货",
    refund_return: "验收并退款",
    expire: "付款超时自动取消",
  };
  return (
    <main className="wrap demo-page">
      <div className="page-heading">
        <div>
          <h1>演示控制台</h1>
          <p className="muted">查看当前账号的模拟流程，快速体验购物与售后。</p>
        </div>
        <Link className="btn" to="/account/orders">
          回到我的订单
        </Link>
      </div>
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="demo-overview">
              <section className="panel">
                <Clock />
                <span>商城模拟时间</span>
                <b>{date(data.now)}</b>
              </section>
              <section className="panel">
                <Truck />
                <span>自动推进</span>
                <b>{data.auto ? "已开启" : "已暂停"}</b>
                {boot.user.id === "demo" && (
                  <button
                    className="link-button"
                    onClick={() =>
                      void run(async () => {
                        await api("/demo/auto", "POST", {
                          enabled: !data.auto,
                        });
                        await reload();
                      })
                    }
                  >
                    {data.auto ? "暂停自动推进" : "开启自动推进"}
                  </button>
                )}
              </section>
              <section className="panel">
                <ShieldCheck />
                <span>业务数据校验</span>
                <button
                  className="btn"
                  onClick={() =>
                    void run(async () => {
                      setReport(await api("/demo/check"));
                    })
                  }
                >
                  检查数据一致性
                </button>
              </section>
            </div>
            {report && (
              <section className="panel">
                <h3 className={report.ok ? "green" : "red-text"}>
                  {report.ok ? "全部数据检查通过" : "存在需要处理的数据问题"}
                </h3>
                <div className="data-counts">
                  {Object.entries(report.counts).map(([k, v]) => (
                    <span key={k}>
                      {k} <b>{String(v)}</b>
                    </span>
                  ))}
                </div>
                {report.errors.map((e: string) => (
                  <p className="error-box" key={e}>
                    {e}
                  </p>
                ))}
              </section>
            )}
            <section className="panel">
              <h3>待推进任务</h3>
              <p className="muted">
                付款后60秒发货，再过120秒送达；售后审核和验收各30秒。付款超时始终按30分钟处理。
              </p>
              <div className="jobs-table">
                <div className="jobs-head">
                  <b>动作</b>
                  <b>关联记录</b>
                  <b>计划时间</b>
                  <b>操作</b>
                </div>
                {data.jobs.filter((j: Data) => j.status === "pending")
                  .length ? (
                  data.jobs
                    .filter((j: Data) => j.status === "pending")
                    .map((j: Data) => (
                      <div className="job-row" key={j.id}>
                        <span>{names[j.kind]}</span>
                        <span>{j.entity_id}</span>
                        <span>{date(j.due_at)}</span>
                        <button
                          className="btn small"
                          disabled={j.kind === "expire"}
                          onClick={() =>
                            void run(async () => {
                              await api("/demo/advance", "POST", {
                                entityId: j.entity_id,
                                kind: j.kind,
                              });
                              await reload();
                              notify("模拟步骤已完成");
                            })
                          }
                        >
                          {j.kind === "expire" ? "等待到期" : "立即执行"}
                        </button>
                      </div>
                    ))
                ) : (
                  <p className="muted">
                    当前没有待处理任务。下单并支付后，会自动生成发货任务。
                  </p>
                )}
              </div>
            </section>
            <section className="panel">
              <h3>最近完成的模拟步骤</h3>
              {data.jobs
                .filter((j: Data) => j.status !== "pending")
                .slice(0, 10)
                .map((j: Data) => (
                  <div className="payment-order" key={j.id}>
                    <span>{names[j.kind]}</span>
                    <small>{j.entity_id}</small>
                    <span>
                      {
                        {
                          done: "已完成",
                          cancelled: "已取消",
                          failed: "执行失败",
                        }[j.status as "done"]
                      }
                    </span>
                  </div>
                ))}
            </section>
            <section className="panel">
              <h3>重新开始体验</h3>
              <p>
                重置会清除本地购物记录并恢复固定种子，系统会先保留数据库备份。
              </p>
              <p className="muted">
                关闭商城服务后，在项目目录运行 <code>npm run db:reset</code>
                ，再运行 <code>npm start</code>。
              </p>
            </section>
          </>
        )
      )}
    </main>
  );
}

export function HelpPage() {
  const [params, setParams] = useSearchParams();
  const topic = params.get("topic") || "购物流程";
  const topics: Record<string, { title: string; blocks: [string, string][] }> =
    {
      购物流程: {
        title: "购物指南",
        blocks: [
          [
            "发现喜欢的好物",
            "在首页分类、推荐区或搜索框中寻找商品，通过品牌、价格、自营和库存条件筛选。商品详情可以选择组合规格与数量。",
          ],
          [
            "加入购物车并提交订单",
            "登录本地账号，选择收货地址和适用优惠券。后端统一计算折扣与运费，提交后可前往本地收银台完成模拟付款。",
          ],
          [
            "物流、收货与评价",
            "付款后自动模拟发货与配送，商品送达后可在订单详情确认收货。已完成订单支持评价；符合条件的商品可以申请退货。",
          ],
        ],
      },
      运费说明: {
        title: "配送与运费说明",
        blocks: [
          [
            "基础运费",
            "普通商品按店铺计算运费：基础运费6元，优惠后的商品金额满59元免基础运费。标注单品包邮的规格免运费。",
          ],
          [
            "续重规则",
            "计费重量按合成商品毛重扣减10%计算。北京、上海、杭州、苏州、南京、深圳、广州、重庆、成都、天津、武汉、沈阳、西安适用20/30/40/50/50kg限重，其他地区10/20/30/40/50kg，金额档位分别为199/299/399/499元。超出部分向上取整，每公斤1元。",
          ],
          [
            "以结算为准",
            "本地目录仅模拟普通快递，未包含冷链、即时配送、大件安装和跨境服务。各项费用以提交订单前显示的后端报价为准。",
          ],
        ],
      },
      售后政策: {
        title: "退货退款与售后政策",
        blocks: [
          [
            "未发货订单",
            "待付款或待发货订单可以取消，取消后恢复库存和优惠券。已付款且未发货的订单全额模拟退款。",
          ],
          [
            "收货后的退货",
            "确认收货后7天内，支持退货的商品可按数量申请退货。审核通过后填写模拟寄回单号；仓库验收后恢复库存并退还对应商品实付金额。",
          ],
          [
            "退款与优惠券",
            "退款按订单项折扣分摊后的成交金额计算，累计退款不超过支付金额。收货后的退货不退原运费；部分退款不返券，全部商品退货后恢复尚有效的优惠券。",
          ],
          [
            "当前不提供的服务",
            "本地演示未包含维修换货、价格保护、真实客服、白条金融、政府补贴资格审核及跨境清关。",
          ],
        ],
      },
      账户与登录: {
        title: "账户与隐私",
        blocks: [
          [
            "演示账号",
            "可通过登录页一键进入体验官账号。用户名 demo 或 demo2，密码均为 JdDemo123!。两个账号拥有独立地址、购物车和订单。",
          ],
          [
            "本地注册",
            "支持创建新的本地账号。密码经过哈希保存，请勿使用真实京东账号的密码。账号数据仅保存在本机数据库中。",
          ],
          [
            "演示数据",
            "商品图片与标题来自公开页面；库存、组合规格、用户、评价、订单及物流均为本地演示数据。页面中的价格是冻结的本地销售价格，原素材中的活动文案不作为结算依据。",
          ],
        ],
      },
      模拟支付: {
        title: "本地模拟支付",
        blocks: [
          [
            "没有真实交易",
            "京东支付、微信和银行卡按钮均使用同一本地模拟器，不收集银行卡号、真实验证码或支付密码。",
          ],
          [
            "支付失败与重试",
            "可以主动测试支付失败。失败不会改变订单待付款状态；30分钟内可再次支付。重复提交不会重复扣减库存或生成支付结果。",
          ],
          [
            "模拟流程推进",
            "可以在演示控制台暂停自动推进或立即执行发货、送达、售后审核和验收。确认收货与填写退货单号仍需用户操作。",
          ],
        ],
      },
    };
  const mapped = /运费|配送|物流/.test(topic)
    ? "运费说明"
    : /售后|退货|退款/.test(topic)
      ? "售后政策"
      : /账户|登录|安全/.test(topic)
        ? "账户与登录"
        : /支付|付款/.test(topic)
          ? "模拟支付"
          : "购物流程";
  const page = topics[mapped];
  return (
    <main className="help-layout wrap">
      <aside className="panel">
        <h2>帮助中心</h2>
        {Object.entries(topics).map(([k, v]) => (
          <button
            className={mapped === k ? "active" : ""}
            key={k}
            onClick={() => setParams({ topic: k })}
          >
            {v.title}
            <ChevronRight size={14} />
          </button>
        ))}
      </aside>
      <article className="panel help-copy">
        <div className="help-heading">
          <Headphones size={32} />
          <div>
            <h1>{page.title}</h1>
            <p>为你解答本地商城的使用问题</p>
          </div>
        </div>
        {page.blocks.map(([h, t]) => (
          <section key={h}>
            <h3>{h}</h3>
            <p>{t}</p>
          </section>
        ))}
        <div className="info-note">
          <ShieldCheck size={20} />
          本网站为本地复刻演示环境，非京东官方网站。不会发起真实交易或联系真实商家。
        </div>
      </article>
    </main>
  );
}
