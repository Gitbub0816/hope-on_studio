import { Hono } from 'hono';
import type { Env } from '../env';
import { requireAccess } from '../middleware/auth';
import { insertDraftRevision, normalizeSlug, upsertPage } from '../db/queries';
import { jsonError } from '../util/errors';
import { isSaveDraftRequest } from '../util/validate';

export const draftRoute = new Hono<{ Bindings: Env; Variables: { userEmail?: string } }>();

// POST /api/draft — save a draft revision. Body: SaveDraftRequest.
draftRoute.post('/', requireAccess, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return jsonError(c, 400, 'Request body must be JSON.');
  }

  if (!isSaveDraftRequest(body)) {
    return jsonError(c, 400, 'Body must be { slug: string, content: PageContent } with a valid blocks array.');
  }

  const slug = normalizeSlug(body.slug);
  const { content } = body;

  const page = await upsertPage(c.env.DB, slug, content.title, {
    description: content.description,
    ground: content.ground,
  });
  const revision = await insertDraftRevision(c.env.DB, page.id, content.blocks);

  return c.json({ ok: true, revisionId: revision.id, createdAt: revision.created_at }, 201);
});
