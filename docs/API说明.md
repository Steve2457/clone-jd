# 本地 REST API

前缀 `/api/v1`，JSON 请求与响应。账户会话使用 HttpOnly、SameSite=Lax Cookie。写入接口校验同源 Origin（本机命令行无 Origin 可调用）。金额为人民币分，时间为 UTC 毫秒，页面显示北京时间。模拟时钟基准见 README。

失败响应：`{"error":{"code":"INSUFFICIENT_STOCK","message":"商品库存不足，请刷新后重试"}}`。常用状态：400 输入/资格错误，401 未登录，403 无权操作，404 不存在或不属于当前用户，409 库存/状态/幂等冲突，413 请求过大，415 内容编码不支持。不会把业务冲突返回为成功。

| 路由 | 方法 | 内容 |
| --- | --- | --- |
| `/api/health` | GET | 健康、数据初始化和 schema版本（无 v1 前缀） |
| `/bootstrap` | GET | 当前用户、分类、首页活动、购物车数量、模拟时间 |
| `/auth/register` | POST | username、password、nickname；本地注册 |
| `/auth/login`、`/auth/logout` | POST | 登录、退出 |
| `/auth/demo` | POST | account: demo 或 other |
| `/products` | GET | q/category/brand/shop/min/max/self=1/stock=1/collection/featured/sort/page/limit |
| `/products/:id` | GET | 商品、SKU、图片与评价 |
| `/catalog/meta`、`/shops/:id` | GET | 品牌列表及店铺信息 |
| `/cart` | GET/POST | 读取、追加 skuId 与 quantity |
| `/cart/:skuId` | PATCH/DELETE | 修改 quantity/selected、移除 |
| `/cart/selection` | POST | selected 布尔值，全选或清空选中 |
| `/addresses`、`/addresses/:id` | GET/POST/PUT/DELETE | 当前用户地址；PUT/DELETE 使用带id路径 |
| `/coupons`、`/coupons/:id/claim` | GET/POST | 券列表及领取 |
| `/favorites`、`/favorites/:id` | GET/POST/DELETE | 收藏列表及商品收藏操作 |
| `/checkout/quote` | POST | addressId、可选items、coupons店铺映射；未传items则取选中购物车 |
| `/orders` | POST | 同报价输入及可选expectedTotal，返回groupId、orderIds、total |
| `/orders`、`/orders/:id` | GET | 状态/关键词列表及订单详情快照 |
| `/orders/:id/cancel`、`receive`、`rebuy` | POST | 取消、确认收货、再次购买 |
| `/payments/:groupId` | GET/POST | 合并收银信息；POST传success布尔值模拟成功/失败 |
| `/reviews` | POST | itemId、rating(1–5)、content |
| `/returns`、`/returns/:id` | GET | 当前用户售后列表、详情 |
| `/returns` | POST | itemId、quantity、reason |
| `/returns/:id/cancel`、`ship` | POST | 撤销或寄回；寄回需tracking |
| `/demo` | GET | 当前用户订单、售后和持久任务 |
| `/demo/auto` | POST | enabled，只有demo可修改全局模拟开关 |
| `/demo/advance` | POST | entityId、可选kind，且必须属于本人 |
| `/demo/check` | GET | demo专用数据校验 |

`POST /orders`、支付、取消、收货和创建售后必须带 `Idempotency-Key` 请求头，1–120字符。重试必须保留相同请求体和键。已完成的原请求重放返回原响应；状态再次提交采用独立状态检查防止重复扣库存、付款或退款。

`sort` 支持 `price_asc`、`price_desc`、`sales`、`rating`、`new`，默认综合顺序。`collection` 支持 `new`、`value`。筛选价格单位为元，返回金额为分；页大小1–200，默认24。不存在的商品、订单和售后返回404。

有关键词时综合顺序按标题、品牌和目录别名的相关性计算。搜索“手机”“智能手机”及品牌加手机（如“苹果手机”）使用整机类型索引；配件关键词继续匹配具体商品。大分类通过`category`筛选，分类名称不再模糊命中其下所有商品。`/catalog/meta`接受相同查询条件并返回当前结果的品牌选项（忽略brand自身，便于切换品牌）。

示例报价：

```json
{
  "addressId": "addr-demo",
  "items": [{"skuId": "p0006-2", "quantity": 2}],
  "coupons": {"s001": "uc-demo-c2"}
}
```

报价返回按店铺分组的明细、subtotal、discount、shipping、total及地址。下单时附上当前total作为expectedTotal，服务端重算不一致则返回PRICE_CHANGED。库存、券状态发生变化也会阻止提交。
