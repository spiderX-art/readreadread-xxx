export interface NetdiskFile {
  fsId: string;
  path: string;
  name: string;
  size: number;
  isDir: boolean;
  ext?: string;
  modifiedAt?: string;
  imported?: boolean;
  bookId?: string;
}

export interface ImportPreview {
  sourceFileId: string;
  sourcePath: string;
  fileName: string;
  fileSize: number;
  title: string;
  author?: string;
  versionTag?: string;
  estimatedChapterCount: number;
  sampleChapterTitles: string[];
}

export interface SyncImportItem {
  sourceFileId: string;
  sourcePath: string;
  fileName: string;
  fileSize: number;
  bookId?: string;
  title?: string;
}

export interface SyncImportFailure extends SyncImportItem {
  message: string;
  code?: string;
}

export interface SyncImportResult {
  path: string;
  scannedCount: number;
  candidateCount: number;
  imported: SyncImportItem[];
  skipped: SyncImportItem[];
  failed: SyncImportFailure[];
}

export type SyncJobStatus = "pending" | "scanning" | "importing" | "completed" | "failed";
export type SyncJobItemStatus = "pending" | "importing" | "imported" | "skipped" | "failed";

export interface SyncJobItem extends SyncImportItem {
  id: string;
  status: SyncJobItemStatus;
  message?: string;
  code?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncJob {
  id: string;
  userId: string;
  path: string;
  status: SyncJobStatus;
  message?: string;
  scannedCount: number;
  candidateCount: number;
  processedCount: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  currentSourceFileId?: string;
  items: SyncJobItem[];
  imported: SyncJobItem[];
  skipped: SyncJobItem[];
  failed: SyncJobItem[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateSyncJobResult {
  jobId: string;
  job: SyncJob;
}
