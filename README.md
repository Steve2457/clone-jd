# 京东全球版本地商城

双击 **启动商城.cmd**，等待启动完成，浏览器会自动打开 http://localhost:3000。

使用结束后，双击 **停止商城.cmd**。

## 所需依赖

- **Windows**，使用系统自带的 Windows PowerShell。
- **Node.js 22.x（22.13 及以上）**，推荐 **22.23.4**；安装时保留自带的 npm。
- **Chrome 或 Edge 浏览器**。
- 项目依赖由启动脚本自动检查；缺少依赖时会自动安装，此时需要联网。依赖齐全后可离线使用。

SQLite 已包含在 Node.js 中，无需另装数据库、Python 或 Docker。

## 技术实现

项目采用 TypeScript 开发，整体架构为：**浏览器页面 → 本地 HTTP API → SQLite 数据库**。

- **前端**：React + React Router 构建商城页面，Vite 负责开发与打包。
- **后端**：Node.js + Express 提供 `/api/v1` 接口，统一处理登录、搜索、购物车、订单、金额计算、库存和售后；后台定时推进模拟物流与售后任务。
- **数据与素材**：业务数据保存在 `data/mall.sqlite`，刷新或重启后保留；商品图片等素材保存在 `public/assets/`，运行时不调用京东 API。
- **运行方式**：启动后由同一个 Node.js 服务提供页面、接口和静态素材，默认仅在本机 `localhost:3000` 访问。

## 项目结构

```text
src/               前端页面、组件和样式
server/            后端接口、业务逻辑、数据库与初始化数据
public/assets/     本地商品图片、横幅等素材
data/              SQLite 数据库、商品目录、备份与运行日志
scripts/           启停脚本与素材处理工具
tests/             接口与业务逻辑测试
docs/              业务规则、接口说明与验收报告
evidence/          验收截图与检查记录
dist/              构建后的页面与静态文件
package.json       项目依赖与脚本配置
启动商城.cmd       双击启动商城
停止商城.cmd       双击停止商城
```

## 演示账号

账号：`demo` 或 `demo2`，密码均为：`JdDemo123!`。

本项目为本地演示商城，支付与物流均为模拟。
