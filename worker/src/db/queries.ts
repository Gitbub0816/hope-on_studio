import type { Block, PageContent } from '../../../shared/types';

export interface PageRow {
  id: number;
  slug: string;
  title: string;
  meta_json: string;
  created_at: string;
}

export interface RevisionRow {
  id: number;
  page_id: number;
  status: 'draft' | 'published';
  blocks_json: string;
  created_at: string;
  published_at: string | null;
}

interface PageMeta {
  description: string;
  ground: 'ink' | 'cream';
}

/** URL param 'landing' <-> stored slug '' (see shared/types PageContent.slug). */
export function normalizeSlug(param: string): string {
  return param === 'landing' ? '' : param;
}

export async function getPageBySlug(db: D1Database, slug: string): Promise<PageRow | null> {
  const row = await db.prepare('SELECT * FROM pages WHERE slug = ?').bind(slug).first<PageRow>();
  return row ?? null;
}

export async function getLatestRevision(
  db: D1Database,
  pageId: number,
  status: 'draft' | 'published'
): Promise<RevisionRow | null> {
  const row = await db
    .prepare('SELECT * FROM revisions WHERE page_id = ? AND status = ? ORDER BY created_at DESC, id DESC LIMIT 1')
    .bind(pageId, status)
    .first<RevisionRow>();
  return row ?? null;
}

export function rowToPageContent(page: PageRow, revision: RevisionRow): PageContent {
  const meta = JSON.parse(page.meta_json) as PageMeta;
  return {
    slug: page.slug,
    title: page.title,
    description: meta.description,
    ground: meta.ground,
    blocks: JSON.parse(revision.blocks_json) as Block[],
  };
}

export async function upsertPage(
  db: D1Database,
  slug: string,
  title: string,
  meta: PageMeta
): Promise<PageRow> {
  const existing = await getPageBySlug(db, slug);
  const metaJson = JSON.stringify(meta);
  if (existing) {
    await db
      .prepare('UPDATE pages SET title = ?, meta_json = ? WHERE id = ?')
      .bind(title, metaJson, existing.id)
      .run();
    return { ...existing, title, meta_json: metaJson };
  }
  const inserted = await db
    .prepare('INSERT INTO pages (slug, title, meta_json) VALUES (?, ?, ?) RETURNING *')
    .bind(slug, title, metaJson)
    .first<PageRow>();
  if (!inserted) throw new Error('Failed to insert page');
  return inserted;
}

export async function insertDraftRevision(db: D1Database, pageId: number, blocks: Block[]): Promise<RevisionRow> {
  const row = await db
    .prepare("INSERT INTO revisions (page_id, status, blocks_json) VALUES (?, 'draft', ?) RETURNING *")
    .bind(pageId, JSON.stringify(blocks))
    .first<RevisionRow>();
  if (!row) throw new Error('Failed to insert revision');
  return row;
}

export async function getRevisionById(db: D1Database, pageId: number, id: number): Promise<RevisionRow | null> {
  const row = await db
    .prepare('SELECT * FROM revisions WHERE page_id = ? AND id = ?')
    .bind(pageId, id)
    .first<RevisionRow>();
  return row ?? null;
}

export async function listRevisions(db: D1Database, pageId: number): Promise<RevisionRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM revisions WHERE page_id = ? ORDER BY created_at DESC, id DESC')
    .bind(pageId)
    .all<RevisionRow>();
  return results ?? [];
}

export interface SettingRow {
  key: string;
  value_json: string;
}

export async function getSetting(db: D1Database, key: string): Promise<SettingRow | null> {
  const row = await db.prepare('SELECT * FROM settings WHERE key = ?').bind(key).first<SettingRow>();
  return row ?? null;
}

/** Upsert a settings row (settings.key is the primary key). */
export async function upsertSetting(db: D1Database, key: string, value: unknown): Promise<SettingRow> {
  const valueJson = JSON.stringify(value);
  await db
    .prepare(
      'INSERT INTO settings (key, value_json) VALUES (?, ?) ' +
        'ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json'
    )
    .bind(key, valueJson)
    .run();
  return { key, value_json: valueJson };
}

export async function publishLatestDraft(db: D1Database, pageId: number): Promise<RevisionRow | null> {
  const draft = await getLatestRevision(db, pageId, 'draft');
  if (!draft) return null;
  const published = await db
    .prepare("UPDATE revisions SET status = 'published', published_at = datetime('now') WHERE id = ? RETURNING *")
    .bind(draft.id)
    .first<RevisionRow>();
  return published ?? null;
}
