export async function first<T>(db: D1Database, sql: string, ...bindings: unknown[]): Promise<T | null> {
  return db.prepare(sql).bind(...bindings).first<T>();
}
