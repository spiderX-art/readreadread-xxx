import { describe, expect, it, vi } from "vitest";
import type { ApiResponse, Book, Chapter, ChapterContent, PageResult } from "shared";
import type { BookRow } from "../../src/db/repositories/book.repo";
import type { ChapterRow } from "../../src/db/repositories/chapter.repo";
import type { ImportJobRow } from "../../src/db/repositories/import-job.repo";
import type { UserRow } from "../../src/db/repositories/user.repo";
import type { Bindings } from "../../src/env";
import { app } from "../../src/index";

const TEST_USER_ID = "user-1";
const authHeaders = { "x-user-id": TEST_USER_ID };

interface ImportTxtApiResult {
  job: {
    id: string;
    status: "success";
    bookId: string;
  };
  book: Book;
}

interface TestDatabaseState {
  users: UserRow[];
  books: BookRow[];
  chapters: ChapterRow[];
  importJobs: ImportJobRow[];
}

describe("TXT import route", () => {
  it("imports TXT into D1 and R2 so reader endpoints can read it", async () => {
    const { env, state, objects } = createImportTestEnv();
    const text = ["第一章 雨夜", "窗外下着雨。", "", "第二章 灯火", "灯火亮了。"].join("\n");
    const importResponse = await app.request(
      "/api/import/txt",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sourceFileId: "fs-1",
          sourcePath: "/novels/雨夜.txt",
          fileName: "雨夜 作者张三.txt",
          fileSize: 1024,
          text
        })
      },
      env
    );
    const importBody = (await importResponse.json()) as ApiResponse<ImportTxtApiResult>;

    expect(importResponse.status).toBe(201);
    expect(importBody.ok).toBe(true);
    if (!importBody.ok) {
      throw new Error(importBody.error.message);
    }

    expect(state.users).toHaveLength(1);
    expect(state.books).toHaveLength(1);
    expect(state.chapters).toHaveLength(2);
    expect(state.importJobs).toHaveLength(1);
    expect(state.importJobs[0]).toMatchObject({
      id: importBody.data.job.id,
      status: "success",
      book_id: importBody.data.book.id
    });
    expect(state.books[0]).toMatchObject({
      id: importBody.data.book.id,
      chapter_count: 2,
      word_count: state.chapters.reduce((total, chapter) => total + chapter.word_count, 0)
    });
    expect(objects.get(state.books[0].raw_object_key ?? "")).toBe(text);

    const jobResponse = await app.request(`/api/import/jobs/${importBody.data.job.id}`, { headers: authHeaders }, env);
    const jobBody = (await jobResponse.json()) as ApiResponse<{ status: string; bookId: string }>;

    expect(jobResponse.status).toBe(200);
    expect(jobBody.ok).toBe(true);
    if (!jobBody.ok) {
      throw new Error(jobBody.error.message);
    }
    expect(jobBody.data).toMatchObject({
      status: "success",
      bookId: importBody.data.book.id
    });

    const chaptersResponse = await app.request(
      `/api/books/${importBody.data.book.id}/chapters`,
      { headers: authHeaders },
      env
    );
    const chaptersBody = (await chaptersResponse.json()) as ApiResponse<PageResult<Chapter>>;

    expect(chaptersResponse.status).toBe(200);
    expect(chaptersBody.ok).toBe(true);
    if (!chaptersBody.ok) {
      throw new Error(chaptersBody.error.message);
    }

    expect(chaptersBody.data.items).toHaveLength(2);
    expect(chaptersBody.data.items.map((chapter) => chapter.title)).toEqual(["第一章 雨夜", "第二章 灯火"]);
    expect("content" in chaptersBody.data.items[0]).toBe(false);

    const secondChapter = chaptersBody.data.items[1];
    const chapterResponse = await app.request(
      `/api/books/${importBody.data.book.id}/chapters/${secondChapter.id}`,
      { headers: authHeaders },
      env
    );
    const chapterBody = (await chapterResponse.json()) as ApiResponse<ChapterContent>;

    expect(chapterResponse.status).toBe(200);
    expect(chapterBody.ok).toBe(true);
    if (!chapterBody.ok) {
      throw new Error(chapterBody.error.message);
    }

    expect(chapterBody.data).toMatchObject({
      id: secondChapter.id,
      bookId: importBody.data.book.id,
      title: "第二章 灯火",
      content: "灯火亮了。"
    });
    expect(objects.get(secondChapter.objectKey)).toBe("灯火亮了。");
  });
});

function createImportTestEnv() {
  const state: TestDatabaseState = {
    users: [],
    books: [],
    chapters: [],
    importJobs: []
  };
  const objects = new Map<string, string>();
  const bucketPut = vi.fn(async (key: string, value: string) => {
    objects.set(key, value);
    return null;
  });
  const bucketGet = vi.fn(async (key: string) => {
    const content = objects.get(key);

    if (content === undefined) {
      return null;
    }

    return {
      text: async () => content
    };
  });
  const env: Bindings = {
    DB: createD1Mock(state),
    BOOK_BUCKET: {
      put: bucketPut,
      get: bucketGet
    } as unknown as R2Bucket,
    APP_ENV: "test",
    FRONTEND_ORIGIN: "http://localhost:5173"
  };

  return { env, state, objects };
}

function createD1Mock(state: TestDatabaseState): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...bindings: unknown[]) => ({
        run: async () => {
          runStatement(sql, bindings, state);
          return {
            success: true,
            meta: {}
          };
        },
        all: async <T>() => ({
          results: queryStatement(sql, bindings, state) as T[],
          success: true,
          meta: {}
        }),
        first: async <T>() => {
          const matches = queryStatement(sql, bindings, state);
          return (matches[0] ?? null) as T | null;
        }
      })
    })
  } as unknown as D1Database;
}

function runStatement(sql: string, bindings: unknown[], state: TestDatabaseState): void {
  const normalizedSql = normalizeSql(sql);

  if (normalizedSql.startsWith("insert or ignore into users")) {
    const [id, displayName, createdAt, updatedAt] = bindings as [string, string, string, string];

    if (!state.users.some((user) => user.id === id)) {
      state.users.push({
        id,
        display_name: displayName,
        avatar_url: null,
        created_at: createdAt,
        updated_at: updatedAt
      });
    }

    return;
  }

  if (normalizedSql.startsWith("insert into import_jobs")) {
    const [id, userId, sourceFileId, sourcePath, fileName, createdAt, updatedAt] = bindings as [
      string,
      string,
      string,
      string,
      string,
      string,
      string
    ];

    state.importJobs.push({
      id,
      user_id: userId,
      source_file_id: sourceFileId,
      source_path: sourcePath,
      file_name: fileName,
      status: "pending",
      message: null,
      book_id: null,
      created_at: createdAt,
      updated_at: updatedAt
    });

    return;
  }

  if (normalizedSql.startsWith("update import_jobs set status = 'processing'")) {
    const [updatedAt, jobId] = bindings as [string, string];
    const job = findImportJob(state, jobId);

    job.status = "processing";
    job.updated_at = updatedAt;
    return;
  }

  if (normalizedSql.startsWith("insert into books")) {
    const [
      id,
      userId,
      title,
      author,
      sourceFileId,
      sourcePath,
      fileName,
      fileSize,
      rawObjectKey,
      createdAt,
      updatedAt
    ] = bindings as [string, string, string, string | null, string, string, string, number, string, string, string];

    state.books.push({
      id,
      user_id: userId,
      title,
      author,
      source_file_id: sourceFileId,
      source_path: sourcePath,
      file_name: fileName,
      file_size: fileSize,
      raw_object_key: rawObjectKey,
      word_count: 0,
      chapter_count: 0,
      status: "not_started",
      rating: null,
      created_at: createdAt,
      updated_at: updatedAt,
      last_read_at: null
    });

    return;
  }

  if (normalizedSql.startsWith("insert into chapters")) {
    const [id, bookId, title, chapterIndex, objectKey, wordCount, createdAt, updatedAt] = bindings as [
      string,
      string,
      string,
      number,
      string,
      number,
      string,
      string
    ];

    state.chapters.push({
      id,
      book_id: bookId,
      title,
      chapter_index: chapterIndex,
      object_key: objectKey,
      word_count: wordCount,
      created_at: createdAt,
      updated_at: updatedAt
    });

    return;
  }

  if (normalizedSql.startsWith("update books set chapter_count")) {
    const [chapterCount, wordCount, updatedAt, bookId] = bindings as [number, number, string, string];
    const book = findBook(state, bookId);

    book.chapter_count = chapterCount;
    book.word_count = wordCount;
    book.updated_at = updatedAt;
    return;
  }

  if (normalizedSql.startsWith("update import_jobs set status = 'success'")) {
    const [bookId, updatedAt, jobId] = bindings as [string, string, string];
    const job = findImportJob(state, jobId);

    job.status = "success";
    job.book_id = bookId;
    job.message = null;
    job.updated_at = updatedAt;
    return;
  }

  if (normalizedSql.startsWith("update import_jobs set status = 'failed'")) {
    const [message, updatedAt, jobId] = bindings as [string, string, string];
    const job = findImportJob(state, jobId);

    job.status = "failed";
    job.message = message;
    job.updated_at = updatedAt;
    return;
  }

  throw new Error(`Unhandled SQL: ${normalizedSql}`);
}

function queryStatement(sql: string, bindings: unknown[], state: TestDatabaseState): unknown[] {
  const normalizedSql = normalizeSql(sql);

  if (normalizedSql.includes("from chapters")) {
    const [bookId, chapterId] = bindings as [string, string | undefined];
    const chapters = state.chapters
      .filter((chapter) => chapter.book_id === bookId)
      .sort((left, right) => left.chapter_index - right.chapter_index);

    if (normalizedSql.includes("and id = ?")) {
      return chapters.filter((chapter) => chapter.id === chapterId);
    }

    if (normalizedSql.includes("limit 1")) {
      return chapters.slice(0, 1);
    }

    return chapters;
  }

  if (normalizedSql.includes("from books")) {
    const [userId, bookId] = bindings as [string, string];
    return state.books.filter((book) => book.user_id === userId && book.id === bookId);
  }

  if (normalizedSql.includes("from import_jobs")) {
    const [jobId] = bindings as [string];
    return state.importJobs.filter((job) => job.id === jobId);
  }

  throw new Error(`Unhandled SQL: ${normalizedSql}`);
}

function findBook(state: TestDatabaseState, bookId: string): BookRow {
  const book = state.books.find((candidate) => candidate.id === bookId);

  if (!book) {
    throw new Error(`Book not found: ${bookId}`);
  }

  return book;
}

function findImportJob(state: TestDatabaseState, jobId: string): ImportJobRow {
  const job = state.importJobs.find((candidate) => candidate.id === jobId);

  if (!job) {
    throw new Error(`Import job not found: ${jobId}`);
  }

  return job;
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}
