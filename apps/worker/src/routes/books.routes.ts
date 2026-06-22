import { Hono } from "hono";
import type { Book, BookSearchQuery, BookStatus } from "shared";
import {
  deleteBookRow,
  findBookRow,
  listBookRows,
  updateBookRow,
  type BookRow,
  type ListBookRowsQuery
} from "../db/repositories/book.repo";
import type { AppEnv } from "../env";
import { shouldUpdateLastReadAt } from "../services/books/book.service";
import { AppError } from "../utils/errors";
import { ok } from "../utils/response";
import { isValidRatingValue } from "../validators/rating.validator";
import { isBookStatus } from "../validators/books.validator";

export const bookRoutes = new Hono<AppEnv>();

const LOCAL_USER_ID = "local-user";

bookRoutes.get("/", async (c) => {
  const query = toListBookRowsQuery(c);
  const books = await listBookRows(c.env.DB, currentUserId(c), query);

  return c.json(ok({ items: books.map(toBook), total: books.length }));
});

bookRoutes.get("/search", async (c) => {
  const query: BookSearchQuery = {
    q: c.req.query("q"),
    status: parseStatus(c.req.query("status")),
    tag: c.req.query("tag"),
    minRating: parseOptionalNumber(c.req.query("minRating")),
    maxRating: parseOptionalNumber(c.req.query("maxRating"))
  };
  const books = await listBookRows(c.env.DB, currentUserId(c), query);

  return c.json(ok({ query, items: books.map(toBook), total: books.length }));
});

bookRoutes.get("/:bookId", async (c) => {
  const book = await getOwnedBook(c.env.DB, currentUserId(c), c.req.param("bookId"));

  return c.json(ok(toBook(book)));
});

bookRoutes.patch("/:bookId", async (c) => {
  const userId = currentUserId(c);
  const bookId = c.req.param("bookId");
  await getOwnedBook(c.env.DB, userId, bookId);

  const body = (await c.req.json().catch(() => ({}))) as {
    title?: unknown;
    author?: unknown;
    status?: unknown;
    rating?: unknown;
  };
  const status = body.status === undefined ? undefined : parseBodyStatus(body.status);
  const rating = parseBodyRating(body.rating);
  const updatedAt = new Date().toISOString();
  await updateBookRow(c.env.DB, userId, bookId, {
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : undefined,
    author: typeof body.author === "string" ? body.author.trim() || null : undefined,
    status,
    rating,
    updatedAt,
    lastReadAt: status && shouldUpdateLastReadAt(status) ? updatedAt : undefined
  });

  const updated = await getOwnedBook(c.env.DB, userId, bookId);
  return c.json(ok(toBook(updated)));
});

bookRoutes.delete("/:bookId", async (c) => {
  const userId = currentUserId(c);
  const bookId = c.req.param("bookId");
  await getOwnedBook(c.env.DB, userId, bookId);
  await deleteBookRow(c.env.DB, userId, bookId);

  return c.json(ok({ id: bookId, deleted: true }));
});

bookRoutes.patch("/:bookId/status", async (c) => {
  const userId = currentUserId(c);
  const bookId = c.req.param("bookId");
  await getOwnedBook(c.env.DB, userId, bookId);

  const body = (await c.req.json().catch(() => ({}))) as { status?: unknown };
  const status = parseBodyStatus(body.status);
  const updatedAt = new Date().toISOString();
  await updateBookRow(c.env.DB, userId, bookId, {
    status,
    updatedAt,
    lastReadAt: shouldUpdateLastReadAt(status) ? updatedAt : undefined
  });

  const updated = await getOwnedBook(c.env.DB, userId, bookId);
  return c.json(ok(toBook(updated)));
});

function currentUserId(c: { req: { header(name: string): string | undefined } }): string {
  return c.req.header("x-user-id") ?? LOCAL_USER_ID;
}

async function getOwnedBook(db: D1Database, userId: string, bookId: string): Promise<BookRow> {
  const book = await findBookRow(db, userId, bookId);

  if (!book) {
    throw new AppError(404, "BOOK_NOT_FOUND", "书籍不存在");
  }

  return book;
}

function toListBookRowsQuery(c: {
  req: {
    query(name: string): string | undefined;
  };
}): ListBookRowsQuery {
  return {
    q: c.req.query("q"),
    status: parseStatus(c.req.query("status")),
    tag: c.req.query("tag"),
    minRating: parseOptionalNumber(c.req.query("minRating")),
    maxRating: parseOptionalNumber(c.req.query("maxRating"))
  };
}

function toBook(row: BookRow): Book {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    author: row.author ?? undefined,
    sourceFileId: row.source_file_id ?? undefined,
    sourcePath: row.source_path ?? undefined,
    fileName: row.file_name,
    fileSize: row.file_size,
    rawObjectKey: row.raw_object_key ?? undefined,
    wordCount: row.word_count,
    chapterCount: row.chapter_count,
    status: row.status as BookStatus,
    rating: row.rating ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastReadAt: row.last_read_at ?? undefined
  };
}

function parseStatus(value: string | undefined): BookStatus | undefined {
  return value && isBookStatus(value) ? value : undefined;
}

function parseBodyStatus(value: unknown): BookStatus {
  if (!isBookStatus(value)) {
    throw new AppError(400, "INVALID_BOOK_STATUS", "阅读状态无效");
  }

  return value;
}

function parseBodyRating(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !isValidRatingValue(value)) {
    throw new AppError(400, "INVALID_RATING", "评分必须是 1-10 之间、步进 0.5 的数值");
  }

  return value;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
