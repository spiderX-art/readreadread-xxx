import { apiGet } from "./api";

export interface BookSearchHit {
  chapterId: string;
  chapterTitle: string;
  context: string;
  position: number;
}

export function searchInsideBook(bookId: string, q: string): Promise<{ items: BookSearchHit[]; total: number }> {
  return apiGet(`/api/books/${bookId}/search?q=${encodeURIComponent(q)}`);
}
