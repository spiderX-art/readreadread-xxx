import { defineStore } from "pinia";
import type { Book, BookStatus } from "shared";

const now = new Date().toISOString();

export const useBooksStore = defineStore("books", {
  state: () => ({
    books: [
      {
        id: "local-demo",
        userId: "local-user",
        title: "示例小说",
        author: "本地作者",
        fileName: "示例小说 - 本地作者.txt",
        fileSize: 0,
        wordCount: 120000,
        chapterCount: 36,
        status: "reading",
        rating: 8.5,
        createdAt: now,
        updatedAt: now,
        lastReadAt: now
      }
    ] satisfies Book[]
  }),
  actions: {
    byId(bookId: string): Book | undefined {
      return this.books.find((book) => book.id === bookId);
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
