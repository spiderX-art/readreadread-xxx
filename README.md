# Novel Cloud Reader

私人网盘小说书架系统，基于 Vue 3、Hono、Cloudflare Workers、D1 和 R2。

## 本地开发

```bash
pnpm install
pnpm check
pnpm dev:worker
pnpm dev:web
```

## Cloudflare 资源

- D1 binding: `DB`
- R2 binding: `BOOK_BUCKET`
- D1 migrations: `migrations`

应用本地 D1 迁移：

```bash
pnpm exec wrangler d1 migrations apply novel-cloud-reader --local --config apps/worker/wrangler.toml
```

## 项目索引

- [功能索引表](docs/feature-index.md)：按功能映射前端入口、API、后端路由、核心业务文件和数据表，方便后续快速定位代码。

## 百度网盘导入配置

在百度开放平台创建应用，并把回调地址配置为：

```text
http://localhost:8787/api/auth/baidu/callback
```

生产部署时，把回调地址同时配置为你的 Worker 域名：

```text
https://<your-worker-domain>/api/auth/baidu/callback
```

本地开发时用 Wrangler secret 注入应用凭据：

```bash
pnpm exec wrangler secret put BAIDU_CLIENT_ID --config apps/worker/wrangler.toml
pnpm exec wrangler secret put BAIDU_CLIENT_SECRET --config apps/worker/wrangler.toml
```

授权页不再需要手动输入用户 ID。进入“授权”页或从网盘能力检测到未授权时，会自动拉起百度网盘授权；回调后服务端会用百度 `passport/users/getInfo` 接口读取真实百度 `openid`/账号标识，并用该标识保存用户和网盘 token。

## Cloudflare 部署

1. 创建 Cloudflare D1 和 R2 资源，并把真实资源 ID 写入 `apps/worker/wrangler.toml`。
2. 应用 D1 迁移：

```bash
pnpm exec wrangler d1 migrations apply novel-cloud-reader --remote --config apps/worker/wrangler.toml
```

3. 设置 Worker 生产环境变量和密钥：

```bash
pnpm exec wrangler secret put BAIDU_CLIENT_ID --config apps/worker/wrangler.toml
pnpm exec wrangler secret put BAIDU_CLIENT_SECRET --config apps/worker/wrangler.toml
pnpm exec wrangler secret put BAIDU_REDIRECT_URI --config apps/worker/wrangler.toml
pnpm exec wrangler secret put FRONTEND_ORIGIN --config apps/worker/wrangler.toml
```

其中 `BAIDU_REDIRECT_URI` 必须等于百度开放平台里配置的生产回调地址，`FRONTEND_ORIGIN` 必须等于前端站点地址。

4. 部署 Worker：

```bash
pnpm --filter worker deploy
```

5. 构建前端并部署到 Cloudflare Pages，把 `VITE_API_BASE_URL` 设置为 Worker 地址：

```bash
pnpm --filter web build
```

Cloudflare Pages 构建命令使用 `pnpm --filter web build`，输出目录使用 `apps/web/dist`。
