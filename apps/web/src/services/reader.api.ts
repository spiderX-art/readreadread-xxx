import type { Chapter, ChapterContent, PageResult } from "shared";
import { apiGet, apiPost } from "./api";

export function listChapters(bookId: string): Promise<PageResult<Chapter>> {
  return apiGet<PageResult<Chapter>>(`/api/books/${bookId}/chapters`);
}

export function getChapter(bookId: string, chapterId: string): Promise<ChapterContent> {
  return apiGet<ChapterContent>(`/api/books/${bookId}/chapters/${chapterId}`);
}

export function saveProgress(bookId: string, body: unknown): Promise<{ saved: boolean }> {
  return apiPost<{ saved: boolean }>(`/api/books/${bookId}/progress`, body);
}
