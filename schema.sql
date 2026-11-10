-- Run once on a NEW, independent Cloudflare D1 database.
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL CHECK (language IN ('en','zh')),
  type TEXT NOT NULL DEFAULT 'essay' CHECK (type IN ('essay','fiction','poetry','note')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  collection_slugs TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  UNIQUE(language,slug)
);
CREATE INDEX IF NOT EXISTS idx_posts_feed ON posts(language,status,published_at DESC);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  csrf_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_attempts (
  ip_key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_started INTEGER NOT NULL DEFAULT 0
);


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
