import { defineStore } from "pinia";

export const useReaderStore = defineStore("reader", {
  state: () => ({
    bookId: undefined as string | undefined,
    chapterId: undefined as string | undefined,
    scrollPosition: 0,
    progressPercent: 0
  }),
  actions: {
    setProgress(input: { bookId: string; chapterId?: string; scrollPosition: number; progressPercent: number }) {
      this.bookId = input.bookId;
      this.chapterId = input.chapterId;
      this.scrollPosition = input.scrollPosition;
      this.progressPercent = input.progressPercent;
    }
  }
});
