import { Hono } from "hono";
import type { Book, BookSearchQuery } from "shared";
import type { AppEnv } from "../env";
import { ok } from "../utils/response";

export const bookRoutes = new Hono<AppEnv>();

bookRoutes.get("/", (c) => {
  const books: Book[] = [];

  return c.json(ok({ items: books, total: books.length }));
});

bookRoutes.get("/search", (c) => {
  const query: BookSearchQuery = {
    q: c.req.query("q"),
    tag: c.req.query("tag"),
    minRating: parseOptionalNumber(c.req.query("minRating")),
    maxRating: parseOptionalNumber(c.req.query("maxRating"))
  };

  return c.json(ok({ query, items: [], total: 0 }));
});

bookRoutes.get("/:bookId", (c) =>
  c.json(
    ok({
      id: c.req.param("bookId")
    })
  )
);

bookRoutes.patch("/:bookId", (c) =>
  c.json(
    ok({
      id: c.req.param("bookId"),
      updated: true
    })
  )
);

bookRoutes.delete("/:bookId", (c) =>
  c.json(
    ok({
      id: c.req.param("bookId"),
      deleted: true
    })
  )
);

bookRoutes.patch("/:bookId/status", (c) =>
  c.json(
    ok({
      id: c.req.param("bookId"),
      updated: true
    })
  )
);

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
