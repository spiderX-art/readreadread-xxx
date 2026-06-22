import type { Book, CreateSyncJobResult, ImportPreview, SyncImportResult, SyncJob } from "shared";
import { apiGet, apiPost } from "./api";

export interface ImportTxtRequest {
  sourceFileId: string;
  sourcePath: string;
  fileName: string;
  fileSize: number;
  title?: string;
  author?: string;
}

export interface ImportTxtResult {
  job: {
    id: string;
    status: "success";
    bookId: string;
  };
  book: Book;
}

export function previewTxtImport(body: ImportTxtRequest): Promise<ImportPreview> {
  return apiPost<ImportPreview>("/api/import/preview", body);
}

export function importTxtFromNetdisk(body: ImportTxtRequest): Promise<ImportTxtResult> {
  return apiPost<ImportTxtResult>("/api/import/txt", body);
}

export function syncPreviewImports(path = "/小说"): Promise<SyncImportResult> {
  return apiPost<SyncImportResult>("/api/import/sync-preview", { path });
}

export function createSyncImportJob(path = "/小说"): Promise<CreateSyncJobResult> {
  return apiPost<CreateSyncJobResult>("/api/import/sync-jobs", { path });
}

export function getSyncImportJob(jobId: string): Promise<SyncJob> {
  return apiGet<SyncJob>(`/api/import/sync-jobs/${jobId}`);
}

export function retrySyncImportJobItem(jobId: string, itemId: string): Promise<CreateSyncJobResult> {
  return apiPost<CreateSyncJobResult>(`/api/import/sync-jobs/${jobId}/items/${itemId}/retry`);
}
