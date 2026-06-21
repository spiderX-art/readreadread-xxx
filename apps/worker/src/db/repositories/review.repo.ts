export interface ReviewRow {
  id: string;
  user_id: string;
  book_id: string;
  short_comment: string | null;
  full_review: string | null;
}
