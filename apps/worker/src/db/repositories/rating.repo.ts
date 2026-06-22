export interface RatingRow {
  id: string;
  user_id: string;
  book_id: string;
  overall: number | null;
  plot: number | null;
  writing: number | null;
  character: number | null;
  pacing: number | null;
  worldbuilding: number | null;
  satisfaction: number | null;
  ending_stability: number | null;
  reread_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertRatingRowInput {
  id: string;
  userId: string;
  bookId: string;
  overall?: number | null;
  plot?: number | null;
  writing?: number | null;
  character?: number | null;
  pacing?: number | null;
  worldbuilding?: number | null;
  satisfaction?: number | null;
  endingStability?: number | null;
  rereadValue?: number | null;
  createdAt: string;
  updatedAt: string;
}

const RATING_COLUMNS = `
  id,
  user_id,
  book_id,
  overall,
  plot,
  writing,
  character,
  pacing,
  worldbuilding,
  satisfaction,
  ending_stability,
  reread_value,
  created_at,
  updated_at
`;

export async function findRatingRow(db: D1Database, userId: string, bookId: string): Promise<RatingRow | null> {
  return db
    .prepare(
      `
        SELECT ${RATING_COLUMNS}
        FROM book_ratings
        WHERE user_id = ? AND book_id = ?
        LIMIT 1
      `
    )
    .bind(userId, bookId)
    .first<RatingRow>();
}

export async function upsertRatingRow(db: D1Database, input: UpsertRatingRowInput): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO book_ratings (
          id,
          user_id,
          book_id,
          overall,
          plot,
          writing,
          character,
          pacing,
          worldbuilding,
          satisfaction,
          ending_stability,
          reread_value,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, book_id) DO UPDATE SET
          overall = excluded.overall,
          plot = excluded.plot,
          writing = excluded.writing,
          character = excluded.character,
          pacing = excluded.pacing,
          worldbuilding = excluded.worldbuilding,
          satisfaction = excluded.satisfaction,
          ending_stability = excluded.ending_stability,
          reread_value = excluded.reread_value,
          updated_at = excluded.updated_at
      `
    )
    .bind(
      input.id,
      input.userId,
      input.bookId,
      input.overall ?? null,
      input.plot ?? null,
      input.writing ?? null,
      input.character ?? null,
      input.pacing ?? null,
      input.worldbuilding ?? null,
      input.satisfaction ?? null,
      input.endingStability ?? null,
      input.rereadValue ?? null,
      input.createdAt,
      input.updatedAt
    )
    .run();
}
