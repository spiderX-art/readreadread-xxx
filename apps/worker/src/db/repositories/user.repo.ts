export interface UserRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertUserInput {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  now: string;
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

export async function upsertUserRow(db: D1Database, input: UpsertUserInput): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO users (
          id,
          display_name,
          avatar_url,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          display_name = excluded.display_name,
          avatar_url = excluded.avatar_url,
          updated_at = excluded.updated_at
      `
    )
    .bind(input.id, input.displayName ?? null, input.avatarUrl ?? null, input.now, input.now)
    .run();
}
