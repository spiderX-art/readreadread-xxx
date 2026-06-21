import type { Book } from "shared";

export function searchBookshelf(books: Book[], q: string): Book[] {
  const keyword = q.trim().toLowerCase();

  if (!keyword) {
    return books;
  }

  return books.filter((book) => {
    return book.title.toLowerCase().includes(keyword) || book.author?.toLowerCase().includes(keyword);
  });
}
