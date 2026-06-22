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

const BOOK_COLUMNS = `
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
  rating,
  created_at,
  updated_at,
  last_read_at
`;

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

export interface ListBookRowsQuery {
  q?: string;
  status?: string;
  tag?: string;
  minRating?: number;
  maxRating?: number;
}

export interface UpdateBookRowInput {
  title?: string;
  author?: string | null;
  status?: string;
  rating?: number | null;
  updatedAt: string;
  lastReadAt?: string | null;
}

export async function listBookRows(db: D1Database, userId: string, query: ListBookRowsQuery = {}): Promise<BookRow[]> {
  const where = ["books.user_id = ?"];
  const bindings: unknown[] = [userId];

  if (query.q?.trim()) {
    where.push("(lower(books.title) LIKE ? OR lower(coalesce(books.author, '')) LIKE ?)");
    const keyword = `%${query.q.trim().toLowerCase()}%`;
    bindings.push(keyword, keyword);
  }

  if (query.status) {
    where.push("books.status = ?");
    bindings.push(query.status);
  }

  if (query.tag?.trim()) {
    where.push(
      `EXISTS (
        SELECT 1
        FROM book_tags
        JOIN tags ON tags.id = book_tags.tag_id
        WHERE book_tags.book_id = books.id
          AND tags.user_id = books.user_id
          AND tags.name = ?
      )`
    );
    bindings.push(query.tag.trim());
  }

  if (query.minRating !== undefined) {
    where.push("books.rating >= ?");
    bindings.push(query.minRating);
  }

  if (query.maxRating !== undefined) {
    where.push("books.rating <= ?");
    bindings.push(query.maxRating);
  }

  const result = await db
    .prepare(
      `
        SELECT ${BOOK_COLUMNS}
        FROM books
        WHERE ${where.join(" AND ")}
        ORDER BY coalesce(last_read_at, updated_at) DESC, created_at DESC
      `
    )
    .bind(...bindings)
    .all<BookRow>();

  return result.results ?? [];
}

export async function findBookRow(db: D1Database, userId: string, bookId: string): Promise<BookRow | null> {
  return db
    .prepare(
      `
        SELECT ${BOOK_COLUMNS}
        FROM books
        WHERE user_id = ? AND id = ?
        LIMIT 1
      `
    )
    .bind(userId, bookId)
    .first<BookRow>();
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

export async function updateBookRow(
  db: D1Database,
  userId: string,
  bookId: string,
  input: UpdateBookRowInput
): Promise<void> {
  const assignments = ["updated_at = ?"];
  const bindings: unknown[] = [input.updatedAt];

  if (input.title !== undefined) {
    assignments.push("title = ?");
    bindings.push(input.title);
  }

  if (input.author !== undefined) {
    assignments.push("author = ?");
    bindings.push(input.author);
  }

  if (input.status !== undefined) {
    assignments.push("status = ?");
    bindings.push(input.status);
  }

  if (input.rating !== undefined) {
    assignments.push("rating = ?");
    bindings.push(input.rating);
  }

  if (input.lastReadAt !== undefined) {
    assignments.push("last_read_at = ?");
    bindings.push(input.lastReadAt);
  }

  bindings.push(userId, bookId);

  await db
    .prepare(
      `
        UPDATE books
        SET ${assignments.join(", ")}
        WHERE user_id = ? AND id = ?
      `
    )
    .bind(...bindings)
    .run();
}

export async function deleteBookRow(db: D1Database, userId: string, bookId: string): Promise<void> {
  await db.prepare("UPDATE import_jobs SET book_id = NULL WHERE user_id = ? AND book_id = ?").bind(userId, bookId).run();
  await db.prepare("DELETE FROM book_tags WHERE book_id = ?").bind(bookId).run();
  await db.prepare("DELETE FROM reading_progress WHERE user_id = ? AND book_id = ?").bind(userId, bookId).run();
  await db.prepare("DELETE FROM book_ratings WHERE user_id = ? AND book_id = ?").bind(userId, bookId).run();
  await db.prepare("DELETE FROM drop_reasons WHERE user_id = ? AND book_id = ?").bind(userId, bookId).run();
  await db.prepare("DELETE FROM reviews WHERE user_id = ? AND book_id = ?").bind(userId, bookId).run();
  await db.prepare("DELETE FROM chapters WHERE book_id = ?").bind(bookId).run();
  await db.prepare("DELETE FROM books WHERE user_id = ? AND id = ?").bind(userId, bookId).run();
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
