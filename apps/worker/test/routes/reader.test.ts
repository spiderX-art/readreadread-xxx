import { describe, expect, it, vi } from "vitest";
import type { ApiResponse, Chapter, ChapterContent, PageResult, ReadingProgress } from "shared";
import type { Bindings } from "../../src/env";
import type { BookRow } from "../../src/db/repositories/book.repo";
import type { ChapterRow } from "../../src/db/repositories/chapter.repo";
import type { ReadingProgressRow } from "../../src/db/repositories/reading-progress.repo";
import { app } from "../../src/index";

const TEST_USER_ID = "user-1";
const authHeaders = { "x-user-id": TEST_USER_ID };

interface ProgressSaveResult {
  saved: boolean;
  progress: ReadingProgress;
}

describe("reader routes", () => {
  it("lists chapter metadata from D1 without chapter content", async () => {
    const { env, bucketGet } = createTestEnv();
    const response = await app.request("/api/books/book-1/chapters", { headers: authHeaders }, env);
    const body = (await response.json()) as ApiResponse<PageResult<Chapter>>;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    if (!body.ok) {
      throw new Error(body.error.message);
    }

    expect(body.data.items).toHaveLength(2);
    expect(body.data.items[0]).toMatchObject({
      id: "chapter-1",
      bookId: "book-1",
      title: "第一章 雨夜",
      chapterIndex: 1,
      objectKey: "users/user-1/books/book-1/chapters/1.txt",
      wordCount: 1200
    });
    expect("content" in body.data.items[0]).toBe(false);
    expect(bucketGet).not.toHaveBeenCalled();
  });

  it("returns chapter metadata from D1, content from R2, and persists reading progress", async () => {
    const { env, readingProgress } = createTestEnv();
    const chapterResponse = await app.request("/api/books/book-1/chapters/chapter-2", { headers: authHeaders }, env);
    const chapterBody = (await chapterResponse.json()) as ApiResponse<ChapterContent>;

    expect(chapterResponse.status).toBe(200);
    if (!chapterBody.ok) {
      throw new Error(chapterBody.error.message);
    }

    expect(chapterBody.data).toMatchObject({
      id: "chapter-2",
      bookId: "book-1",
      title: "第二章 灯火"
    });
    expect(chapterBody.data.content).toBe("第二章 灯火正文");

    const progressResponse = await app.request(
      "/api/books/book-1/progress",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          chapterId: "chapter-2",
          scrollPosition: 0,
          progressPercent: 140
        })
      },
      env
    );
    const progressBody = (await progressResponse.json()) as ApiResponse<ProgressSaveResult>;

    expect(progressResponse.status).toBe(200);
    if (!progressBody.ok) {
      throw new Error(progressBody.error.message);
    }

    expect(progressBody.data).toMatchObject({
      saved: true,
      progress: {
        bookId: "book-1",
        chapterId: "chapter-2",
        progressPercent: 100
      }
    });
    expect(readingProgress).toHaveLength(1);
    expect(readingProgress[0]).toMatchObject({
      user_id: TEST_USER_ID,
      book_id: "book-1",
      chapter_id: "chapter-2",
      progress_percent: 100
    });

    const savedProgressResponse = await app.request("/api/books/book-1/progress", { headers: authHeaders }, env);
    const savedProgressBody = (await savedProgressResponse.json()) as ApiResponse<ReadingProgress>;

    expect(savedProgressResponse.status).toBe(200);
    if (!savedProgressBody.ok) {
      throw new Error(savedProgressBody.error.message);
    }

    expect(savedProgressBody.data).toMatchObject({
      bookId: "book-1",
      chapterId: "chapter-2",
      progressPercent: 100
    });
  });

  it("uses the first D1 chapter for default reading progress", async () => {
    const { env } = createTestEnv();
    const response = await app.request("/api/books/book-default/progress", { headers: authHeaders }, env);
    const body = (await response.json()) as ApiResponse<ReadingProgress>;

    expect(response.status).toBe(200);
    if (!body.ok) {
      throw new Error(body.error.message);
    }

    expect(body.data).toMatchObject({
      bookId: "book-default",
      chapterId: "chapter-default",
      progressPercent: 0
    });
  });

  it("returns 404 when chapter content is missing from R2", async () => {
    const { env } = createTestEnv(new Map());
    const response = await app.request("/api/books/book-1/chapters/chapter-1", { headers: authHeaders }, env);
    const body = (await response.json()) as ApiResponse<unknown>;

    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: "CHAPTER_CONTENT_NOT_FOUND"
      }
    });
  });
});

const now = "2026-01-01T00:00:00.000Z";

const books: BookRow[] = [
  {
    id: "book-1",
    user_id: TEST_USER_ID,
    title: "雨夜灯火",
    author: "张三",
    source_file_id: "fs-1",
    source_path: "/novels/雨夜灯火.txt",
    file_name: "雨夜灯火.txt",
    file_size: 1024,
    raw_object_key: "users/user-1/books/book-1/raw/source.txt",
    word_count: 2700,
    chapter_count: 2,
    status: "reading",
    rating: null,
    created_at: now,
    updated_at: now,
    last_read_at: null
  },
  {
    id: "book-default",
    user_id: TEST_USER_ID,
    title: "默认书籍",
    author: null,
    source_file_id: "fs-default",
    source_path: "/novels/default.txt",
    file_name: "default.txt",
    file_size: 512,
    raw_object_key: "users/user-1/books/book-default/raw/source.txt",
    word_count: 800,
    chapter_count: 1,
    status: "not_started",
    rating: null,
    created_at: now,
    updated_at: now,
    last_read_at: null
  }
];

const rows: ChapterRow[] = [
  {
    id: "chapter-1",
    book_id: "book-1",
    title: "第一章 雨夜",
    chapter_index: 1,
    object_key: "users/user-1/books/book-1/chapters/1.txt",
    word_count: 1200,
    created_at: now,
    updated_at: now
  },
  {
    id: "chapter-2",
    book_id: "book-1",
    title: "第二章 灯火",
    chapter_index: 2,
    object_key: "users/user-1/books/book-1/chapters/2.txt",
    word_count: 1500,
    created_at: now,
    updated_at: now
  },
  {
    id: "chapter-default",
    book_id: "book-default",
    title: "默认第一章",
    chapter_index: 1,
    object_key: "users/user-1/books/book-default/chapters/1.txt",
    word_count: 800,
    created_at: now,
    updated_at: now
  }
];

function createTestEnv(contentByKey = new Map(rows.map((row) => [row.object_key, `${row.title}正文`]))) {
  const readingProgress: ReadingProgressRow[] = [];
  const bucketGet = vi.fn(async (key: string) => {
    const content = contentByKey.get(key);

    if (content === undefined) {
      return null;
    }

    return {
      text: async () => content
    };
  });

  const env: Bindings = {
    DB: createD1Mock(books, rows, readingProgress),
    BOOK_BUCKET: {
      get: bucketGet
    } as unknown as R2Bucket,
    APP_ENV: "test",
    FRONTEND_ORIGIN: "http://localhost:5173"
  };

  return { env, bucketGet, readingProgress };
}

function createD1Mock(books: BookRow[], chapters: ChapterRow[], readingProgress: ReadingProgressRow[]): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...bindings: unknown[]) => ({
        run: async () => {
          runStatement(sql, bindings, readingProgress);
          return {
            success: true,
            meta: {}
          };
        },
        all: async <T>() => ({
          results: queryStatement(sql, bindings, books, chapters, readingProgress) as T[],
          success: true,
          meta: {}
        }),
        first: async <T>() => {
          const matches = queryStatement(sql, bindings, books, chapters, readingProgress);
          return (matches[0] ?? null) as T | null;
        }
      })
    })
  } as unknown as D1Database;
}

function runStatement(sql: string, bindings: unknown[], readingProgress: ReadingProgressRow[]): void {
  const normalizedSql = normalizeSql(sql);

  if (normalizedSql.startsWith("insert into reading_progress")) {
    const [id, userId, bookId, chapterId, scrollPosition, progressPercent, updatedAt] = bindings as [
      string,
      string,
      string,
      string | null,
      number,
      number,
      string
    ];
    const existing = readingProgress.find((row) => row.user_id === userId && row.book_id === bookId);

    if (existing) {
      existing.chapter_id = chapterId;
      existing.scroll_position = scrollPosition;
      existing.progress_percent = progressPercent;
      existing.updated_at = updatedAt;
      return;
    }

    readingProgress.push({
      id,
      user_id: userId,
      book_id: bookId,
      chapter_id: chapterId,
      scroll_position: scrollPosition,
      progress_percent: progressPercent,
      updated_at: updatedAt
    });
    return;
  }

  throw new Error(`Unhandled SQL: ${normalizedSql}`);
}

function queryStatement(
  sql: string,
  bindings: unknown[],
  books: BookRow[],
  chapters: ChapterRow[],
  readingProgress: ReadingProgressRow[]
): unknown[] {
  const normalizedSql = normalizeSql(sql);

  if (normalizedSql.includes("from books")) {
    const [userId, bookId] = bindings as [string, string];
    return books.filter((book) => book.user_id === userId && book.id === bookId);
  }

  if (normalizedSql.includes("from reading_progress")) {
    const [userId, bookId] = bindings as [string, string];
    return readingProgress.filter((row) => row.user_id === userId && row.book_id === bookId);
  }

  if (normalizedSql.includes("from chapters")) {
    return queryChapters(normalizedSql, bindings, chapters);
  }

  throw new Error(`Unhandled SQL: ${normalizedSql}`);
}

function queryChapters(normalizedSql: string, bindings: unknown[], chapters: ChapterRow[]): ChapterRow[] {
  const bookId = bindings[0];
  const chapterId = bindings[1];
  const matchingBookChapters = chapters
    .filter((chapter) => chapter.book_id === bookId)
    .sort((left, right) => left.chapter_index - right.chapter_index);

  if (normalizedSql.includes("and id = ?")) {
    return matchingBookChapters.filter((chapter) => chapter.id === chapterId);
  }

  return matchingBookChapters;
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}
