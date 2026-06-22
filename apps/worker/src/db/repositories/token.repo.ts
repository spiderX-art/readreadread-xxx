export interface BaiduTokenRow {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

const BAIDU_TOKEN_COLUMNS = `
  id,
  user_id,
  access_token,
  refresh_token,
  expires_at,
  created_at,
  updated_at
`;

export async function findLatestBaiduTokenRow(db: D1Database, userId: string): Promise<BaiduTokenRow | null> {
  return db
    .prepare(
      `
        SELECT ${BAIDU_TOKEN_COLUMNS}
        FROM baidu_tokens
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `
    )
    .bind(userId)
    .first<BaiduTokenRow>();
}

export async function replaceBaiduTokenRow(
  db: D1Database,
  input: {
    id: string;
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
  }
): Promise<void> {
  await db.prepare("DELETE FROM baidu_tokens WHERE user_id = ?").bind(input.userId).run();
  await db
    .prepare(
      `
        INSERT INTO baidu_tokens (
          id,
          user_id,
          access_token,
          refresh_token,
          expires_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      input.id,
      input.userId,
      input.accessToken,
      input.refreshToken,
      input.expiresAt,
      input.createdAt,
      input.updatedAt
    )
    .run();
}
