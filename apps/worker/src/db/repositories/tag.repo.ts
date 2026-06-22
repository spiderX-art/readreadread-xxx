export interface TagRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface BookTagRow extends TagRow {
  book_id: string;
}

const TAG_COLUMNS = "id, user_id, name, type, created_at, updated_at";

export async function listTagRows(db: D1Database, userId: string): Promise<TagRow[]> {
  const result = await db
    .prepare(
      `
        SELECT ${TAG_COLUMNS}
        FROM tags
        WHERE user_id = ?
        ORDER BY type ASC, lower(name) ASC
      `
    )
    .bind(userId)
    .all<TagRow>();

  return result.results ?? [];
}

export async function findTagRow(db: D1Database, userId: string, tagId: string): Promise<TagRow | null> {
  return db
    .prepare(
      `
        SELECT ${TAG_COLUMNS}
        FROM tags
        WHERE user_id = ? AND id = ?
        LIMIT 1
      `
    )
    .bind(userId, tagId)
    .first<TagRow>();
}

export async function createTagRow(
  db: D1Database,
  input: { id: string; userId: string; name: string; type: string; createdAt: string; updatedAt: string }
): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO tags (id, user_id, name, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .bind(input.id, input.userId, input.name, input.type, input.createdAt, input.updatedAt)
    .run();
}

export async function attachTagToBookRow(
  db: D1Database,
  input: { bookId: string; tagId: string; createdAt: string }
): Promise<void> {
  await db
    .prepare(
      `
        INSERT OR IGNORE INTO book_tags (book_id, tag_id, created_at)
        VALUES (?, ?, ?)
      `
    )
    .bind(input.bookId, input.tagId, input.createdAt)
    .run();
}

export async function detachTagFromBookRow(db: D1Database, bookId: string, tagId: string): Promise<void> {
  await db.prepare("DELETE FROM book_tags WHERE book_id = ? AND tag_id = ?").bind(bookId, tagId).run();
}

export async function listTagRowsForBooks(db: D1Database, userId: string, bookIds: string[]): Promise<BookTagRow[]> {
  if (!bookIds.length) {
    return [];
  }

  const placeholders = bookIds.map(() => "?").join(", ");
  const result = await db
    .prepare(
      `
        SELECT
          book_tags.book_id,
          tags.${TAG_COLUMNS.replaceAll(", ", ", tags.")}
        FROM book_tags
        JOIN tags ON tags.id = book_tags.tag_id
        WHERE tags.user_id = ?
          AND book_tags.book_id IN (${placeholders})
        ORDER BY tags.type ASC, lower(tags.name) ASC
      `
    )
    .bind(userId, ...bookIds)
    .all<BookTagRow>();

  return result.results ?? [];
}
