import { Hono } from "hono";
import type { Chapter, ChapterContent, ReadingProgress } from "shared";
import { findChapterRow, findFirstChapterRow, listChapterRows, type ChapterRow } from "../db/repositories/chapter.repo";
import {
  findReadingProgressRow,
  upsertReadingProgressRow,
  type ReadingProgressRow
} from "../db/repositories/reading-progress.repo";
import type { AppEnv } from "../env";
import { clampProgressPercent } from "../services/books/progress.service";
import { getTextObject } from "../services/storage/r2.service";
import { AppError } from "../utils/errors";
import { ok } from "../utils/response";

export const readerRoutes = new Hono<AppEnv>();

const LOCAL_USER_ID = "local-user";

readerRoutes.get("/:bookId/chapters", async (c) => {
  const chapters = await listChapterRows(c.env.DB, c.req.param("bookId"));

  return c.json(
    ok({
      items: chapters.map(toChapter),
      total: chapters.length
    })
  );
});

readerRoutes.get("/:bookId/chapters/:chapterId", async (c) => {
  const chapter = await findChapterRow(c.env.DB, c.req.param("bookId"), c.req.param("chapterId"));

  if (!chapter) {
    throw new AppError(404, "CHAPTER_NOT_FOUND", "章节不存在");
  }

  const content = await getTextObject(c.env.BOOK_BUCKET, chapter.object_key);

  if (content === null) {
    throw new AppError(404, "CHAPTER_CONTENT_NOT_FOUND", "章节正文不存在");
  }

  return c.json(ok(toChapterContent(chapter, content)));
});

readerRoutes.get("/:bookId/progress", async (c) => c.json(ok(await getProgress(c.env.DB, c.req.param("bookId")))));

readerRoutes.post("/:bookId/progress", async (c) => {
  const bookId = c.req.param("bookId");
  const body = (await c.req.json().catch(() => ({}))) as Partial<ReadingProgress>;
  const updatedAt = new Date().toISOString();
  const progress: ReadingProgress = {
    id: progressId(LOCAL_USER_ID, bookId),
    userId: LOCAL_USER_ID,
    bookId,
    chapterId: body.chapterId,
    scrollPosition: Number.isFinite(body.scrollPosition) ? Number(body.scrollPosition) : 0,
    progressPercent: clampProgressPercent(Number(body.progressPercent ?? 0)),
    updatedAt
  };

  await upsertReadingProgressRow(c.env.DB, {
    id: progress.id,
    userId: progress.userId,
    bookId: progress.bookId,
    chapterId: progress.chapterId,
    scrollPosition: progress.scrollPosition,
    progressPercent: progress.progressPercent,
    updatedAt: progress.updatedAt
  });

  return c.json(ok({ saved: true, progress }));
});

function toChapter(chapter: ChapterRow): Chapter {
  return {
    id: chapter.id,
    bookId: chapter.book_id,
    title: chapter.title,
    chapterIndex: chapter.chapter_index,
    objectKey: chapter.object_key,
    wordCount: chapter.word_count,
    createdAt: chapter.created_at,
    updatedAt: chapter.updated_at
  };
}

function toChapterContent(chapter: ChapterRow, content: string): ChapterContent {
  return {
    ...toChapter(chapter),
    content
  };
}

async function getProgress(db: D1Database, bookId: string): Promise<ReadingProgress> {
  const savedProgress = await findReadingProgressRow(db, LOCAL_USER_ID, bookId);

  if (savedProgress) {
    return toReadingProgress(savedProgress);
  }

  const firstChapter = await findFirstChapterRow(db, bookId);

  return {
    id: progressId(LOCAL_USER_ID, bookId),
    userId: LOCAL_USER_ID,
    bookId,
    chapterId: firstChapter?.id,
    scrollPosition: 0,
    progressPercent: 0,
    updatedAt: new Date(0).toISOString()
  };
}

function toReadingProgress(row: ReadingProgressRow): ReadingProgress {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    chapterId: row.chapter_id ?? undefined,
    scrollPosition: row.scroll_position,
    progressPercent: row.progress_percent,
    updatedAt: row.updated_at
  };
}

function progressId(userId: string, bookId: string): string {
  return `progress-${userId}-${bookId}`;
}
