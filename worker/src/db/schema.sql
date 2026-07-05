-- Hope On Studio — D1 schema (v1)
-- See context/PLAN.md § 2 for the architecture this implements.
-- Auth note: mutating routes are protected by Cloudflare Access in front of the
-- `admin.` subdomain (see worker/src/middleware/auth.ts) — no session table needed.

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,        -- '' = landing, or 'publishing' | 'photography' | 'learning-design' | '404'
  title TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  blocks_json TEXT NOT NULL,        -- ordered array of { id, type, props }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_revisions_page_id ON revisions(page_id);
CREATE INDEX IF NOT EXISTS idx_revisions_page_status ON revisions(page_id, status, created_at);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt TEXT NOT NULL DEFAULT '',
  variants_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

-- `sessions` intentionally omitted: auth for admin.* is handled by Cloudflare Access.
-- If CF Access is ever swapped for a password-based fallback, add:
--   CREATE TABLE sessions (id TEXT PRIMARY KEY, expires_at TEXT NOT NULL);
