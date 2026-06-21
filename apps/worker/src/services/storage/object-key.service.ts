export function rawTxtObjectKey(userId: string, bookId: string): string {
  return `users/${userId}/books/${bookId}/raw/source.txt`;
}

export function chapterObjectKey(userId: string, bookId: string, chapterIndex: number): string {
  return `users/${userId}/books/${bookId}/chapters/${chapterIndex}.txt`;
}

export function coverObjectKey(userId: string, bookId: string): string {
  return `users/${userId}/books/${bookId}/cover.jpg`;
}

export function importTempObjectKey(userId: string, importJobId: string): string {
  return `users/${userId}/imports/${importJobId}/source.txt`;
}
