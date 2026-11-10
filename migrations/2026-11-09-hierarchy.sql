CREATE TABLE IF NOT EXISTS trn_books (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL CHECK (language IN ('en','zh')),
  series_slug TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trn_books_series ON trn_books(language,series_slug,sort_order);
CREATE TABLE IF NOT EXISTS trn_chapters (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES trn_books(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trn_chapters_book ON trn_chapters(book_id,sort_order);
CREATE TABLE IF NOT EXISTS trn_section_links (
  post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES trn_chapters(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trn_section_links_chapter ON trn_section_links(chapter_id,sort_order);
