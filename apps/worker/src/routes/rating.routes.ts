import { Hono } from "hono";
import type { BookRating, RatingField } from "shared";
import { RATING_FIELDS } from "shared";
import { findBookRow, updateBookRow } from "../db/repositories/book.repo";
import { findRatingRow, upsertRatingRow, type RatingRow } from "../db/repositories/rating.repo";
import type { AppEnv } from "../env";
import { AppError } from "../utils/errors";
import { createId } from "../utils/id";
import { fail, ok } from "../utils/response";
import { isValidRatingValue } from "../validators/rating.validator";

export const ratingRoutes = new Hono<AppEnv>();

ratingRoutes.get("/:bookId/rating", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  await assertOwnedBook(c.env.DB, userId, bookId);

  const rating = await findRatingRow(c.env.DB, userId, bookId);
  return c.json(ok(rating ? toRating(rating) : null));
});

ratingRoutes.put("/:bookId/rating", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  await assertOwnedBook(c.env.DB, userId, bookId);

  const body = (await c.req.json<Partial<Record<RatingField, number | null>>>().catch(() => ({}))) as Partial<
    Record<RatingField, number | null>
  >;
  const invalidField = RATING_FIELDS.find((field) => {
    const value = body[field];
    return value !== undefined && value !== null && !isValidRatingValue(value);
  });

  if (invalidField) {
    return c.json(fail("INVALID_RATING", "评分必须是 1-10 之间、步进 0.5 的数值"), 400);
  }

  const now = new Date().toISOString();
  await upsertRatingRow(c.env.DB, {
    id: createId("rating"),
    userId,
    bookId,
    overall: body.overall,
    writing: body.writing,
    createdAt: now,
    updatedAt: now
  });
  await updateBookRow(c.env.DB, userId, bookId, {
    rating: body.overall ?? null,
    updatedAt: now
  });

  const saved = await findRatingRow(c.env.DB, userId, bookId);
  return c.json(ok(saved ? toRating(saved) : null));
});

async function assertOwnedBook(db: D1Database, userId: string, bookId: string): Promise<void> {
  const book = await findBookRow(db, userId, bookId);

  if (!book) {
    throw new AppError(404, "BOOK_NOT_FOUND", "书籍不存在");
  }
}

function toRating(row: RatingRow): BookRating {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    overall: row.overall ?? undefined,
    plot: row.plot ?? undefined,
    writing: row.writing ?? undefined,
    character: row.character ?? undefined,
    pacing: row.pacing ?? undefined,
    worldbuilding: row.worldbuilding ?? undefined,
    satisfaction: row.satisfaction ?? undefined,
    endingStability: row.ending_stability ?? undefined,
    rereadValue: row.reread_value ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
