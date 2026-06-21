import { BOOK_STATUSES, type BookStatus } from "shared";

export function isBookStatus(value: unknown): value is BookStatus {
  return typeof value === "string" && BOOK_STATUSES.includes(value as BookStatus);
}
