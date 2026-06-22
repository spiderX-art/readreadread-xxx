import type { Chapter, ChapterContent, PageResult, ReadingProgress } from "shared";
import { apiGet, apiPost } from "./api";

export function listChapters(bookId: string): Promise<PageResult<Chapter>> {
  return apiGet<PageResult<Chapter>>(`/api/books/${bookId}/chapters`);
}

export function getChapter(bookId: string, chapterId: string): Promise<ChapterContent> {
  return apiGet<ChapterContent>(`/api/books/${bookId}/chapters/${chapterId}`);
}

export function getProgress(bookId: string): Promise<ReadingProgress> {
  return apiGet<ReadingProgress>(`/api/books/${bookId}/progress`);
}

export function saveProgress(
  bookId: string,
  body: Pick<ReadingProgress, "chapterId" | "scrollPosition" | "progressPercent">
): Promise<{ saved: boolean; progress: ReadingProgress }> {
  return apiPost<{ saved: boolean; progress: ReadingProgress }>(`/api/books/${bookId}/progress`, body);
}
