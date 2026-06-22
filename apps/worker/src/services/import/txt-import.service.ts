import { parseTitleAuthor } from "parser";
import type { Book } from "shared";
import { createBookRow, updateBookImportStats } from "../../db/repositories/book.repo";
import { createChapterRow } from "../../db/repositories/chapter.repo";
import {
  createImportJobRow,
  updateImportJobFailed,
  updateImportJobProcessing,
  updateImportJobSuccess
} from "../../db/repositories/import-job.repo";
import { ensureUserRow } from "../../db/repositories/user.repo";
import { AppError } from "../../utils/errors";
import { createId } from "../../utils/id";
import { parseTxtChapters } from "./chapter-parser.service";
import { chapterObjectKey, rawTxtObjectKey } from "../storage/object-key.service";
import { putTextObject } from "../storage/r2.service";

export function previewTxtImport(fileName: string) {
  return parseTitleAuthor(fileName);
}

export interface TxtImportInput {
  userId: string;
  sourceFileId: string;
  sourcePath: string;
  fileName: string;
  fileSize: number;
  text: string;
  title?: string;
  author?: string;
}

export interface TxtImportResult {
  job: {
    id: string;
    status: "success";
    bookId: string;
  };
  book: Book;
}

export async function importTxtBook(db: D1Database, bucket: R2Bucket, input: TxtImportInput): Promise<TxtImportResult> {
  const createdAt = new Date().toISOString();
  const jobId = createId("import_job");

  await ensureUserRow(db, input.userId, createdAt);
  await createImportJobRow(db, {
    id: jobId,
    userId: input.userId,
    sourceFileId: input.sourceFileId,
    sourcePath: input.sourcePath,
    fileName: input.fileName,
    createdAt,
    updatedAt: createdAt
  });

  try {
    await updateImportJobProcessing(db, jobId, new Date().toISOString());

    const parsedBook = parseTitleAuthor(input.fileName);
    const title = normalizeOptionalText(input.title) ?? parsedBook.title;
    const author = normalizeOptionalText(input.author) ?? parsedBook.author;
    const chapters = parseTxtChapters(input.text);

    if (chapters.length === 0) {
      throw new AppError(400, "EMPTY_TXT_IMPORT", "TXT 正文为空，无法导入");
    }

    const bookId = createId("book");
    const rawObjectKey = rawTxtObjectKey(input.userId, bookId);
    const now = new Date().toISOString();

    await createBookRow(db, {
      id: bookId,
      userId: input.userId,
      title,
      author,
      sourceFileId: input.sourceFileId,
      sourcePath: input.sourcePath,
      fileName: input.fileName,
      fileSize: input.fileSize,
      rawObjectKey,
      createdAt: now,
      updatedAt: now
    });
    await putTextObject(bucket, rawObjectKey, input.text);

    let wordCount = 0;

    for (const chapter of chapters) {
      const chapterIndex = chapter.index + 1;
      const objectKey = chapterObjectKey(input.userId, bookId, chapterIndex);
      const chapterId = createId("chapter");
      const chapterCreatedAt = new Date().toISOString();

      wordCount += chapter.wordCount;
      await putTextObject(bucket, objectKey, chapter.content);
      await createChapterRow(db, {
        id: chapterId,
        bookId,
        title: chapter.title,
        chapterIndex,
        objectKey,
        wordCount: chapter.wordCount,
        createdAt: chapterCreatedAt,
        updatedAt: chapterCreatedAt
      });
    }

    const importedAt = new Date().toISOString();
    await updateBookImportStats(db, bookId, chapters.length, wordCount, importedAt);
    await updateImportJobSuccess(db, jobId, bookId, importedAt);

    return {
      job: {
        id: jobId,
        status: "success",
        bookId
      },
      book: {
        id: bookId,
        userId: input.userId,
        title,
        author,
        sourceFileId: input.sourceFileId,
        sourcePath: input.sourcePath,
        fileName: input.fileName,
        fileSize: input.fileSize,
        rawObjectKey,
        wordCount,
        chapterCount: chapters.length,
        status: "not_started",
        createdAt: now,
        updatedAt: importedAt
      }
    };
  } catch (error) {
    const failedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : "TXT 导入失败";

    try {
      await updateImportJobFailed(db, jobId, message, failedAt);
    } catch {
      // Preserve the original import error for the API response.
    }

    throw error;
  }
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
