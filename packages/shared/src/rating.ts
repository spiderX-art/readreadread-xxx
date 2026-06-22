export const RATING_FIELDS = ["overall", "writing"] as const;

export type RatingField = (typeof RATING_FIELDS)[number];

export interface BookRating {
  id: string;
  userId: string;
  bookId: string;
  overall?: number;
  plot?: number;
  writing?: number;
  character?: number;
  pacing?: number;
  worldbuilding?: number;
  satisfaction?: number;
  endingStability?: number;
  rereadValue?: number;
  createdAt: string;
  updatedAt: string;
}
