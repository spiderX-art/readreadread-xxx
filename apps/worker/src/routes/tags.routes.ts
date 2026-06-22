import { Hono } from "hono";
import type { Tag, TagType } from "shared";
import { TAG_TYPES } from "shared";
import { findBookRow } from "../db/repositories/book.repo";
import {
  attachTagToBookRow,
  createTagRow,
  detachTagFromBookRow,
  findTagRow,
  listTagRows,
  type TagRow
} from "../db/repositories/tag.repo";
import type { AppEnv } from "../env";
import { AppError } from "../utils/errors";
import { createId } from "../utils/id";
import { ok } from "../utils/response";

export const tagRoutes = new Hono<AppEnv>();

tagRoutes.get("/tags", async (c) => {
  const tags = await listTagRows(c.env.DB, c.get("userId"));

  return c.json(ok({ items: tags.map(toTag), total: tags.length }));
});

tagRoutes.post("/tags", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => ({}))) as { name?: unknown; type?: unknown };
  const name = parseTagName(body.name);
  const type = parseTagType(body.type);
  const now = new Date().toISOString();
  const id = createId("tag");

  try {
    await createTagRow(c.env.DB, {
      id,
      userId,
      name,
      type,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(409, "TAG_EXISTS", "标签已存在");
    }

    throw error;
  }

  const created = await findTagRow(c.env.DB, userId, id);
  return c.json(ok(toTag(created!)), 201);
});

tagRoutes.post("/books/:bookId/tags", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  const body = (await c.req.json().catch(() => ({}))) as { tagId?: unknown };
  const tagId = parseTagId(body.tagId);

  await getOwnedBook(c.env.DB, userId, bookId);
  await getOwnedTag(c.env.DB, userId, tagId);
  await attachTagToBookRow(c.env.DB, {
    bookId,
    tagId,
    createdAt: new Date().toISOString()
  });

  return c.json(ok({ bookId, tagId, attached: true }), 201);
});

tagRoutes.delete("/books/:bookId/tags/:tagId", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  const tagId = c.req.param("tagId");

  await getOwnedBook(c.env.DB, userId, bookId);
  await getOwnedTag(c.env.DB, userId, tagId);
  await detachTagFromBookRow(c.env.DB, bookId, tagId);

  return c.json(ok({ bookId, tagId, detached: true }));
});

async function getOwnedBook(db: D1Database, userId: string, bookId: string) {
  const book = await findBookRow(db, userId, bookId);

  if (!book) {
    throw new AppError(404, "BOOK_NOT_FOUND", "书籍不存在");
  }

  return book;
}

async function getOwnedTag(db: D1Database, userId: string, tagId: string): Promise<TagRow> {
  const tag = await findTagRow(db, userId, tagId);

  if (!tag) {
    throw new AppError(404, "TAG_NOT_FOUND", "标签不存在");
  }

  return tag;
}

function parseTagName(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, "INVALID_TAG_NAME", "标签名称不能为空");
  }

  const name = value.trim();

  if (name.length > 24) {
    throw new AppError(422, "TAG_NAME_TOO_LONG", "标签名称不能超过 24 个字符");
  }

  return name;
}

function parseTagId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, "INVALID_TAG_ID", "标签 ID 不能为空");
  }

  return value.trim();
}

function parseTagType(value: unknown): TagType {
  if (value === undefined) {
    return "custom";
  }

  if (typeof value !== "string" || !TAG_TYPES.includes(value as TagType)) {
    throw new AppError(400, "INVALID_TAG_TYPE", "标签类型无效");
  }

  return value as TagType;
}

function toTag(row: TagRow): Tag {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type as TagType,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /unique|constraint/i.test(error.message);
}
