import type { Book, BookRating, BookSearchQuery, BookStatus, DropReason, PageResult, RatingField, Review } from "shared";
import { apiDelete, apiGet, apiPatch, apiPut } from "./api";

export function listBooks(query: BookSearchQuery = {}): Promise<PageResult<Book>> {
  return apiGet<PageResult<Book>>(`/api/books${toQueryString(query)}`);
}

export function searchBooks(query: BookSearchQuery): Promise<PageResult<Book> & { query: BookSearchQuery }> {
  return apiGet<PageResult<Book> & { query: BookSearchQuery }>(`/api/books/search${toQueryString(query)}`);
}

export function getBook(bookId: string): Promise<Book> {
  return apiGet<Book>(`/api/books/${encodeURIComponent(bookId)}`);
}

export function updateBook(bookId: string, body: Partial<Pick<Book, "title" | "author" | "status" | "rating">>): Promise<Book> {
  return apiPatch<Book>(`/api/books/${encodeURIComponent(bookId)}`, body);
}

export function deleteBook(bookId: string): Promise<{ id: string; deleted: boolean }> {
  return apiDelete<{ id: string; deleted: boolean }>(`/api/books/${encodeURIComponent(bookId)}`);
}

export function updateBookStatus(bookId: string, status: BookStatus): Promise<Book> {
  return apiPatch<Book>(`/api/books/${encodeURIComponent(bookId)}/status`, { status });
}

export function getBookRating(bookId: string): Promise<BookRating | null> {
  return apiGet<BookRating | null>(`/api/books/${encodeURIComponent(bookId)}/rating`);
}

export function saveBookRating(
  bookId: string,
  rating: Partial<Record<RatingField, number | null>>
): Promise<BookRating | null> {
  return apiPut<BookRating | null>(`/api/books/${encodeURIComponent(bookId)}/rating`, rating);
}

export function getBookReview(bookId: string): Promise<Review | null> {
  return apiGet<Review | null>(`/api/books/${encodeURIComponent(bookId)}/review`);
}

export function saveBookReview(
  bookId: string,
  review: Partial<Pick<Review, "shortComment">>
): Promise<Review | null> {
  return apiPut<Review | null>(`/api/books/${encodeURIComponent(bookId)}/review`, review);
}

export function getDropReason(bookId: string): Promise<DropReason | null> {
  return apiGet<DropReason | null>(`/api/books/${encodeURIComponent(bookId)}/drop-reason`);
}

export function saveDropReason(
  bookId: string,
  dropReason: Pick<DropReason, "reason" | "mayReadLater"> & Partial<Pick<DropReason, "chapterId" | "note">>
): Promise<DropReason | null> {
  return apiPut<DropReason | null>(`/api/books/${encodeURIComponent(bookId)}/drop-reason`, dropReason);
}

function toQueryString(query: BookSearchQuery): string {
  const params = new URLSearchParams();

  if (query.q) {
    params.set("q", query.q);
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.tag) {
    params.set("tag", query.tag);
  }

  if (query.minRating !== undefined) {
    params.set("minRating", String(query.minRating));
  }

  if (query.maxRating !== undefined) {
    params.set("maxRating", String(query.maxRating));
  }

  const value = params.toString();
  return value ? `?${value}` : "";
}
