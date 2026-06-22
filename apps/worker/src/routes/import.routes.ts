import { Hono } from "hono";
import type { ImportPreview } from "shared";
import { findImportJobRow, type ImportJobRow } from "../db/repositories/import-job.repo";
import type { AppEnv } from "../env";
import { parseTxtChapters } from "../services/import/chapter-parser.service";
import { importTxtBook, previewTxtImport } from "../services/import/txt-import.service";
import { AppError } from "../utils/errors";
import { fail, ok } from "../utils/response";

interface ImportPreviewRequest {
  sourceFileId?: string;
  sourcePath?: string;
  fileName?: string;
  fileSize?: number;
  sampleText?: string;
  text?: string;
  content?: string;
  title?: string;
  author?: string;
}

export const importRoutes = new Hono<AppEnv>();

importRoutes.post("/preview", async (c) => {
  const body = (await c.req.json<ImportPreviewRequest>().catch(() => ({}))) as ImportPreviewRequest;

  if (!body.sourceFileId || !body.sourcePath || !body.fileName) {
    return c.json(fail("INVALID_IMPORT_PREVIEW", "缺少导入预览所需文件信息"), 400);
  }

  const parsed = previewTxtImport(body.fileName);
  const chapters = body.sampleText ? parseTxtChapters(body.sampleText) : [];
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

  const text = body.text ?? body.content ?? body.sampleText;

  if (typeof text !== "string" || !text.trim()) {
    return c.json(fail("INVALID_TXT_IMPORT", "缺少 TXT 正文"), 400);
  }

  const fileSize =
    typeof body.fileSize === "number" && Number.isFinite(body.fileSize)
      ? body.fileSize
      : new TextEncoder().encode(text).byteLength;
  const result = await importTxtBook(c.env.DB, c.env.BOOK_BUCKET, {
    userId: c.req.header("x-user-id") ?? "local-user",
    sourceFileId: body.sourceFileId,
    sourcePath: body.sourcePath,
    fileName: body.fileName,
    fileSize,
    text,
    title: body.title,
    author: body.author
  });

  return c.json(ok(result), 201);
});

importRoutes.get("/jobs/:jobId", async (c) => {
  const job = await findImportJobRow(c.env.DB, c.req.param("jobId"));

  if (!job) {
    throw new AppError(404, "IMPORT_JOB_NOT_FOUND", "导入任务不存在");
  }

  return c.json(ok(toImportJob(job)));
});

function toImportJob(job: ImportJobRow) {
  return {
    id: job.id,
    userId: job.user_id,
    sourceFileId: job.source_file_id,
    sourcePath: job.source_path,
    fileName: job.file_name,
    status: job.status,
    message: job.message ?? undefined,
    bookId: job.book_id ?? undefined,
    createdAt: job.created_at,
    updatedAt: job.updated_at
  };
}
