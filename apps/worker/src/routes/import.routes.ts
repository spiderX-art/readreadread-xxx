import { Hono } from "hono";
import { parseChapters, parseTitleAuthor } from "parser";
import type { ImportPreview } from "shared";
import type { AppEnv } from "../env";
import { fail, ok } from "../utils/response";

interface ImportPreviewRequest {
  sourceFileId?: string;
  sourcePath?: string;
  fileName?: string;
  fileSize?: number;
  sampleText?: string;
}

export const importRoutes = new Hono<AppEnv>();

importRoutes.post("/preview", async (c) => {
  const body = (await c.req.json<ImportPreviewRequest>().catch(() => ({}))) as ImportPreviewRequest;

  if (!body.sourceFileId || !body.sourcePath || !body.fileName) {
    return c.json(fail("INVALID_IMPORT_PREVIEW", "缺少导入预览所需文件信息"), 400);
  }

  const parsed = parseTitleAuthor(body.fileName);
  const chapters = body.sampleText ? parseChapters(body.sampleText) : [];
  const preview: ImportPreview = {
    sourceFileId: body.sourceFileId,
    sourcePath: body.sourcePath,
    fileName: body.fileName,
    fileSize: body.fileSize ?? 0,
    title: parsed.title,
    author: parsed.author,
    versionTag: parsed.versionTag,
    estimatedChapterCount: chapters.length,
    sampleChapterTitles: chapters.slice(0, 5).map((chapter) => chapter.title)
  };

  return c.json(ok(preview));
});

importRoutes.post("/txt", async (c) => {
  const body = (await c.req.json<ImportPreviewRequest>().catch(() => ({}))) as ImportPreviewRequest;

  if (!body.sourceFileId || !body.sourcePath || !body.fileName) {
    return c.json(fail("INVALID_TXT_IMPORT", "缺少 TXT 导入所需文件信息"), 400);
  }

  return c.json(
    ok({
      status: "pending",
      sourceFileId: body.sourceFileId
    }),
    202
  );
});

importRoutes.get("/jobs/:jobId", (c) =>
  c.json(
    ok({
      id: c.req.param("jobId"),
      status: "pending"
    })
  )
);
