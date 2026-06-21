import { Hono } from "hono";
import type { AppEnv } from "../env";
import { ok } from "../utils/response";

export const searchRoutes = new Hono<AppEnv>();

searchRoutes.get("/:bookId/search", (c) =>
  c.json(
    ok({
      bookId: c.req.param("bookId"),
      q: c.req.query("q") ?? "",
      items: [],
      total: 0
    })
  )
);
