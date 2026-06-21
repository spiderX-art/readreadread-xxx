import { Hono } from "hono";
import type { AppEnv } from "../env";
import { ok } from "../utils/response";

export const tagRoutes = new Hono<AppEnv>();

tagRoutes.get("/tags", (c) => c.json(ok({ items: [], total: 0 })));

tagRoutes.post("/tags", (c) => c.json(ok({ created: true }), 201));

tagRoutes.post("/books/:bookId/tags", (c) =>
  c.json(
    ok({
      bookId: c.req.param("bookId"),
      attached: true
    }),
    201
  )
);

tagRoutes.delete("/books/:bookId/tags/:tagId", (c) =>
  c.json(
    ok({
      bookId: c.req.param("bookId"),
      tagId: c.req.param("tagId"),
      detached: true
    })
  )
);
