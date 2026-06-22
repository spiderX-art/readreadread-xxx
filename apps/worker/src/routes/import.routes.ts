import { Hono, type Context } from "hono";
import type { ImportPreview } from "shared";
import { findBookRowBySourceFileId } from "../db/repositories/book.repo";
import { findImportJobRow, type ImportJobRow } from "../db/repositories/import-job.repo";
import type { AppEnv } from "../env";
import { downloadBaiduTxtFile } from "../services/baidu/baidu-file.service";
import { getValidBaiduAccessToken } from "../services/baidu/baidu-token.service";
import { parseTxtChapters } from "../services/import/chapter-parser.service";
import {
  createRetrySyncImportJob,
  createSyncImportJob,
  getSyncImportJob,
  runSyncImportJob,
  syncPreviewImports
} from "../services/import/sync-import.service";
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

interface SyncPreviewRequest {
  path?: string;
}

export const importRoutes = new Hono<AppEnv>();

importRoutes.post("/sync-preview", async (c) => {
  const body = (await c.req.json<SyncPreviewRequest>().catch(() => ({}))) as SyncPreviewRequest;
  const result = await syncPreviewImports(c.env.DB, c.env.BOOK_BUCKET, c.env, {
    userId: c.get("userId"),
    path: body.path
  });

  return c.json(ok(result));
});

importRoutes.post("/sync-jobs", async (c) => {
  const body = (await c.req.json<SyncPreviewRequest>().catch(() => ({}))) as SyncPreviewRequest;
  const job = await createSyncImportJob(c.env.DB, {
    userId: c.get("userId"),
    path: body.path
  });
  const runPromise = runSyncImportJob(c.env.DB, c.env.BOOK_BUCKET, c.env, {
    userId: c.get("userId"),
    jobId: job.id,
    path: job.path
  });

  c.executionCtx.waitUntil(runPromise);

  return c.json(ok({ jobId: job.id, job }), 202);
});

importRoutes.get("/sync-jobs/:jobId", async (c) => {
  const job = await getSyncImportJob(c.env.DB, c.req.param("jobId"), c.get("userId"));

  if (!job) {
    throw new AppError(404, "SYNC_JOB_NOT_FOUND", "同步任务不存在");
  }

  return c.json(ok(job));
});

importRoutes.post("/sync-jobs/:jobId/items/:itemId/retry", async (c) => {
  const { job, file } = await createRetrySyncImportJob(
    c.env.DB,
    c.req.param("jobId"),
    c.req.param("itemId"),
    c.get("userId")
  );
  const runPromise = runSyncImportJob(c.env.DB, c.env.BOOK_BUCKET, c.env, {
    userId: c.get("userId"),
    jobId: job.id,
    path: job.path,
    files: [file]
  });

  c.executionCtx.waitUntil(runPromise);

  return c.json(ok({ jobId: job.id, job }), 202);
});

importRoutes.post("/preview", async (c) => {
  const body = (await c.req.json<ImportPreviewRequest>().catch(() => ({}))) as ImportPreviewRequest;

  if (!body.sourceFileId || !body.sourcePath || !body.fileName) {
    return c.json(fail("INVALID_IMPORT_PREVIEW", "缺少导入预览所需文件信息"), 400);
  }

  const sampleText = body.sampleText ?? (await getBaiduTxtTextIfNeeded(c, body));
  const parsed = previewTxtImport(body.fileName);
  const chapters = sampleText ? parseTxtChapters(sampleText) : [];
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

  await assertNotImported(c, body.sourceFileId);

  let text = body.text ?? body.content ?? body.sampleText;
  let fileName = body.fileName;
  let sourcePath = body.sourcePath;
  let fileSize = body.fileSize;

  if (typeof text !== "string" || !text.trim()) {
    const downloaded = await downloadBaiduTxtForRequest(c, body);
    text = downloaded.text;
    fileName = downloaded.fileName;
    sourcePath = downloaded.path;
    fileSize = downloaded.fileSize;
  }

  const resolvedFileSize =
    typeof fileSize === "number" && Number.isFinite(fileSize)
      ? fileSize
      : new TextEncoder().encode(text).byteLength;
  const result = await importTxtBook(c.env.DB, c.env.BOOK_BUCKET, {
    userId: c.get("userId"),
    sourceFileId: body.sourceFileId,
    sourcePath,
    fileName,
    fileSize: resolvedFileSize,
    text,
    title: body.title,
    author: body.author
  });

  return c.json(ok(result), 201);
});

importRoutes.get("/jobs/:jobId", async (c) => {
  const job = await findImportJobRow(c.env.DB, c.req.param("jobId"));

  if (!job || job.user_id !== c.get("userId")) {
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

async function getBaiduTxtTextIfNeeded(c: Context<AppEnv>, body: ImportPreviewRequest) {
  if (!body.sourceFileId) {
    return undefined;
  }

  const downloaded = await downloadBaiduTxtForRequest(c, body);
  return downloaded.text;
}

async function assertNotImported(c: Context<AppEnv>, sourceFileId: string): Promise<void> {
  const existingBook = await findBookRowBySourceFileId(c.env.DB, c.get("userId"), sourceFileId);

  if (existingBook) {
    throw new AppError(409, "BOOK_ALREADY_IMPORTED", "该网盘文件已导入书架", { bookId: existingBook.id });
  }
}

async function downloadBaiduTxtForRequest(
  c: Context<AppEnv>,
  body: ImportPreviewRequest
) {
  const accessToken = await getValidBaiduAccessToken(c.env.DB, c.env, c.get("userId"));
  return downloadBaiduTxtFile(accessToken, {
    fsId: body.sourceFileId!,
    fileName: body.fileName,
    fileSize: body.fileSize
  });
}
