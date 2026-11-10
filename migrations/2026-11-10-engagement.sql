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
