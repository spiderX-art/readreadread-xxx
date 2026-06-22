import { defineStore } from "pinia";
import type { Book, BookSearchQuery, BookStatus } from "shared";
import { deleteBook as deleteBookRequest, getBook, listBooks, searchBooks } from "../services/books.api";

export const useBooksStore = defineStore("books", {
  state: () => ({
    books: [] as Book[],
    loading: false,
    error: undefined as string | undefined
  }),
  actions: {
    async fetchBooks(query: BookSearchQuery = {}) {
      this.loading = true;
      this.error = undefined;

      try {
        const result = query.q || query.status || query.tag || query.minRating !== undefined || query.maxRating !== undefined
          ? await searchBooks(query)
          : await listBooks(query);
        this.books = result.items;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "书架加载失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async fetchBook(bookId: string): Promise<Book> {
      this.loading = true;
      this.error = undefined;

      try {
        const book = await getBook(bookId);
        const index = this.books.findIndex((item) => item.id === book.id);

        if (index >= 0) {
          this.books[index] = book;
        } else {
          this.books.push(book);
        }

        return book;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "书籍详情加载失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },
    byId(bookId: string): Book | undefined {
      return this.books.find((book) => book.id === bookId);
    },
    async deleteBook(bookId: string): Promise<void> {
      await deleteBookRequest(bookId);
      this.books = this.books.filter((book) => book.id !== bookId);
    },
    search(keyword: string, status: string): Book[] {
      const q = keyword.trim().toLowerCase();
      return this.books.filter((book) => {
        const matchesKeyword = !q || book.title.toLowerCase().includes(q) || book.author?.toLowerCase().includes(q);
        const matchesStatus = !status || book.status === (status as BookStatus);
        return matchesKeyword && matchesStatus;
      });
    }
  }
});
