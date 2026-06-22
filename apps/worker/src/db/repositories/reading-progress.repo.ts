export interface ReadingProgressRow {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id: string | null;
  scroll_position: number;
  progress_percent: number;
  updated_at: string;
}

export interface UpsertReadingProgressRowInput {
  id: string;
  userId: string;
  bookId: string;
  chapterId?: string;
  scrollPosition: number;
  progressPercent: number;
  updatedAt: string;
}

const READING_PROGRESS_COLUMNS = `
  id,
  user_id,
  book_id,
  chapter_id,
  scroll_position,
  progress_percent,
  updated_at
`;

export async function findReadingProgressRow(
  db: D1Database,
  userId: string,
  bookId: string
): Promise<ReadingProgressRow | null> {
  return db
    .prepare(
      `
        SELECT ${READING_PROGRESS_COLUMNS}
        FROM reading_progress
        WHERE user_id = ? AND book_id = ?
        LIMIT 1
      `
    )
    .bind(userId, bookId)
    .first<ReadingProgressRow>();
}

export async function upsertReadingProgressRow(
  db: D1Database,
  input: UpsertReadingProgressRowInput
): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO reading_progress (
          id,
          user_id,
          book_id,
          chapter_id,
          scroll_position,
          progress_percent,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, book_id) DO UPDATE SET
          chapter_id = excluded.chapter_id,
          scroll_position = excluded.scroll_position,
          progress_percent = excluded.progress_percent,
          updated_at = excluded.updated_at
      `
    )
    .bind(
      input.id,
      input.userId,
      input.bookId,
      input.chapterId ?? null,
      input.scrollPosition,
      input.progressPercent,
      input.updatedAt
    )
    .run();
}
