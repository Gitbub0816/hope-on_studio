import { Hono } from 'hono';
import type { Env } from '../env';
import { requireAccess } from '../middleware/auth';
import { getPageBySlug, normalizeSlug, publishLatestDraft } from '../db/queries';
import { jsonError } from '../util/errors';

export const publishRoute = new Hono<{ Bindings: Env; Variables: { userEmail?: string } }>();

// POST /api/publish/:slug — promote the latest draft revision to published.
publishRoute.post('/:slug', requireAccess, async (c) => {
  const slugParam = c.req.param('slug') ?? '';
  const slug = normalizeSlug(slugParam);
  const page = await getPageBySlug(c.env.DB, slug);
  if (!page) return jsonError(c, 404, `No page found for slug "${slugParam}".`);

  const published = await publishLatestDraft(c.env.DB, page.id);
  if (!published) return jsonError(c, 404, `No draft revision to publish for "${slugParam}".`);

  return c.json({ ok: true, revisionId: published.id, publishedAt: published.published_at });
});
