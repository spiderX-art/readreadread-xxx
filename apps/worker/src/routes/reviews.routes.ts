import { Hono } from "hono";
import type { AppEnv } from "../env";
import { ok } from "../utils/response";

export const reviewsRoutes = new Hono<AppEnv>();

reviewsRoutes.get("/:bookId/drop-reason", (c) =>
  c.json(
    ok({
      bookId: c.req.param("bookId")
    })
  )
);

reviewsRoutes.put("/:bookId/drop-reason", (c) =>
  c.json(
    ok({
      bookId: c.req.param("bookId"),
      saved: true
    })
  )
);

reviewsRoutes.get("/:bookId/review", (c) =>
  c.json(
    ok({
      bookId: c.req.param("bookId")
    })
  )
);

reviewsRoutes.put("/:bookId/review", (c) =>
  c.json(
    ok({
      bookId: c.req.param("bookId"),
      saved: true
    })
  )
);
