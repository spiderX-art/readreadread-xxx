PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS baidu_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  source_file_id TEXT,
  source_path TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  raw_object_key TEXT,
  word_count INTEGER DEFAULT 0,
  chapter_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'reading', 'paused', 'dropped', 'finished', 'reread', 'favorite', 'masterpiece', 'avoid')),
  rating REAL CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10 AND rating * 2 = CAST(rating * 2 AS INTEGER))),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_read_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  title TEXT NOT NULL,
  chapter_index INTEGER NOT NULL,
  object_key TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(book_id) REFERENCES books(id)
);

CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON chapters(book_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_book_index ON chapters(book_id, chapter_index);

CREATE TABLE IF NOT EXISTS reading_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT,
  scroll_position INTEGER NOT NULL DEFAULT 0,
  progress_percent REAL NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(book_id) REFERENCES books(id),
  FOREIGN KEY(chapter_id) REFERENCES chapters(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_user_book ON reading_progress(user_id, book_id);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('genre', 'experience', 'warning', 'custom')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);

CREATE TABLE IF NOT EXISTS book_tags (
  book_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(book_id, tag_id),
  FOREIGN KEY(book_id) REFERENCES books(id),
  FOREIGN KEY(tag_id) REFERENCES tags(id)
);

CREATE TABLE IF NOT EXISTS book_ratings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  overall REAL CHECK (overall IS NULL OR (overall >= 1 AND overall <= 10 AND overall * 2 = CAST(overall * 2 AS INTEGER))),
  plot REAL CHECK (plot IS NULL OR (plot >= 1 AND plot <= 10 AND plot * 2 = CAST(plot * 2 AS INTEGER))),
  writing REAL CHECK (writing IS NULL OR (writing >= 1 AND writing <= 10 AND writing * 2 = CAST(writing * 2 AS INTEGER))),
  character REAL CHECK (character IS NULL OR (character >= 1 AND character <= 10 AND character * 2 = CAST(character * 2 AS INTEGER))),
  pacing REAL CHECK (pacing IS NULL OR (pacing >= 1 AND pacing <= 10 AND pacing * 2 = CAST(pacing * 2 AS INTEGER))),
  worldbuilding REAL CHECK (worldbuilding IS NULL OR (worldbuilding >= 1 AND worldbuilding <= 10 AND worldbuilding * 2 = CAST(worldbuilding * 2 AS INTEGER))),
  satisfaction REAL CHECK (satisfaction IS NULL OR (satisfaction >= 1 AND satisfaction <= 10 AND satisfaction * 2 = CAST(satisfaction * 2 AS INTEGER))),
  ending_stability REAL CHECK (ending_stability IS NULL OR (ending_stability >= 1 AND ending_stability <= 10 AND ending_stability * 2 = CAST(ending_stability * 2 AS INTEGER))),
  reread_value REAL CHECK (reread_value IS NULL OR (reread_value >= 1 AND reread_value <= 10 AND reread_value * 2 = CAST(reread_value * 2 AS INTEGER))),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(book_id) REFERENCES books(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_user_book ON book_ratings(user_id, book_id);

CREATE TABLE IF NOT EXISTS drop_reasons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT,
  reason TEXT NOT NULL,
  note TEXT,
  may_read_later INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(book_id) REFERENCES books(id),
  FOREIGN KEY(chapter_id) REFERENCES chapters(id)
);

CREATE INDEX IF NOT EXISTS idx_drop_reasons_book_id ON drop_reasons(book_id);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  short_comment TEXT,
  full_review TEXT,
  recommend_reason TEXT,
  warning_point TEXT,
  recommended INTEGER,
  target_readers TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(book_id) REFERENCES books(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_book ON reviews(user_id, book_id);

CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_file_id TEXT NOT NULL,
  source_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  message TEXT,
  book_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(book_id) REFERENCES books(id)
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_user_id ON import_jobs(user_id);
