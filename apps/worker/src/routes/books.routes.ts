import { Hono } from "hono";
import type { Book, BookSearchQuery, BookStatus, Tag, TagType } from "shared";
import {
  deleteBookRow,
  findBookRow,
  listBookRows,
  updateBookRow,
  type BookRow,
  type ListBookRowsQuery
} from "../db/repositories/book.repo";
import { listTagRowsForBooks, type BookTagRow } from "../db/repositories/tag.repo";
import type { AppEnv } from "../env";
import { shouldUpdateLastReadAt } from "../services/books/book.service";
import { AppError } from "../utils/errors";
import { ok } from "../utils/response";
import { isValidRatingValue } from "../validators/rating.validator";
import { isBookStatus } from "../validators/books.validator";

export const bookRoutes = new Hono<AppEnv>();

bookRoutes.get("/", async (c) => {
  const query = toListBookRowsQuery(c);
  const books = await listBookRows(c.env.DB, c.get("userId"), query);
  const tagsByBookId = await getTagsByBookId(c.env.DB, c.get("userId"), books);

  return c.json(ok({ items: books.map((book) => toBook(book, tagsByBookId.get(book.id))), total: books.length }));
});

bookRoutes.get("/search", async (c) => {
  const query: BookSearchQuery = {
    q: c.req.query("q"),
    status: parseStatus(c.req.query("status")),
    tag: c.req.query("tag"),
    minRating: parseOptionalNumber(c.req.query("minRating")),
    maxRating: parseOptionalNumber(c.req.query("maxRating"))
  };
  const books = await listBookRows(c.env.DB, c.get("userId"), query);
  const tagsByBookId = await getTagsByBookId(c.env.DB, c.get("userId"), books);

  return c.json(ok({ query, items: books.map((book) => toBook(book, tagsByBookId.get(book.id))), total: books.length }));
});

bookRoutes.get("/:bookId", async (c) => {
  const book = await getOwnedBook(c.env.DB, c.get("userId"), c.req.param("bookId"));
  const tagsByBookId = await getTagsByBookId(c.env.DB, c.get("userId"), [book]);

  return c.json(ok(toBook(book, tagsByBookId.get(book.id))));
});

bookRoutes.patch("/:bookId", async (c) => {
  const userId = c.get("userId");
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
  const tagsByBookId = await getTagsByBookId(c.env.DB, userId, [updated]);
  return c.json(ok(toBook(updated, tagsByBookId.get(updated.id))));
});

bookRoutes.delete("/:bookId", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  await getOwnedBook(c.env.DB, userId, bookId);
  await deleteBookRow(c.env.DB, userId, bookId);

  return c.json(ok({ id: bookId, deleted: true }));
});

bookRoutes.patch("/:bookId/status", async (c) => {
  const userId = c.get("userId");
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
  const tagsByBookId = await getTagsByBookId(c.env.DB, userId, [updated]);
  return c.json(ok(toBook(updated, tagsByBookId.get(updated.id))));
});

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

async function getTagsByBookId(
  db: D1Database,
  userId: string,
  books: BookRow[]
): Promise<Map<string, BookTagRow[]>> {
  const tags = await listTagRowsForBooks(
    db,
    userId,
    books.map((book) => book.id)
  );
  const tagsByBookId = new Map<string, BookTagRow[]>();

  for (const tag of tags) {
    const bookTags = tagsByBookId.get(tag.book_id) ?? [];
    bookTags.push(tag);
    tagsByBookId.set(tag.book_id, bookTags);
  }

  return tagsByBookId;
}

function toBook(row: BookRow, tags: BookTagRow[] = []): Book {
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
    lastReadAt: row.last_read_at ?? undefined,
    tags: tags.map(toTag)
  };
}

function toTag(row: BookTagRow): Tag {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type as TagType,
    createdAt: row.created_at,
    updatedAt: row.updated_at
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
