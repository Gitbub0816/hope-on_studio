import { Hono } from 'hono';
import type { Env } from '../env';
import { getLatestRevision, getPageBySlug, normalizeSlug, rowToPageContent } from '../db/queries';
import { jsonError } from '../util/errors';

export const contentRoute = new Hono<{ Bindings: Env }>();

// GET /api/content/:slug — published PageContent. 'landing' maps to the '' slug.
contentRoute.get('/:slug', async (c) => {
  const slug = normalizeSlug(c.req.param('slug'));
  const page = await getPageBySlug(c.env.DB, slug);
  if (!page) return jsonError(c, 404, `No page found for slug "${c.req.param('slug')}".`);

  const published = await getLatestRevision(c.env.DB, page.id, 'published');
  if (!published) return jsonError(c, 404, `Page "${c.req.param('slug')}" has no published revision.`);

  return c.json(rowToPageContent(page, published));
});
