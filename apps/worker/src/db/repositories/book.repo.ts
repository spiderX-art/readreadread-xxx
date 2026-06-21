export interface BookRow {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}
