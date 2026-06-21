export function createChapterObjectKey(userId: string, bookId: string, chapterIndex: number): string {
  return `users/${userId}/books/${bookId}/chapters/${chapterIndex}.txt`;
}
