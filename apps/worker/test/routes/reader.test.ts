import { describe, expect, it, vi } from "vitest";
import type { ApiResponse, Chapter, ChapterContent, PageResult, ReadingProgress } from "shared";
import type { Bindings } from "../../src/env";
import type { ChapterRow } from "../../src/db/repositories/chapter.repo";
import { app } from "../../src/index";

interface ProgressSaveResult {
  saved: boolean;
  progress: ReadingProgress;
}

describe("reader routes", () => {
  it("lists chapter metadata from D1 without chapter content", async () => {
    const { env, bucketGet } = createTestEnv();
    const response = await app.request("/api/books/book-1/chapters", {}, env);
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
      objectKey: "users/local-user/books/book-1/chapters/1.txt",
      wordCount: 1200
    });
    expect("content" in body.data.items[0]).toBe(false);
    expect(bucketGet).not.toHaveBeenCalled();
  });

  it("returns chapter metadata from D1, content from R2, and persists reading progress", async () => {
    const { env } = createTestEnv();
    const chapterResponse = await app.request("/api/books/book-1/chapters/chapter-2", {}, env);
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
  });

  it("uses the first D1 chapter for default reading progress", async () => {
    const { env } = createTestEnv();
    const response = await app.request("/api/books/book-default/progress", {}, env);
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
    const response = await app.request("/api/books/book-1/chapters/chapter-1", {}, env);
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

const rows: ChapterRow[] = [
  {
    id: "chapter-1",
    book_id: "book-1",
    title: "第一章 雨夜",
    chapter_index: 1,
    object_key: "users/local-user/books/book-1/chapters/1.txt",
    word_count: 1200,
    created_at: now,
    updated_at: now
  },
  {
    id: "chapter-2",
    book_id: "book-1",
    title: "第二章 灯火",
    chapter_index: 2,
    object_key: "users/local-user/books/book-1/chapters/2.txt",
    word_count: 1500,
    created_at: now,
    updated_at: now
  },
  {
    id: "chapter-default",
    book_id: "book-default",
    title: "默认第一章",
    chapter_index: 1,
    object_key: "users/local-user/books/book-default/chapters/1.txt",
    word_count: 800,
    created_at: now,
    updated_at: now
  }
];

function createTestEnv(contentByKey = new Map(rows.map((row) => [row.object_key, `${row.title}正文`]))) {
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
    DB: createD1Mock(rows),
    BOOK_BUCKET: {
      get: bucketGet
    } as unknown as R2Bucket,
    APP_ENV: "test",
    FRONTEND_ORIGIN: "http://localhost:5173"
  };

  return { env, bucketGet };
}

function createD1Mock(chapters: ChapterRow[]): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...bindings: unknown[]) => ({
        all: async <T>() => ({
          results: queryChapters(sql, bindings, chapters) as T[],
          success: true,
          meta: {}
        }),
        first: async <T>() => {
          const matches = queryChapters(sql, bindings, chapters);
          return (matches[0] ?? null) as T | null;
        }
      })
    })
  } as unknown as D1Database;
}

function queryChapters(sql: string, bindings: unknown[], chapters: ChapterRow[]): ChapterRow[] {
  const bookId = bindings[0];
  const chapterId = bindings[1];
  const matchingBookChapters = chapters
    .filter((chapter) => chapter.book_id === bookId)
    .sort((left, right) => left.chapter_index - right.chapter_index);

  if (sql.includes("AND id = ?")) {
    return matchingBookChapters.filter((chapter) => chapter.id === chapterId);
  }

  return matchingBookChapters;
}
