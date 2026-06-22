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

本地开发时用 Wrangler secret 注入应用凭据：

```bash
pnpm exec wrangler secret put BAIDU_CLIENT_ID --config apps/worker/wrangler.toml
pnpm exec wrangler secret put BAIDU_CLIENT_SECRET --config apps/worker/wrangler.toml
```

前端先在“授权”页保存当前用户 ID，再点击“开始授权”。授权完成后进入“网盘”页扫描目录，选择 TXT 文件确认导入。
