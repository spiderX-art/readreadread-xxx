import type { Book, ImportPreview } from "shared";
import { apiPost } from "./api";

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
