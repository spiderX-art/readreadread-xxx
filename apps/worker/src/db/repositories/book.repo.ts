export interface BookRow {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  source_file_id: string | null;
  source_path: string | null;
  file_name: string;
  file_size: number;
  raw_object_key: string | null;
  word_count: number;
  chapter_count: number;
  status: string;
  rating: number | null;
  created_at: string;
  updated_at: string;
  last_read_at: string | null;
}

export interface CreateBookRowInput {
  id: string;
  userId: string;
  title: string;
  author?: string;
  sourceFileId: string;
  sourcePath: string;
  fileName: string;
  fileSize: number;
  rawObjectKey: string;
  createdAt: string;
  updatedAt: string;
}

export async function createBookRow(db: D1Database, input: CreateBookRowInput): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO books (
          id,
          user_id,
          title,
          author,
          source_file_id,
          source_path,
          file_name,
          file_size,
          raw_object_key,
          word_count,
          chapter_count,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'not_started', ?, ?)
      `
    )
    .bind(
      input.id,
      input.userId,
      input.title,
      input.author ?? null,
      input.sourceFileId,
      input.sourcePath,
      input.fileName,
      input.fileSize,
      input.rawObjectKey,
      input.createdAt,
      input.updatedAt
    )
    .run();
}

export async function updateBookImportStats(
  db: D1Database,
  bookId: string,
  chapterCount: number,
  wordCount: number,
  updatedAt: string
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE books
        SET chapter_count = ?,
            word_count = ?,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(chapterCount, wordCount, updatedAt, bookId)
    .run();
}
