import { Hono } from 'hono';
import type { Env } from '../env';
import { requireAccess } from '../middleware/auth';
import { getPageBySlug, listRevisions, normalizeSlug } from '../db/queries';
import { jsonError } from '../util/errors';
import type { RevisionSummary } from '../../../shared/types';

export const revisionsRoute = new Hono<{ Bindings: Env; Variables: { userEmail?: string } }>();

// GET /api/revisions/:slug — RevisionSummary[], newest first.
revisionsRoute.get('/:slug', requireAccess, async (c) => {
  const slugParam = c.req.param('slug') ?? '';
  const slug = normalizeSlug(slugParam);
  const page = await getPageBySlug(c.env.DB, slug);
  if (!page) return jsonError(c, 404, `No page found for slug "${slugParam}".`);

  const rows = await listRevisions(c.env.DB, page.id);
  const summaries: RevisionSummary[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.created_at,
    publishedAt: r.published_at ?? undefined,
  }));

  return c.json(summaries);
});
