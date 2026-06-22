export interface ChapterRow {
  id: string;
  book_id: string;
  title: string;
  chapter_index: number;
  object_key: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

const CHAPTER_COLUMNS = `
  id,
  book_id,
  title,
  chapter_index,
  object_key,
  word_count,
  created_at,
  updated_at
`;

export async function listChapterRows(db: D1Database, bookId: string): Promise<ChapterRow[]> {
  const result = await db
    .prepare(
      `
        SELECT ${CHAPTER_COLUMNS}
        FROM chapters
        WHERE book_id = ?
        ORDER BY chapter_index ASC
      `
    )
    .bind(bookId)
    .all<ChapterRow>();

  return result.results ?? [];
}

export async function findChapterRow(db: D1Database, bookId: string, chapterId: string): Promise<ChapterRow | null> {
  return db
    .prepare(
      `
        SELECT ${CHAPTER_COLUMNS}
        FROM chapters
        WHERE book_id = ? AND id = ?
        LIMIT 1
      `
    )
    .bind(bookId, chapterId)
    .first<ChapterRow>();
}

export async function findFirstChapterRow(db: D1Database, bookId: string): Promise<ChapterRow | null> {
  return db
    .prepare(
      `
        SELECT ${CHAPTER_COLUMNS}
        FROM chapters
        WHERE book_id = ?
        ORDER BY chapter_index ASC
        LIMIT 1
      `
    )
    .bind(bookId)
    .first<ChapterRow>();
}
