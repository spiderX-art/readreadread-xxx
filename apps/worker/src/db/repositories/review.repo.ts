export interface ReviewRow {
  id: string;
  user_id: string;
  book_id: string;
  short_comment: string | null;
  full_review: string | null;
  recommend_reason: string | null;
  warning_point: string | null;
  recommended: number | null;
  target_readers: string | null;
  created_at: string;
  updated_at: string;
}

export interface DropReasonRow {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id: string | null;
  reason: string;
  note: string | null;
  may_read_later: number;
  created_at: string;
  updated_at: string;
}

export interface UpsertReviewRowInput {
  id: string;
  userId: string;
  bookId: string;
  shortComment?: string | null;
  fullReview?: string | null;
  recommendReason?: string | null;
  warningPoint?: string | null;
  recommended?: boolean | null;
  targetReaders?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDropReasonRowInput {
  id: string;
  userId: string;
  bookId: string;
  chapterId?: string | null;
  reason: string;
  note?: string | null;
  mayReadLater: boolean;
  createdAt: string;
  updatedAt: string;
}

const REVIEW_COLUMNS = `
  id,
  user_id,
  book_id,
  short_comment,
  full_review,
  recommend_reason,
  warning_point,
  recommended,
  target_readers,
  created_at,
  updated_at
`;

const DROP_REASON_COLUMNS = `
  id,
  user_id,
  book_id,
  chapter_id,
  reason,
  note,
  may_read_later,
  created_at,
  updated_at
`;

export async function findReviewRow(db: D1Database, userId: string, bookId: string): Promise<ReviewRow | null> {
  return db
    .prepare(
      `
        SELECT ${REVIEW_COLUMNS}
        FROM reviews
        WHERE user_id = ? AND book_id = ?
        LIMIT 1
      `
    )
    .bind(userId, bookId)
    .first<ReviewRow>();
}

export async function upsertReviewRow(db: D1Database, input: UpsertReviewRowInput): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO reviews (
          id,
          user_id,
          book_id,
          short_comment,
          full_review,
          recommend_reason,
          warning_point,
          recommended,
          target_readers,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, book_id) DO UPDATE SET
          short_comment = excluded.short_comment,
          full_review = excluded.full_review,
          recommend_reason = excluded.recommend_reason,
          warning_point = excluded.warning_point,
          recommended = excluded.recommended,
          target_readers = excluded.target_readers,
          updated_at = excluded.updated_at
      `
    )
    .bind(
      input.id,
      input.userId,
      input.bookId,
      normalizeText(input.shortComment),
      normalizeText(input.fullReview),
      normalizeText(input.recommendReason),
      normalizeText(input.warningPoint),
      input.recommended === undefined || input.recommended === null ? null : input.recommended ? 1 : 0,
      normalizeText(input.targetReaders),
      input.createdAt,
      input.updatedAt
    )
    .run();
}

export async function findLatestDropReasonRow(
  db: D1Database,
  userId: string,
  bookId: string
): Promise<DropReasonRow | null> {
  return db
    .prepare(
      `
        SELECT ${DROP_REASON_COLUMNS}
        FROM drop_reasons
        WHERE user_id = ? AND book_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `
    )
    .bind(userId, bookId)
    .first<DropReasonRow>();
}

export async function upsertLatestDropReasonRow(db: D1Database, input: UpsertDropReasonRowInput): Promise<void> {
  const existing = await findLatestDropReasonRow(db, input.userId, input.bookId);

  if (existing) {
    await db
      .prepare(
        `
          UPDATE drop_reasons
          SET chapter_id = ?,
              reason = ?,
              note = ?,
              may_read_later = ?,
              updated_at = ?
          WHERE id = ? AND user_id = ? AND book_id = ?
        `
      )
      .bind(
        input.chapterId ?? null,
        input.reason,
        normalizeText(input.note),
        input.mayReadLater ? 1 : 0,
        input.updatedAt,
        existing.id,
        input.userId,
        input.bookId
      )
      .run();
    return;
  }

  await db
    .prepare(
      `
        INSERT INTO drop_reasons (
          id,
          user_id,
          book_id,
          chapter_id,
          reason,
          note,
          may_read_later,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      input.id,
      input.userId,
      input.bookId,
      input.chapterId ?? null,
      input.reason,
      normalizeText(input.note),
      input.mayReadLater ? 1 : 0,
      input.createdAt,
      input.updatedAt
    )
    .run();
}

function normalizeText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
