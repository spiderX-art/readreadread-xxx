export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  chapterIndex: number;
  objectKey: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterContent extends Chapter {
  content: string;
}

export interface ReadingProgress {
  id: string;
  userId: string;
  bookId: string;
  chapterId?: string;
  scrollPosition: number;
  progressPercent: number;
  updatedAt: string;
}
