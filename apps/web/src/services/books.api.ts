import type { Book, PageResult } from "shared";
import { apiGet } from "./api";

export function listBooks(): Promise<PageResult<Book>> {
  return apiGet<PageResult<Book>>("/api/books");
}
