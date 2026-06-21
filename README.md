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
