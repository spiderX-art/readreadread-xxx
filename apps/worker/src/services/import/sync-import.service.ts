import type { SyncImportFailure, SyncImportItem, SyncImportResult } from "shared";
import { listBookRowsBySourceFileIds } from "../../db/repositories/book.repo";
import type { Bindings } from "../../env";
import { downloadBaiduTxtFile, listBaiduNetdiskFiles } from "../baidu/baidu-file.service";
import { getValidBaiduAccessToken } from "../baidu/baidu-token.service";
import { importTxtBook } from "./txt-import.service";

const DEFAULT_SYNC_PATH = "/小说";

export interface SyncPreviewInput {
  userId: string;
  path?: string;
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
