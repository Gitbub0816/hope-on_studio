import { Hono } from 'hono';
import type { Env } from '../env';
import { requireAccess } from '../middleware/auth';
import { getSetting, upsertSetting } from '../db/queries';
import { jsonError } from '../util/errors';
import defaultTheme from '../../../shared/theme-default.json';

export const settingsRoute = new Hono<{ Bindings: Env; Variables: { userEmail?: string } }>();

const THEME_KEY = 'theme';

/** Loose structural check per BUILD-CONTRACTS § WAVE T — we trust the editor
 *  to build a valid Theme, but guard against obviously malformed bodies. */
function isThemeLike(x: unknown): x is Record<string, unknown> {
  if (typeof x !== 'object' || x === null) return false;
  const t = x as Record<string, unknown>;
  return (
    typeof t.colors === 'object' &&
    t.colors !== null &&
    typeof t.fonts === 'object' &&
    t.fonts !== null
  );
}

// GET /api/settings/theme — PUBLIC (no requireAccess; the site boots with it).
// Absent -> serve shared/theme-default.json (never 404 — the site must always
// have a theme to apply).
settingsRoute.get('/theme', async (c) => {
  const row = await getSetting(c.env.DB, THEME_KEY);
  if (!row) return c.json(defaultTheme);

  try {
    return c.json(JSON.parse(row.value_json));
  } catch {
    // Corrupted stored value — fall back to default rather than error.
    return c.json(defaultTheme);
  }
});

// PUT /api/settings/theme — auth required (like other mutating routes).
// Upserts into `settings` under key 'theme'; returns the saved doc.
settingsRoute.put('/theme', requireAccess, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return jsonError(c, 400, 'Request body must be JSON.');
  }

  if (!isThemeLike(body)) {
    return jsonError(c, 400, 'Body must be an object with "colors" and "fonts" objects.');
  }

  const saved = await upsertSetting(c.env.DB, THEME_KEY, body);
  return c.json(JSON.parse(saved.value_json));
});
