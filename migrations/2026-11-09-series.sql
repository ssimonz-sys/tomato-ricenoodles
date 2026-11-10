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
