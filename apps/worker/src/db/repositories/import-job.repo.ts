export interface ImportJobRow {
  id: string;
  user_id: string;
  source_file_id: string;
  source_path: string;
  file_name: string;
  status: string;
  message: string | null;
  book_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateImportJobRowInput {
  id: string;
  userId: string;
  sourceFileId: string;
  sourcePath: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
}

const IMPORT_JOB_COLUMNS = `
  id,
  user_id,
  source_file_id,
  source_path,
  file_name,
  status,
  message,
  book_id,
  created_at,
  updated_at
`;

export async function findImportJobRow(db: D1Database, jobId: string): Promise<ImportJobRow | null> {
  return db
    .prepare(
      `
        SELECT ${IMPORT_JOB_COLUMNS}
        FROM import_jobs
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(jobId)
    .first<ImportJobRow>();
}

export async function createImportJobRow(db: D1Database, input: CreateImportJobRowInput): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO import_jobs (
          id,
          user_id,
          source_file_id,
          source_path,
          file_name,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
      `
    )
    .bind(
      input.id,
      input.userId,
      input.sourceFileId,
      input.sourcePath,
      input.fileName,
      input.createdAt,
      input.updatedAt
    )
    .run();
}

export async function updateImportJobProcessing(db: D1Database, jobId: string, updatedAt: string): Promise<void> {
  await db
    .prepare(
      `
        UPDATE import_jobs
        SET status = 'processing',
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(updatedAt, jobId)
    .run();
}

export async function updateImportJobSuccess(
  db: D1Database,
  jobId: string,
  bookId: string,
  updatedAt: string
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE import_jobs
        SET status = 'success',
            book_id = ?,
            message = NULL,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(bookId, updatedAt, jobId)
    .run();
}

export async function updateImportJobFailed(
  db: D1Database,
  jobId: string,
  message: string,
  updatedAt: string
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE import_jobs
        SET status = 'failed',
            message = ?,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(message, updatedAt, jobId)
    .run();
}
