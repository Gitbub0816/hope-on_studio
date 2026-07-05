import type { Context, Next } from 'hono';
import type { Env } from '../env';
import { isLocalDev } from '../env';

const DEV_ORIGINS = new Set(['http://localhost:5173', 'http://localhost:5174']);

/**
 * Same-origin only in prod (no CORS headers needed for that case — browsers
 * don't send them cross-origin — so we only ever *add* Access-Control-Allow-*
 * for the dev Vite origins). Any other cross-origin request is left
 * unauthorized by the browser's own same-origin policy.
 */
export async function corsMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const origin = c.req.header('Origin');

  if (origin && isLocalDev(c.env) && DEV_ORIGINS.has(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Vary', 'Origin');
    c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Cf-Access-Authenticated-User-Email');
    c.header('Access-Control-Max-Age', '86400');
  }

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
}
