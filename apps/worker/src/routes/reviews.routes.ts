import { Hono } from "hono";
import type { DropReason, Review } from "shared";
import { findBookRow } from "../db/repositories/book.repo";
import {
  findLatestDropReasonRow,
  findReviewRow,
  upsertLatestDropReasonRow,
  upsertReviewRow,
  type DropReasonRow,
  type ReviewRow
} from "../db/repositories/review.repo";
import type { AppEnv } from "../env";
import { AppError } from "../utils/errors";
import { createId } from "../utils/id";
import { fail, ok } from "../utils/response";

export const reviewsRoutes = new Hono<AppEnv>();

reviewsRoutes.get("/:bookId/drop-reason", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  await assertOwnedBook(c.env.DB, userId, bookId);

  const row = await findLatestDropReasonRow(c.env.DB, userId, bookId);
  return c.json(ok(row ? toDropReason(row) : null));
});

reviewsRoutes.put("/:bookId/drop-reason", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  await assertOwnedBook(c.env.DB, userId, bookId);

  const body = (await c.req.json().catch(() => ({}))) as {
    chapterId?: unknown;
    reason?: unknown;
    note?: unknown;
    mayReadLater?: unknown;
  };

  if (typeof body.reason !== "string" || !body.reason.trim()) {
    return c.json(fail("INVALID_DROP_REASON", "弃读原因不能为空"), 400);
  }

  const now = new Date().toISOString();
  await upsertLatestDropReasonRow(c.env.DB, {
    id: createId("drop_reason"),
    userId,
    bookId,
    chapterId: typeof body.chapterId === "string" && body.chapterId.trim() ? body.chapterId.trim() : null,
    reason: body.reason.trim(),
    note: typeof body.note === "string" ? body.note : null,
    mayReadLater: body.mayReadLater === true,
    createdAt: now,
    updatedAt: now
  });

  const row = await findLatestDropReasonRow(c.env.DB, userId, bookId);
  return c.json(ok(row ? toDropReason(row) : null));
});

reviewsRoutes.get("/:bookId/review", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  await assertOwnedBook(c.env.DB, userId, bookId);

  const row = await findReviewRow(c.env.DB, userId, bookId);
  return c.json(ok(row ? toReview(row) : null));
});

reviewsRoutes.put("/:bookId/review", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  await assertOwnedBook(c.env.DB, userId, bookId);

  const body = (await c.req.json().catch(() => ({}))) as {
    shortComment?: unknown;
    fullReview?: unknown;
    recommendReason?: unknown;
    warningPoint?: unknown;
    recommended?: unknown;
    targetReaders?: unknown;
  };
  const now = new Date().toISOString();

  await upsertReviewRow(c.env.DB, {
    id: createId("review"),
    userId,
    bookId,
    shortComment: toOptionalString(body.shortComment),
    fullReview: toOptionalString(body.fullReview),
    recommendReason: toOptionalString(body.recommendReason),
    warningPoint: toOptionalString(body.warningPoint),
    recommended: typeof body.recommended === "boolean" ? body.recommended : null,
    targetReaders: toOptionalString(body.targetReaders),
    createdAt: now,
    updatedAt: now
  });

  const row = await findReviewRow(c.env.DB, userId, bookId);
  return c.json(ok(row ? toReview(row) : null));
});

async function assertOwnedBook(db: D1Database, userId: string, bookId: string): Promise<void> {
  const book = await findBookRow(db, userId, bookId);

  if (!book) {
    throw new AppError(404, "BOOK_NOT_FOUND", "书籍不存在");
  }
}

function toDropReason(row: DropReasonRow): DropReason {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    chapterId: row.chapter_id ?? undefined,
    reason: row.reason,
    note: row.note ?? undefined,
    mayReadLater: row.may_read_later === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    shortComment: row.short_comment ?? undefined,
    fullReview: row.full_review ?? undefined,
    recommendReason: row.recommend_reason ?? undefined,
    warningPoint: row.warning_point ?? undefined,
    recommended: row.recommended === null ? undefined : row.recommended === 1,
    targetReaders: row.target_readers ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
