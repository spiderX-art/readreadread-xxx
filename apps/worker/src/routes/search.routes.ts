import { Hono } from "hono";
import { findBookRow } from "../db/repositories/book.repo";
import { listChapterRows } from "../db/repositories/chapter.repo";
import type { AppEnv } from "../env";
import { searchChapterText } from "../services/search/book-fulltext-search.service";
import { getTextObject } from "../services/storage/r2.service";
import { AppError } from "../utils/errors";
import { ok } from "../utils/response";

export const searchRoutes = new Hono<AppEnv>();

const LOCAL_USER_ID = "local-user";

searchRoutes.get("/:bookId/search", async (c) => {
  const userId = c.req.header("x-user-id") ?? LOCAL_USER_ID;
  const bookId = c.req.param("bookId");
  const q = c.req.query("q") ?? "";
  const book = await findBookRow(c.env.DB, userId, bookId);

  if (!book) {
    throw new AppError(404, "BOOK_NOT_FOUND", "书籍不存在");
  }

  const chapters = await listChapterRows(c.env.DB, bookId);
  const hits = [];

  for (const chapter of chapters) {
    const content = await getTextObject(c.env.BOOK_BUCKET, chapter.object_key);

    if (content === null) {
      continue;
    }

    hits.push(...searchChapterText(chapter.id, chapter.title, content, q));
  }

  return c.json(
    ok({
      bookId,
      q,
      items: hits,
      total: hits.length
    })
  );
});
