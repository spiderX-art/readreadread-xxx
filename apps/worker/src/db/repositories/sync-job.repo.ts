export interface SyncJobRow {
  id: string;
  user_id: string;
  path: string;
  status: string;
  message: string | null;
  scanned_count: number;
  candidate_count: number;
  processed_count: number;
  imported_count: number;
  skipped_count: number;
  failed_count: number;
  current_source_file_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface SyncJobItemRow {
  id: string;
  job_id: string;
  user_id: string;
  source_file_id: string;
  source_path: string;
  file_name: string;
  file_size: number;
  status: string;
  message: string | null;
  code: string | null;
  book_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSyncJobRowInput {
  id: string;
  userId: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSyncJobItemRowInput {
  id: string;
  jobId: string;
  userId: string;
  sourceFileId: string;
  sourcePath: string;
  fileName: string;
  fileSize: number;
  status?: "pending" | "skipped";
  message?: string;
  bookId?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncJobCounters {
  processedCount: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
}

const SYNC_JOB_COLUMNS = `
  id,
  user_id,
  path,
  status,
  message,
  scanned_count,
  candidate_count,
  processed_count,
  imported_count,
  skipped_count,
  failed_count,
  current_source_file_id,
  created_at,
  updated_at,
  completed_at
`;

const SYNC_JOB_ITEM_COLUMNS = `
  id,
  job_id,
  user_id,
  source_file_id,
  source_path,
  file_name,
  file_size,
  status,
  message,
  code,
  book_id,
  title,
  created_at,
  updated_at
`;

export async function createSyncJobRow(db: D1Database, input: CreateSyncJobRowInput): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO sync_jobs (
          id,
          user_id,
          path,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, 'pending', ?, ?)
      `
    )
    .bind(input.id, input.userId, input.path, input.createdAt, input.updatedAt)
    .run();
}

export async function findSyncJobRow(db: D1Database, jobId: string): Promise<SyncJobRow | null> {
  return db
    .prepare(
      `
        SELECT ${SYNC_JOB_COLUMNS}
        FROM sync_jobs
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(jobId)
    .first<SyncJobRow>();
}

export async function listSyncJobItemRows(db: D1Database, jobId: string): Promise<SyncJobItemRow[]> {
  const result = await db
    .prepare(
      `
        SELECT ${SYNC_JOB_ITEM_COLUMNS}
        FROM sync_job_items
        WHERE job_id = ?
        ORDER BY created_at ASC
      `
    )
    .bind(jobId)
    .all<SyncJobItemRow>();

  return result.results ?? [];
}

export async function findSyncJobItemRow(
  db: D1Database,
  jobId: string,
  itemId: string
): Promise<SyncJobItemRow | null> {
  return db
    .prepare(
      `
        SELECT ${SYNC_JOB_ITEM_COLUMNS}
        FROM sync_job_items
        WHERE job_id = ? AND id = ?
        LIMIT 1
      `
    )
    .bind(jobId, itemId)
    .first<SyncJobItemRow>();
}

export async function createSyncJobItemRow(db: D1Database, input: CreateSyncJobItemRowInput): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO sync_job_items (
          id,
          job_id,
          user_id,
          source_file_id,
          source_path,
          file_name,
          file_size,
          status,
          message,
          book_id,
          title,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      input.id,
      input.jobId,
      input.userId,
      input.sourceFileId,
      input.sourcePath,
      input.fileName,
      input.fileSize,
      input.status ?? "pending",
      input.message ?? null,
      input.bookId ?? null,
      input.title ?? null,
      input.createdAt,
      input.updatedAt
    )
    .run();
}

export async function updateSyncJobScanning(db: D1Database, jobId: string, updatedAt: string): Promise<void> {
  await db
    .prepare(
      `
        UPDATE sync_jobs
        SET status = 'scanning',
            message = NULL,
            current_source_file_id = NULL,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(updatedAt, jobId)
    .run();
}

export async function updateSyncJobScanResult(
  db: D1Database,
  jobId: string,
  input: {
    scannedCount: number;
    candidateCount: number;
    counters: SyncJobCounters;
    updatedAt: string;
  }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE sync_jobs
        SET status = ?,
            scanned_count = ?,
            candidate_count = ?,
            processed_count = ?,
            imported_count = ?,
            skipped_count = ?,
            failed_count = ?,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(
      input.counters.processedCount >= input.candidateCount ? "completed" : "importing",
      input.scannedCount,
      input.candidateCount,
      input.counters.processedCount,
      input.counters.importedCount,
      input.counters.skippedCount,
      input.counters.failedCount,
      input.updatedAt,
      jobId
    )
    .run();
}

export async function updateSyncJobImporting(
  db: D1Database,
  jobId: string,
  sourceFileId: string,
  updatedAt: string
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE sync_jobs
        SET status = 'importing',
            current_source_file_id = ?,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(sourceFileId, updatedAt, jobId)
    .run();
}

export async function updateSyncJobProgress(
  db: D1Database,
  jobId: string,
  counters: SyncJobCounters,
  updatedAt: string
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE sync_jobs
        SET processed_count = ?,
            imported_count = ?,
            skipped_count = ?,
            failed_count = ?,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(
      counters.processedCount,
      counters.importedCount,
      counters.skippedCount,
      counters.failedCount,
      updatedAt,
      jobId
    )
    .run();
}

export async function updateSyncJobCompleted(
  db: D1Database,
  jobId: string,
  counters: SyncJobCounters,
  completedAt: string
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE sync_jobs
        SET status = 'completed',
            processed_count = ?,
            imported_count = ?,
            skipped_count = ?,
            failed_count = ?,
            current_source_file_id = NULL,
            completed_at = ?,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(
      counters.processedCount,
      counters.importedCount,
      counters.skippedCount,
      counters.failedCount,
      completedAt,
      completedAt,
      jobId
    )
    .run();
}

export async function updateSyncJobFailed(
  db: D1Database,
  jobId: string,
  message: string,
  updatedAt: string
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE sync_jobs
        SET status = 'failed',
            message = ?,
            current_source_file_id = NULL,
            completed_at = ?,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(message, updatedAt, updatedAt, jobId)
    .run();
}

export async function updateSyncJobItemImporting(db: D1Database, itemId: string, updatedAt: string): Promise<void> {
  await db
    .prepare(
      `
        UPDATE sync_job_items
        SET status = 'importing',
            message = NULL,
            code = NULL,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(updatedAt, itemId)
    .run();
}

export async function updateSyncJobItemImported(
  db: D1Database,
  itemId: string,
  input: { bookId: string; title: string; fileName: string; fileSize: number; sourcePath: string; updatedAt: string }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE sync_job_items
        SET status = 'imported',
            message = NULL,
            code = NULL,
            book_id = ?,
            title = ?,
            file_name = ?,
            file_size = ?,
            source_path = ?,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(input.bookId, input.title, input.fileName, input.fileSize, input.sourcePath, input.updatedAt, itemId)
    .run();
}

export async function updateSyncJobItemSkipped(
  db: D1Database,
  itemId: string,
  input: { bookId?: string; title?: string; message?: string; updatedAt: string }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE sync_job_items
        SET status = 'skipped',
            message = ?,
            code = NULL,
            book_id = ?,
            title = ?,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(input.message ?? null, input.bookId ?? null, input.title ?? null, input.updatedAt, itemId)
    .run();
}

export async function updateSyncJobItemFailed(
  db: D1Database,
  itemId: string,
  input: { message: string; code?: string; updatedAt: string }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE sync_job_items
        SET status = 'failed',
            message = ?,
            code = ?,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(input.message, input.code ?? null, input.updatedAt, itemId)
    .run();
}
