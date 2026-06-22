# 功能索引表

这张表用于按功能快速定位代码入口，避免每次都从全仓库扫描开始。新增或调整功能时，同步更新对应行。

## 快速查找

| 功能 | 前端入口 | 前端 API/状态 | 后端路由 | 核心业务文件 | 数据表/索引 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 应用路由和主框架 | `apps/web/src/app/App.vue`, `apps/web/src/app/router.ts` | `apps/web/src/services/api.ts` | `apps/worker/src/index.ts` | `apps/worker/src/middleware/auth.middleware.ts`, `apps/worker/src/middleware/cors.middleware.ts`, `apps/worker/src/middleware/error.middleware.ts` | 无 | API 基础路由和鉴权挂载在 worker `index.ts`。 |
| 授权管理/百度登录 | `apps/web/src/pages/AuthPage.vue` | `apps/web/src/services/auth.api.ts`, `apps/web/src/services/auth-session.ts`, `apps/web/src/stores/auth.store.ts` | `apps/worker/src/routes/auth.routes.ts` | `apps/worker/src/services/baidu/baidu-auth.service.ts`, `apps/worker/src/services/baidu/baidu-token.service.ts` | `users`, `baidu_tokens` | `GET /api/auth/baidu/login`, `GET /api/auth/baidu/callback`, `GET /api/auth/me`。 |
| 网盘目录浏览 | `apps/web/src/pages/NetdiskScanPage.vue`, `apps/web/src/components/netdisk/NetdiskFileRow.vue` | `apps/web/src/services/netdisk.api.ts` | `apps/worker/src/routes/netdisk.routes.ts` | `apps/worker/src/services/baidu/baidu-file.service.ts` | `books.source_file_id`, `idx_books_user_id` | 目录浏览调用百度 `list`，只列指定目录；手动搜索调用百度 `search` 并开启递归。 |
| TXT 导入确认 | `apps/web/src/pages/ImportConfirmPage.vue` | `apps/web/src/services/import.api.ts` | `apps/worker/src/routes/import.routes.ts` | `apps/worker/src/services/import/txt-import.service.ts`, `apps/worker/src/services/import/chapter-parser.service.ts`, `packages/parser/src/parse-title-author.ts`, `packages/parser/src/parse-chapters.ts`, `packages/parser/src/detect-encoding.ts` | `books`, `chapters`, `import_jobs`, `idx_chapters_book_id`, `idx_chapters_book_index`, `idx_import_jobs_user_id` | `POST /api/import/preview`, `POST /api/import/txt`, `GET /api/import/jobs/:jobId`。 |
| 自动同步/自动导入 | `apps/web/src/app/App.vue`, `apps/web/src/pages/BookshelfPage.vue` | `apps/web/src/stores/import-sync.store.ts`, `apps/web/src/services/import.api.ts` | `apps/worker/src/routes/import.routes.ts` | `apps/worker/src/services/import/sync-import.service.ts`, `apps/worker/src/services/baidu/baidu-file.service.ts`, `apps/worker/src/services/import/txt-import.service.ts` | `books.source_file_id`, `import_jobs` | 固定同步路径为 `/小说`，前端 60 秒冷却；不是全盘递归扫描。 |
| 书架列表/筛选/搜索 | `apps/web/src/pages/BookshelfPage.vue`, `apps/web/src/components/book/BookCard.vue` | `apps/web/src/services/books.api.ts`, `apps/web/src/stores/books.store.ts` | `apps/worker/src/routes/books.routes.ts` | `apps/worker/src/db/repositories/book.repo.ts`, `apps/worker/src/services/search/bookshelf-search.service.ts` | `books`, `idx_books_user_id`, `idx_books_status`, `idx_books_title`, `book_tags`, `tags` | `GET /api/books`, `GET /api/books/search`。 |
| 书籍详情/元数据 | `apps/web/src/pages/BookDetailPage.vue` | `apps/web/src/services/books.api.ts`, `apps/web/src/stores/books.store.ts` | `apps/worker/src/routes/books.routes.ts` | `apps/worker/src/db/repositories/book.repo.ts`, `apps/worker/src/services/books/book.service.ts` | `books`, `idx_books_user_id`, `idx_books_status`, `idx_books_title` | `GET /api/books/:bookId`, `PATCH /api/books/:bookId`, `PATCH /api/books/:bookId/status`, `DELETE /api/books/:bookId`。 |
| 阅读器/章节内容 | `apps/web/src/pages/ReaderPage.vue`, `apps/web/src/components/reader/ReaderToolbar.vue`, `apps/web/src/composables/useReader.ts`, `apps/web/src/composables/useMobileReader.ts` | `apps/web/src/services/reader.api.ts`, `apps/web/src/stores/reader.store.ts`, `apps/web/src/stores/settings.store.ts` | `apps/worker/src/routes/reader.routes.ts` | `apps/worker/src/db/repositories/chapter.repo.ts`, `apps/worker/src/db/repositories/reading-progress.repo.ts`, `apps/worker/src/services/storage/r2.service.ts`, `apps/worker/src/services/books/progress.service.ts` | `chapters`, `reading_progress`, `idx_chapters_book_id`, `idx_chapters_book_index`, `idx_progress_user_book` | `GET /api/books/:bookId/chapters`, `GET /api/books/:bookId/chapters/:chapterId`, progress 读写。 |
| 书内全文搜索 | `apps/web/src/pages/BookSearchPage.vue` | `apps/web/src/services/search.api.ts` | `apps/worker/src/routes/search.routes.ts` | `apps/worker/src/services/search/book-fulltext-search.service.ts`, `apps/worker/src/services/storage/r2.service.ts`, `apps/worker/src/db/repositories/chapter.repo.ts` | `chapters` | 当前按章节读取 R2 文本后匹配，不是数据库全文索引。 |
| 标签管理 | `apps/web/src/pages/BookDetailPage.vue` | `apps/web/src/services/tags.api.ts` | `apps/worker/src/routes/tags.routes.ts` | `apps/worker/src/db/repositories/tag.repo.ts` | `tags`, `book_tags`, `idx_tags_user_name` | `GET /api/tags`, `POST /api/tags`, 书籍标签绑定/解绑。 |
| 多维评分 | `apps/web/src/pages/BookDetailPage.vue`, `apps/web/src/components/rating/RatingGrid.vue` | `apps/web/src/services/books.api.ts`, `apps/web/src/composables/useRating.ts`, `apps/web/src/utils/rating.ts` | `apps/worker/src/routes/rating.routes.ts` | `apps/worker/src/services/rating/rating.service.ts`, `apps/worker/src/db/repositories/rating.repo.ts`, `packages/shared/src/rating.ts` | `book_ratings`, `idx_ratings_user_book` | `GET /api/books/:bookId/rating`, `PUT /api/books/:bookId/rating`。 |
| 书评/弃文原因 | `apps/web/src/pages/BookDetailPage.vue` | `apps/web/src/services/books.api.ts` | `apps/worker/src/routes/reviews.routes.ts` | `apps/worker/src/db/repositories/review.repo.ts`, `apps/worker/src/services/rating/drop-reason.service.ts` | `reviews`, `drop_reasons`, `idx_reviews_user_book`, `idx_drop_reasons_book_id` | `GET/PUT /review`, `GET/PUT /drop-reason`。 |
| TXT 解析工具包 | 无直接页面 | 无 | 无 | `packages/parser/src/clean-text.ts`, `packages/parser/src/detect-encoding.ts`, `packages/parser/src/parse-title-author.ts`, `packages/parser/src/parse-chapters.ts` | 无 | 被导入预览、TXT 导入、章节拆分复用。 |
| 共享类型/枚举 | 多页面引用 | `packages/shared/src/index.ts` | 后端路由返回类型引用 | `packages/shared/src/book.ts`, `packages/shared/src/chapter.ts`, `packages/shared/src/netdisk.ts`, `packages/shared/src/rating.ts`, `packages/shared/src/review.ts`, `packages/shared/src/tag.ts`, `packages/shared/src/api.ts` | 无 | 前后端共享类型定义集中在 `packages/shared`。 |
| 存储对象路径/R2 读写 | 无直接页面 | 无 | 多个导入/阅读接口间接使用 | `apps/worker/src/services/storage/object-key.service.ts`, `apps/worker/src/services/storage/r2.service.ts`, `apps/worker/src/services/books/chapter.service.ts` | R2: `BOOK_BUCKET` | 原始 TXT 和章节内容写入 R2，数据库保存 object key。 |

## 按接口反查

| 接口前缀 | 路由文件 | 主要功能 |
| --- | --- | --- |
| `/api/auth` | `apps/worker/src/routes/auth.routes.ts` | 百度授权、当前用户、登出 |
| `/api/netdisk` | `apps/worker/src/routes/netdisk.routes.ts` | 网盘目录列表、网盘搜索 |
| `/api/import` | `apps/worker/src/routes/import.routes.ts` | 自动同步、导入预览、TXT 导入、导入任务查询 |
| `/api/books` | `apps/worker/src/routes/books.routes.ts` | 书架列表、详情、更新、删除、状态 |
| `/api/books/:bookId/chapters` | `apps/worker/src/routes/reader.routes.ts` | 章节列表、章节内容 |
| `/api/books/:bookId/progress` | `apps/worker/src/routes/reader.routes.ts` | 阅读进度读写 |
| `/api/books/:bookId/rating` | `apps/worker/src/routes/rating.routes.ts` | 多维评分读写 |
| `/api/books/:bookId/review` | `apps/worker/src/routes/reviews.routes.ts` | 书评读写 |
| `/api/books/:bookId/drop-reason` | `apps/worker/src/routes/reviews.routes.ts` | 弃文原因读写 |
| `/api/books/:bookId/search` | `apps/worker/src/routes/search.routes.ts` | 书内搜索 |
| `/api/tags`, `/api/books/:bookId/tags` | `apps/worker/src/routes/tags.routes.ts` | 标签列表、创建、绑定、解绑 |

## 按数据表反查

| 表/索引 | 主要服务功能 | 相关文件 |
| --- | --- | --- |
| `users` | 用户占位和鉴权上下文 | `apps/worker/src/db/repositories/user.repo.ts`, `apps/worker/src/routes/auth.routes.ts` |
| `baidu_tokens` | 百度授权 token 保存和刷新 | `apps/worker/src/db/repositories/token.repo.ts`, `apps/worker/src/services/baidu/baidu-token.service.ts` |
| `books` | 书架、导入去重、书籍状态、元数据 | `apps/worker/src/db/repositories/book.repo.ts`, `apps/worker/src/routes/books.routes.ts`, `apps/worker/src/services/import/txt-import.service.ts` |
| `chapters` | 章节目录和章节 object key | `apps/worker/src/db/repositories/chapter.repo.ts`, `apps/worker/src/routes/reader.routes.ts` |
| `reading_progress` | 阅读进度 | `apps/worker/src/db/repositories/reading-progress.repo.ts`, `apps/worker/src/routes/reader.routes.ts` |
| `tags`, `book_tags` | 标签和书籍标签关系 | `apps/worker/src/db/repositories/tag.repo.ts`, `apps/worker/src/routes/tags.routes.ts` |
| `book_ratings` | 多维评分 | `apps/worker/src/db/repositories/rating.repo.ts`, `apps/worker/src/routes/rating.routes.ts` |
| `drop_reasons` | 弃文原因 | `apps/worker/src/db/repositories/review.repo.ts`, `apps/worker/src/routes/reviews.routes.ts` |
| `reviews` | 书评 | `apps/worker/src/db/repositories/review.repo.ts`, `apps/worker/src/routes/reviews.routes.ts` |
| `import_jobs` | 导入任务状态 | `apps/worker/src/db/repositories/import-job.repo.ts`, `apps/worker/src/services/import/txt-import.service.ts`, `apps/worker/src/routes/import.routes.ts` |

## 维护规则

- 新增页面时，先更新“快速查找”的前端入口和对应 API。
- 新增后端接口时，同步更新“按接口反查”。
- 新增或调整 D1 表/索引时，同步更新“按数据表反查”。
- 自动同步、搜索、导入这类容易混淆的功能，需要在备注里写清扫描范围和触发方式。
