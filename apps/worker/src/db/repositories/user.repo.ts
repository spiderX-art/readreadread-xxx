export interface UserRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function ensureUserRow(db: D1Database, userId: string, now: string): Promise<void> {
  await db
    .prepare(
      `
        INSERT OR IGNORE INTO users (
          id,
          display_name,
          avatar_url,
          created_at,
          updated_at
        )
        VALUES (?, ?, NULL, ?, ?)
      `
    )
    .bind(userId, "Local Reader", now, now)
    .run();
}
