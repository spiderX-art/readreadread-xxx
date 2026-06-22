import type { SyncImportFailure, SyncImportItem, SyncImportResult, SyncJob, SyncJobItem } from "shared";
import { findBookRowBySourceFileId, listBookRowsBySourceFileIds } from "../../db/repositories/book.repo";
import {
  createSyncJobItemRow,
  createSyncJobRow,
  findSyncJobItemRow,
  findSyncJobRow,
  listSyncJobItemRows,
  updateSyncJobCompleted,
  updateSyncJobFailed,
  updateSyncJobImporting,
  updateSyncJobItemFailed,
  updateSyncJobItemImported,
  updateSyncJobItemImporting,
  updateSyncJobItemSkipped,
  updateSyncJobProgress,
  updateSyncJobScanning,
  updateSyncJobScanResult,
  type SyncJobCounters,
  type SyncJobItemRow,
  type SyncJobRow
} from "../../db/repositories/sync-job.repo";
import { ensureUserRow } from "../../db/repositories/user.repo";
import type { Bindings } from "../../env";
import { downloadBaiduTxtFile, listBaiduNetdiskFiles } from "../baidu/baidu-file.service";
import { getValidBaiduAccessToken } from "../baidu/baidu-token.service";
import { AppError } from "../../utils/errors";
import { createId } from "../../utils/id";
import { importTxtBook } from "./txt-import.service";

const DEFAULT_SYNC_PATH = "/小说";

export interface SyncPreviewInput {
  userId: string;
  path?: string;
}

export interface CreateSyncJobInput {
  userId: string;
  path?: string;
}

export interface RunSyncJobInput {
  userId: string;
  jobId: string;
  path?: string;
  files?: SyncJobSourceFile[];
}

export interface SyncJobSourceFile {
  sourceFileId: string;
  sourcePath: string;
  fileName: string;
  fileSize: number;
}

export async function createSyncImportJob(db: D1Database, input: CreateSyncJobInput): Promise<SyncJob> {
  const now = new Date().toISOString();
  const jobId = createId("sync_job");
  const path = normalizeSyncPath(input.path);

  await ensureUserRow(db, input.userId, now);
  await createSyncJobRow(db, {
    id: jobId,
    userId: input.userId,
    path,
    createdAt: now,
    updatedAt: now
  });

  const job = await getSyncImportJob(db, jobId, input.userId);

  if (!job) {
    throw new AppError(500, "SYNC_JOB_CREATE_FAILED", "同步任务创建失败");
  }

  return job;
}

export async function getSyncImportJob(db: D1Database, jobId: string, userId: string): Promise<SyncJob | null> {
  const job = await findSyncJobRow(db, jobId);

  if (!job || job.user_id !== userId) {
    return null;
  }

  const items = await listSyncJobItemRows(db, jobId);
  return toSyncJob(job, items);
}

export async function createRetrySyncImportJob(
  db: D1Database,
  failedJobId: string,
  itemId: string,
  userId: string
): Promise<{ job: SyncJob; file: SyncJobSourceFile }> {
  const failedJob = await findSyncJobRow(db, failedJobId);

  if (!failedJob || failedJob.user_id !== userId) {
    throw new AppError(404, "SYNC_JOB_NOT_FOUND", "同步任务不存在");
  }

  const item = await findSyncJobItemRow(db, failedJobId, itemId);

  if (!item || item.user_id !== userId) {
    throw new AppError(404, "SYNC_JOB_ITEM_NOT_FOUND", "同步文件不存在");
  }

  if (item.status !== "failed") {
    throw new AppError(409, "SYNC_JOB_ITEM_NOT_FAILED", "只有失败文件可以重试");
  }

  const job = await createSyncImportJob(db, {
    userId,
    path: item.source_path
  });

  return {
    job,
    file: {
      sourceFileId: item.source_file_id,
      sourcePath: item.source_path,
      fileName: item.file_name,
      fileSize: item.file_size
    }
  };
}

export async function runSyncImportJob(
  db: D1Database,
  bucket: R2Bucket,
  env: Bindings,
  input: RunSyncJobInput
): Promise<void> {
  const path = normalizeSyncPath(input.path);

  try {
    await updateSyncJobScanning(db, input.jobId, new Date().toISOString());

    const accessToken = await getValidBaiduAccessToken(db, env, input.userId);
    const scannedFiles = input.files ? undefined : await listBaiduNetdiskFiles(accessToken, path);
    const sourceFiles =
      input.files ??
      (scannedFiles ?? [])
        .filter((file) => !file.isDir && file.ext?.toLowerCase() === "txt")
        .map((file) => ({
          sourceFileId: file.fsId,
          sourcePath: file.path,
          fileName: file.name,
          fileSize: file.size
        }));
    const scannedCount = input.files ? input.files.length : (scannedFiles?.length ?? sourceFiles.length);
    const importedBooks = await listBookRowsBySourceFileIds(
      db,
      input.userId,
      sourceFiles.map((file) => file.sourceFileId)
    );
    const importedBookIdsBySourceFileId = new Map<string, string>();

    for (const book of importedBooks) {
      if (book.source_file_id && !importedBookIdsBySourceFileId.has(book.source_file_id)) {
        importedBookIdsBySourceFileId.set(book.source_file_id, book.id);
      }
    }

    const counters: SyncJobCounters = {
      processedCount: 0,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0
    };
    const pendingItems: Array<{ itemId: string; file: SyncJobSourceFile }> = [];

    for (const file of sourceFiles) {
      const now = new Date().toISOString();
      const itemId = createId("sync_item");
      const existingBookId = importedBookIdsBySourceFileId.get(file.sourceFileId);

      await createSyncJobItemRow(db, {
        id: itemId,
        jobId: input.jobId,
        userId: input.userId,
        sourceFileId: file.sourceFileId,
        sourcePath: file.sourcePath,
        fileName: file.fileName,
        fileSize: file.fileSize,
        status: existingBookId ? "skipped" : "pending",
        message: existingBookId ? "已在书架中" : undefined,
        bookId: existingBookId,
        createdAt: now,
        updatedAt: now
      });

      if (existingBookId) {
        counters.processedCount += 1;
        counters.skippedCount += 1;
      } else {
        pendingItems.push({ itemId, file });
      }
    }

    await updateSyncJobScanResult(db, input.jobId, {
      scannedCount,
      candidateCount: sourceFiles.length,
      counters,
      updatedAt: new Date().toISOString()
    });

    for (const item of pendingItems) {
      await importSyncJobItem(db, bucket, accessToken, input.userId, input.jobId, item.itemId, item.file, counters);
    }

    await updateSyncJobCompleted(db, input.jobId, counters, new Date().toISOString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "自动同步失败";
    await updateSyncJobFailed(db, input.jobId, message, new Date().toISOString());
  }
}

export async function syncPreviewImports(
  db: D1Database,
  bucket: R2Bucket,
  env: Bindings,
  input: SyncPreviewInput
): Promise<SyncImportResult> {
  const path = normalizeSyncPath(input.path);
  const accessToken = await getValidBaiduAccessToken(db, env, input.userId);
  const files = await listBaiduNetdiskFiles(accessToken, path);
  const txtFiles = files.filter((file) => !file.isDir && file.ext?.toLowerCase() === "txt");
  const importedBooks = await listBookRowsBySourceFileIds(
    db,
    input.userId,
    txtFiles.map((file) => file.fsId)
  );
  const importedBookIdsBySourceFileId = new Map<string, string>();

  for (const book of importedBooks) {
    if (book.source_file_id && !importedBookIdsBySourceFileId.has(book.source_file_id)) {
      importedBookIdsBySourceFileId.set(book.source_file_id, book.id);
    }
  }

  const imported: SyncImportItem[] = [];
  const skipped: SyncImportItem[] = [];
  const failed: SyncImportFailure[] = [];

  for (const file of txtFiles) {
    const existingBookId = importedBookIdsBySourceFileId.get(file.fsId);
    const baseItem = {
      sourceFileId: file.fsId,
      sourcePath: file.path,
      fileName: file.name,
      fileSize: file.size
    };

    if (existingBookId) {
      skipped.push({
        ...baseItem,
        bookId: existingBookId
      });
      continue;
    }

    try {
      const downloaded = await downloadBaiduTxtFile(accessToken, {
        fsId: file.fsId,
        fileName: file.name,
        fileSize: file.size
      });
      const result = await importTxtBook(db, bucket, {
        userId: input.userId,
        sourceFileId: file.fsId,
        sourcePath: downloaded.path || file.path,
        fileName: downloaded.fileName || file.name,
        fileSize: downloaded.fileSize || file.size,
        text: downloaded.text
      });

      imported.push({
        ...baseItem,
        sourcePath: result.book.sourcePath ?? baseItem.sourcePath,
        fileName: result.book.fileName,
        fileSize: result.book.fileSize,
        bookId: result.book.id,
        title: result.book.title
      });
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
      const message = error instanceof Error ? error.message : "自动导入失败";

      failed.push({
        ...baseItem,
        code,
        message
      });
    }
  }

  return {
    path,
    scannedCount: files.length,
    candidateCount: txtFiles.length,
    imported,
    skipped,
    failed
  };
}

function normalizeSyncPath(path: string | undefined): string {
  const trimmed = path?.trim();

  if (!trimmed) {
    return DEFAULT_SYNC_PATH;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function importSyncJobItem(
  db: D1Database,
  bucket: R2Bucket,
  accessToken: string,
  userId: string,
  jobId: string,
  itemId: string,
  file: SyncJobSourceFile,
  counters: SyncJobCounters
): Promise<void> {
  const startedAt = new Date().toISOString();

  await updateSyncJobImporting(db, jobId, file.sourceFileId, startedAt);
  await updateSyncJobItemImporting(db, itemId, startedAt);

  try {
    const downloaded = await downloadBaiduTxtFile(accessToken, {
      fsId: file.sourceFileId,
      fileName: file.fileName,
      fileSize: file.fileSize
    });
    const result = await importTxtBook(db, bucket, {
      userId,
      sourceFileId: file.sourceFileId,
      sourcePath: downloaded.path || file.sourcePath,
      fileName: downloaded.fileName || file.fileName,
      fileSize: downloaded.fileSize || file.fileSize,
      text: downloaded.text
    });
    const importedAt = new Date().toISOString();

    await updateSyncJobItemImported(db, itemId, {
      bookId: result.book.id,
      title: result.book.title,
      sourcePath: result.book.sourcePath ?? file.sourcePath,
      fileName: result.book.fileName,
      fileSize: result.book.fileSize,
      updatedAt: importedAt
    });
    counters.processedCount += 1;
    counters.importedCount += 1;
    await updateSyncJobProgress(db, jobId, counters, importedAt);
  } catch (error) {
    const existingBookId = getExistingBookIdFromError(error);

    if (existingBookId) {
      const existingBook = await findBookRowBySourceFileId(db, userId, file.sourceFileId);
      const skippedAt = new Date().toISOString();

      await updateSyncJobItemSkipped(db, itemId, {
        bookId: existingBookId,
        title: existingBook?.title,
        message: "已在书架中",
        updatedAt: skippedAt
      });
      counters.processedCount += 1;
      counters.skippedCount += 1;
      await updateSyncJobProgress(db, jobId, counters, skippedAt);
      return;
    }

    const failedAt = new Date().toISOString();
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
    const message = error instanceof Error ? error.message : "自动导入失败";

    await updateSyncJobItemFailed(db, itemId, {
      code,
      message,
      updatedAt: failedAt
    });
    counters.processedCount += 1;
    counters.failedCount += 1;
    await updateSyncJobProgress(db, jobId, counters, failedAt);
  }
}

function getExistingBookIdFromError(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "BOOK_ALREADY_IMPORTED" &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "bookId" in error.data &&
    typeof error.data.bookId === "string"
  ) {
    return error.data.bookId;
  }

  return undefined;
}

function toSyncJob(job: SyncJobRow, rows: SyncJobItemRow[]): SyncJob {
  const items = rows.map(toSyncJobItem);

  return {
    id: job.id,
    userId: job.user_id,
    path: job.path,
    status: job.status as SyncJob["status"],
    message: job.message ?? undefined,
    scannedCount: job.scanned_count,
    candidateCount: job.candidate_count,
    processedCount: job.processed_count,
    importedCount: job.imported_count,
    skippedCount: job.skipped_count,
    failedCount: job.failed_count,
    currentSourceFileId: job.current_source_file_id ?? undefined,
    items,
    imported: items.filter((item) => item.status === "imported"),
    skipped: items.filter((item) => item.status === "skipped"),
    failed: items.filter((item) => item.status === "failed"),
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    completedAt: job.completed_at ?? undefined
  };
}

function toSyncJobItem(row: SyncJobItemRow): SyncJobItem {
  return {
    id: row.id,
    sourceFileId: row.source_file_id,
    sourcePath: row.source_path,
    fileName: row.file_name,
    fileSize: row.file_size,
    status: row.status as SyncJobItem["status"],
    message: row.message ?? undefined,
    code: row.code ?? undefined,
    bookId: row.book_id ?? undefined,
    title: row.title ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
