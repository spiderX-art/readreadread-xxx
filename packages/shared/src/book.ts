export const BOOK_STATUSES = [
  "not_started",
  "reading",
  "paused",
  "dropped",
  "finished",
  "reread",
  "favorite",
  "masterpiece",
  "avoid"
] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];

export interface Book {
  id: string;
  userId: string;
  title: string;
  author?: string;
  sourceFileId?: string;
  sourcePath?: string;
  fileName: string;
  fileSize: number;
  rawObjectKey?: string;
  wordCount: number;
  chapterCount: number;
  status: BookStatus;
  rating?: number;
  createdAt: string;
  updatedAt: string;
  lastReadAt?: string;
}

export interface BookSearchQuery {
  q?: string;
  status?: BookStatus;
  tag?: string;
  minRating?: number;
  maxRating?: number;
}
