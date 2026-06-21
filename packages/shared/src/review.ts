export interface DropReason {
  id: string;
  userId: string;
  bookId: string;
  chapterId?: string;
  reason: string;
  note?: string;
  mayReadLater: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  bookId: string;
  shortComment?: string;
  fullReview?: string;
  recommendReason?: string;
  warningPoint?: string;
  recommended?: boolean;
  targetReaders?: string;
  createdAt: string;
  updatedAt: string;
}
