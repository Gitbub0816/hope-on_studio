import { Hono } from 'hono';
import type { Env } from './env';
import { corsMiddleware } from './middleware/cors';
import { jsonError } from './util/errors';
import { healthRoute } from './routes/health';
import { contentRoute } from './routes/content';
import { draftRoute } from './routes/draft';
import { publishRoute } from './routes/publish';
import { revisionsRoute } from './routes/revisions';
import { mediaUploadRoute, mediaServeRoute } from './routes/media';
import { settingsRoute } from './routes/settings';

/**
 * Hope On Studio API worker.
 *
 * Static assets (the built `site/` and `admin/` bundles) are served by the
 * Cloudflare `[assets]` binding configured in wrangler.toml — this Worker only
 * runs for requests that don't match a static file, i.e. everything under
 * `/api/*` and `/media/*`, plus the SPA fallback for unmatched routes.
 */
const app = new Hono<{ Bindings: Env; Variables: { userEmail?: string } }>();

app.use('*', corsMiddleware);

app.route('/api/health', healthRoute);
app.route('/api/content', contentRoute);
app.route('/api/draft', draftRoute);
app.route('/api/publish', publishRoute);
app.route('/api/revisions', revisionsRoute);
app.route('/api/media', mediaUploadRoute);
app.route('/media', mediaServeRoute);
app.route('/api/settings', settingsRoute);

app.notFound((c) => jsonError(c, 404, 'Not found.'));

app.onError((err, c) => {
  // Never leak stack traces to the client — log server-side only.
  console.error('[worker] unhandled error:', err);
  return jsonError(c, 500, 'Internal server error.');
});

export default app;
