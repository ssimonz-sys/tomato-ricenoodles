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


CREATE TABLE IF NOT EXISTS trn_series (
  language TEXT NOT NULL CHECK (language IN ('en','zh')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  art TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'sage',
  category TEXT NOT NULL DEFAULT 'essay' CHECK (category IN ('essay','fiction','poetry','note')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (language, slug)
);
CREATE INDEX IF NOT EXISTS idx_trn_series_list ON trn_series(language,status,sort_order,title);
INSERT OR IGNORE INTO trn_series (language,slug,title,description,art,theme,category,status,sort_order,created_at,updated_at) VALUES
('en','organziology','Organziology','An ongoing inquiry into organizations and the ways we live together.','/assets/graphics/en-organziology.svg','copper','essay','published',0,'2026-11-09T00:00:00Z','2026-11-09T00:00:00Z'),
('en','basic-human-science','Basic Human Science','A closer look at the human world and the ideas that explain it.','/assets/graphics/en-basic-human-science.svg','sage','essay','published',10,'2026-11-09T00:00:00Z','2026-11-09T00:00:00Z'),
('en','on-ethics','On Ethics','Questions of morality, principles, and their place in daily life.','/assets/graphics/en-on-ethics.svg','ink','essay','published',20,'2026-11-09T00:00:00Z','2026-11-09T00:00:00Z'),
('zh','basic-humanities','基础人文科学','基础经济学、哲学、政治与社会科学','/assets/graphics/zh-basic-humanities.svg','stone','essay','published',0,'2026-11-09T00:00:00Z','2026-11-09T00:00:00Z'),
('zh','mission-of-capitalism','资本主义的历史使命','如果利润足够可观，资本家甚至愿意出卖吊死自己的绳子。','/assets/graphics/zh-mission-of-capitalism.svg','copper','essay','published',10,'2026-11-09T00:00:00Z','2026-11-09T00:00:00Z'),
('zh','on-morality','论道德','圣人不死，大盗不止。','/assets/graphics/zh-on-morality.svg','ink','essay','published',20,'2026-11-09T00:00:00Z','2026-11-09T00:00:00Z'),
('zh','short-fiction','短篇 | 小雪堆','短篇小说与中篇故事','/assets/graphics/zh-short-fiction.svg','blue','fiction','published',30,'2026-11-09T00:00:00Z','2026-11-09T00:00:00Z'),
('zh','poems','诗笺','古体诗与现代诗','/assets/graphics/zh-poems.svg','sage','poetry','published',40,'2026-11-09T00:00:00Z','2026-11-09T00:00:00Z');


-- New, optional engagement tables. Does not change or drop existing posts.
CREATE TABLE IF NOT EXISTS trn_engagement_stats (
  post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS trn_read_receipts (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL,
  last_view_at INTEGER NOT NULL,
  PRIMARY KEY (post_id,visitor_hash)
);
CREATE TABLE IF NOT EXISTS trn_likes (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id,visitor_hash)
);
CREATE TABLE IF NOT EXISTS trn_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  visitor_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_trn_comments_post_status
ON trn_comments(post_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trn_comments_moderation
ON trn_comments(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trn_comments_ip_rate
ON trn_comments(ip_hash,created_at DESC);


-- Covers live in existing D1 storage; no R2 subscription is required.
CREATE TABLE IF NOT EXISTS trn_cover_images (
  filename TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  image_data BLOB NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
