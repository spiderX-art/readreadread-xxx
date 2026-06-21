import { Hono } from "hono";
import type { AppEnv } from "../env";
import { ok } from "../utils/response";

export const readerRoutes = new Hono<AppEnv>();

readerRoutes.get("/:bookId/chapters", (c) =>
  c.json(
    ok({
      bookId: c.req.param("bookId"),
      items: [],
      total: 0
    })
  )
);

readerRoutes.get("/:bookId/chapters/:chapterId", (c) =>
  c.json(
    ok({
      bookId: c.req.param("bookId"),
      chapterId: c.req.param("chapterId"),
      title: "未导入章节",
      content: ""
    })
  )
);

readerRoutes.get("/:bookId/progress", (c) =>
  c.json(
    ok({
      bookId: c.req.param("bookId"),
      chapterId: undefined,
      scrollPosition: 0,
      progressPercent: 0
    })
  )
);

readerRoutes.post("/:bookId/progress", (c) =>
  c.json(
    ok({
      bookId: c.req.param("bookId"),
      saved: true
    })
  )
);
