import { Hono } from "hono";
import type { RatingField } from "shared";
import { RATING_FIELDS } from "shared";
import type { AppEnv } from "../env";
import { fail, ok } from "../utils/response";
import { isValidRatingValue } from "../validators/rating.validator";

export const ratingRoutes = new Hono<AppEnv>();

ratingRoutes.get("/:bookId/rating", (c) =>
  c.json(
    ok({
      bookId: c.req.param("bookId")
    })
  )
);

ratingRoutes.put("/:bookId/rating", async (c) => {
  const body = (await c.req.json<Partial<Record<RatingField, number>>>().catch(() => ({}))) as Partial<
    Record<RatingField, number>
  >;
  const invalidField = RATING_FIELDS.find((field) => {
    const value = body[field];
    return value !== undefined && !isValidRatingValue(value);
  });

  if (invalidField) {
    return c.json(fail("INVALID_RATING", "评分必须是 1-10 之间、步进 0.5 的数值"), 400);
  }

  return c.json(ok({ bookId: c.req.param("bookId"), rating: body }));
});
