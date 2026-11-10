CREATE TABLE IF NOT EXISTS trn_cover_images (
  filename TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  image_data BLOB NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
