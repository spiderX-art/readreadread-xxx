import { describe, expect, it, vi } from "vitest";
import type { ApiResponse, Book, BookRating, DropReason, PageResult, Review, Tag } from "shared";
import type { BookRow } from "../../src/db/repositories/book.repo";
import type { ChapterRow } from "../../src/db/repositories/chapter.repo";
import type { RatingRow } from "../../src/db/repositories/rating.repo";
import type { DropReasonRow, ReviewRow } from "../../src/db/repositories/review.repo";
import type { BookTagRow, TagRow } from "../../src/db/repositories/tag.repo";
import type { Bindings } from "../../src/env";
import { app } from "../../src/index";

const TEST_USER_ID = "user-1";
const authHeaders = { "x-user-id": TEST_USER_ID };

interface TestDatabaseState {
  books: BookRow[];
  chapters: ChapterRow[];
  ratings: RatingRow[];
  reviews: ReviewRow[];
  dropReasons: DropReasonRow[];
  tags: TagRow[];
  bookTags: BookTagRow[];
}

describe("book routes", () => {
  it("reads bookshelf data from D1 and persists rating and review data", async () => {
    const { env, state } = createTestEnv();

    const listResponse = await app.request("/api/books", { headers: authHeaders }, env);
    const listBody = (await listResponse.json()) as ApiResponse<PageResult<Book>>;

    expect(listResponse.status).toBe(200);
    expect(listBody.ok).toBe(true);
    if (!listBody.ok) {
      throw new Error(listBody.error.message);
    }
    expect(listBody.data.items).toHaveLength(1);
    expect(listBody.data.items[0]).toMatchObject({
      id: "book-1",
      title: "雨夜灯火",
      chapterCount: 2
    });

    const detailResponse = await app.request("/api/books/book-1", { headers: authHeaders }, env);
    const detailBody = (await detailResponse.json()) as ApiResponse<Book>;

    expect(detailResponse.status).toBe(200);
    expect(detailBody.ok).toBe(true);
    if (!detailBody.ok) {
      throw new Error(detailBody.error.message);
    }
    expect(detailBody.data).toMatchObject({
      id: "book-1",
      author: "张三"
    });

    const bookshelfSearchResponse = await app.request("/api/books/search?q=灯火", { headers: authHeaders }, env);
    const bookshelfSearchBody = (await bookshelfSearchResponse.json()) as ApiResponse<PageResult<Book>>;

    expect(bookshelfSearchResponse.status).toBe(200);
    expect(bookshelfSearchBody.ok).toBe(true);
    if (!bookshelfSearchBody.ok) {
      throw new Error(bookshelfSearchBody.error.message);
    }
    expect(bookshelfSearchBody.data.items.map((book) => book.id)).toEqual(["book-1"]);

    const createTagResponse = await app.request(
      "/api/tags",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: "仙侠",
          type: "genre"
        })
      },
      env
    );
    const createTagBody = (await createTagResponse.json()) as ApiResponse<Tag>;

    expect(createTagResponse.status).toBe(201);
    expect(createTagBody.ok).toBe(true);
    if (!createTagBody.ok) {
      throw new Error(createTagBody.error.message);
    }

    const attachTagResponse = await app.request(
      "/api/books/book-1/tags",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          tagId: createTagBody.data.id
        })
      },
      env
    );

    expect(attachTagResponse.status).toBe(201);

    const taggedSearchResponse = await app.request("/api/books/search?tag=%E4%BB%99%E4%BE%A0", { headers: authHeaders }, env);
    const taggedSearchBody = (await taggedSearchResponse.json()) as ApiResponse<PageResult<Book>>;

    expect(taggedSearchResponse.status).toBe(200);
    expect(taggedSearchBody.ok).toBe(true);
    if (!taggedSearchBody.ok) {
      throw new Error(taggedSearchBody.error.message);
    }
    expect(taggedSearchBody.data.items[0].tags?.map((tag) => tag.name)).toEqual(["仙侠"]);

    const fulltextSearchResponse = await app.request("/api/books/book-1/search?q=灯火", { headers: authHeaders }, env);
    const fulltextSearchBody = (await fulltextSearchResponse.json()) as ApiResponse<{
      items: { chapterId: string; context: string }[];
      total: number;
    }>;

    expect(fulltextSearchResponse.status).toBe(200);
    expect(fulltextSearchBody.ok).toBe(true);
    if (!fulltextSearchBody.ok) {
      throw new Error(fulltextSearchBody.error.message);
    }
    expect(fulltextSearchBody.data.items).toHaveLength(1);
    expect(fulltextSearchBody.data.items[0]).toMatchObject({
      chapterId: "chapter-2"
    });

    const ratingResponse = await app.request(
      "/api/books/book-1/rating",
      {
        method: "PUT",
        headers: {
          ...authHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          overall: 8.5,
          plot: 8
        })
      },
      env
    );
    const ratingBody = (await ratingResponse.json()) as ApiResponse<BookRating>;

    expect(ratingResponse.status).toBe(200);
    expect(ratingBody.ok).toBe(true);
    if (!ratingBody.ok) {
      throw new Error(ratingBody.error.message);
    }
    expect(ratingBody.data).toMatchObject({
      bookId: "book-1",
      overall: 8.5,
      plot: 8
    });
    expect(state.books[0].rating).toBe(8.5);

    const reviewResponse = await app.request(
      "/api/books/book-1/review",
      {
        method: "PUT",
        headers: {
          ...authHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          shortComment: "值得读",
          recommended: true
        })
      },
      env
    );
    const reviewBody = (await reviewResponse.json()) as ApiResponse<Review>;

    expect(reviewResponse.status).toBe(200);
    expect(reviewBody.ok).toBe(true);
    if (!reviewBody.ok) {
      throw new Error(reviewBody.error.message);
    }
    expect(reviewBody.data).toMatchObject({
      bookId: "book-1",
      shortComment: "值得读",
      recommended: true
    });

    const dropReasonResponse = await app.request(
      "/api/books/book-1/drop-reason",
      {
        method: "PUT",
        headers: {
          ...authHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          reason: "节奏变慢",
          mayReadLater: true
        })
      },
      env
    );
    const dropReasonBody = (await dropReasonResponse.json()) as ApiResponse<DropReason>;

    expect(dropReasonResponse.status).toBe(200);
    expect(dropReasonBody.ok).toBe(true);
    if (!dropReasonBody.ok) {
      throw new Error(dropReasonBody.error.message);
    }
    expect(dropReasonBody.data).toMatchObject({
      bookId: "book-1",
      reason: "节奏变慢",
      mayReadLater: true
    });
  });
});

const now = "2026-01-01T00:00:00.000Z";

function createTestEnv() {
  const state: TestDatabaseState = {
    books: [
      {
        id: "book-1",
        user_id: TEST_USER_ID,
        title: "雨夜灯火",
        author: "张三",
        source_file_id: "fs-1",
        source_path: "/novels/雨夜灯火.txt",
        file_name: "雨夜灯火.txt",
        file_size: 1024,
        raw_object_key: "users/user-1/books/book-1/raw.txt",
        word_count: 1200,
        chapter_count: 2,
        status: "reading",
        rating: null,
        created_at: now,
        updated_at: now,
        last_read_at: null
      }
    ],
    chapters: [
      {
        id: "chapter-1",
        book_id: "book-1",
        title: "第一章 雨夜",
        chapter_index: 1,
        object_key: "users/user-1/books/book-1/chapters/1.txt",
        word_count: 500,
        created_at: now,
        updated_at: now
      },
      {
        id: "chapter-2",
        book_id: "book-1",
        title: "第二章 灯火",
        chapter_index: 2,
        object_key: "users/user-1/books/book-1/chapters/2.txt",
        word_count: 700,
        created_at: now,
        updated_at: now
      }
    ],
    ratings: [],
    reviews: [],
    dropReasons: [],
    tags: [],
    bookTags: []
  };
  const objects = new Map([
    ["users/user-1/books/book-1/chapters/1.txt", "雨声很密。"],
    ["users/user-1/books/book-1/chapters/2.txt", "灯火从窗里亮起来。"]
  ]);
  const env: Bindings = {
    DB: createD1Mock(state),
    BOOK_BUCKET: {
      get: vi.fn(async (key: string) => {
        const content = objects.get(key);

        if (content === undefined) {
          return null;
        }

        return {
          text: async () => content
        };
      })
    } as unknown as R2Bucket,
    APP_ENV: "test",
    FRONTEND_ORIGIN: "http://localhost:5173"
  };

  return { env, state };
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

  if (normalizedSql.startsWith("insert into book_ratings")) {
    const [
      id,
      userId,
      bookId,
      overall,
      plot,
      writing,
      character,
      pacing,
      worldbuilding,
      satisfaction,
      endingStability,
      rereadValue,
      createdAt,
      updatedAt
    ] = bindings as [
      string,
      string,
      string,
      number | null,
      number | null,
      number | null,
      number | null,
      number | null,
      number | null,
      number | null,
      number | null,
      number | null,
      string,
      string
    ];
    const existing = state.ratings.find((rating) => rating.user_id === userId && rating.book_id === bookId);
    const row = {
      id,
      user_id: userId,
      book_id: bookId,
      overall,
      plot,
      writing,
      character,
      pacing,
      worldbuilding,
      satisfaction,
      ending_stability: endingStability,
      reread_value: rereadValue,
      created_at: existing?.created_at ?? createdAt,
      updated_at: updatedAt
    };

    if (existing) {
      Object.assign(existing, row);
    } else {
      state.ratings.push(row);
    }

    return;
  }

  if (normalizedSql.startsWith("insert into tags")) {
    const [id, userId, name, type, createdAt, updatedAt] = bindings as [string, string, string, string, string, string];

    if (state.tags.some((tag) => tag.user_id === userId && tag.name === name)) {
      throw new Error("UNIQUE constraint failed: tags.user_id, tags.name");
    }

    state.tags.push({
      id,
      user_id: userId,
      name,
      type,
      created_at: createdAt,
      updated_at: updatedAt
    });
    return;
  }

  if (normalizedSql.startsWith("insert or ignore into book_tags")) {
    const [bookId, tagId] = bindings as [string, string, string];
    const tag = state.tags.find((item) => item.id === tagId);

    if (!tag || state.bookTags.some((bookTag) => bookTag.book_id === bookId && bookTag.id === tagId)) {
      return;
    }

    state.bookTags.push({
      book_id: bookId,
      ...tag
    });
    return;
  }

  if (normalizedSql.startsWith("delete from book_tags where book_id = ? and tag_id = ?")) {
    const [bookId, tagId] = bindings as [string, string];
    state.bookTags = state.bookTags.filter((bookTag) => bookTag.book_id !== bookId || bookTag.id !== tagId);
    return;
  }

  if (normalizedSql.startsWith("update books set updated_at")) {
    const book = state.books.find((item) => item.user_id === bindings.at(-2) && item.id === bindings.at(-1));

    if (!book) {
      return;
    }

    if (normalizedSql.includes("rating = ?")) {
      book.rating = bindings[1] as number | null;
    }

    if (normalizedSql.includes("status = ?")) {
      book.status = bindings[1] as string;
    }

    book.updated_at = bindings[0] as string;
    return;
  }

  if (normalizedSql.startsWith("insert into reviews")) {
    const [
      id,
      userId,
      bookId,
      shortComment,
      fullReview,
      recommendReason,
      warningPoint,
      recommended,
      targetReaders,
      createdAt,
      updatedAt
    ] = bindings as [
      string,
      string,
      string,
      string | null,
      string | null,
      string | null,
      string | null,
      number | null,
      string | null,
      string,
      string
    ];
    const existing = state.reviews.find((review) => review.user_id === userId && review.book_id === bookId);
    const row = {
      id,
      user_id: userId,
      book_id: bookId,
      short_comment: shortComment,
      full_review: fullReview,
      recommend_reason: recommendReason,
      warning_point: warningPoint,
      recommended,
      target_readers: targetReaders,
      created_at: existing?.created_at ?? createdAt,
      updated_at: updatedAt
    };

    if (existing) {
      Object.assign(existing, row);
    } else {
      state.reviews.push(row);
    }

    return;
  }

  if (normalizedSql.startsWith("insert into drop_reasons")) {
    const [id, userId, bookId, chapterId, reason, note, mayReadLater, createdAt, updatedAt] = bindings as [
      string,
      string,
      string,
      string | null,
      string,
      string | null,
      number,
      string,
      string
    ];

    state.dropReasons.push({
      id,
      user_id: userId,
      book_id: bookId,
      chapter_id: chapterId,
      reason,
      note,
      may_read_later: mayReadLater,
      created_at: createdAt,
      updated_at: updatedAt
    });
    return;
  }

  if (normalizedSql.startsWith("update drop_reasons")) {
    const [chapterId, reason, note, mayReadLater, updatedAt, id, userId, bookId] = bindings as [
      string | null,
      string,
      string | null,
      number,
      string,
      string,
      string,
      string
    ];
    const existing = state.dropReasons.find(
      (dropReason) => dropReason.id === id && dropReason.user_id === userId && dropReason.book_id === bookId
    );

    if (existing) {
      existing.chapter_id = chapterId;
      existing.reason = reason;
      existing.note = note;
      existing.may_read_later = mayReadLater;
      existing.updated_at = updatedAt;
    }

    return;
  }

  throw new Error(`Unhandled SQL: ${normalizedSql}`);
}

function queryStatement(sql: string, bindings: unknown[], state: TestDatabaseState): unknown[] {
  const normalizedSql = normalizeSql(sql);

  if (normalizedSql.includes("from books")) {
    if (normalizedSql.includes("where user_id = ? and id = ?")) {
      const [userId, bookId] = bindings as [string, string];
      return state.books.filter((book) => book.user_id === userId && book.id === bookId);
    }

    const [userId] = bindings as [string];
    let books = state.books.filter((book) => book.user_id === userId);

    if (normalizedSql.includes("lower(books.title) like ?")) {
      const keyword = String(bindings[1]).replaceAll("%", "").toLowerCase();
      books = books.filter((book) => {
        return book.title.toLowerCase().includes(keyword) || book.author?.toLowerCase().includes(keyword);
      });
    }

    if (normalizedSql.includes("from book_tags") && normalizedSql.includes("tags.name = ?")) {
      const tagName = String(bindings.at(-1));
      books = books.filter((book) =>
        state.bookTags.some((bookTag) => bookTag.book_id === book.id && bookTag.user_id === book.user_id && bookTag.name === tagName)
      );
    }

    return books;
  }

  if (normalizedSql.includes("from book_tags")) {
    const [userId, ...bookIds] = bindings as [string, ...string[]];
    return state.bookTags
      .filter((bookTag) => bookTag.user_id === userId && bookIds.includes(bookTag.book_id))
      .sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name));
  }

  if (normalizedSql.includes("from tags")) {
    const [userId, tagId] = bindings as [string, string | undefined];
    const tags = state.tags.filter((tag) => tag.user_id === userId && (tagId === undefined || tag.id === tagId));
    return tags.sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name));
  }

  if (normalizedSql.includes("from chapters")) {
    const [bookId] = bindings as [string];
    return state.chapters
      .filter((chapter) => chapter.book_id === bookId)
      .sort((left, right) => left.chapter_index - right.chapter_index);
  }

  if (normalizedSql.includes("from book_ratings")) {
    const [userId, bookId] = bindings as [string, string];
    return state.ratings.filter((rating) => rating.user_id === userId && rating.book_id === bookId);
  }

  if (normalizedSql.includes("from reviews")) {
    const [userId, bookId] = bindings as [string, string];
    return state.reviews.filter((review) => review.user_id === userId && review.book_id === bookId);
  }

  if (normalizedSql.includes("from drop_reasons")) {
    const [userId, bookId] = bindings as [string, string];
    return state.dropReasons
      .filter((dropReason) => dropReason.user_id === userId && dropReason.book_id === bookId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }

  throw new Error(`Unhandled SQL: ${normalizedSql}`);
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}
