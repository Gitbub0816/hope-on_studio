import type { Context, Next } from 'hono';
import type { Env } from '../env';
import { isLocalDev } from '../env';
import { jsonError } from '../util/errors';

/**
 * Auth for mutating routes. Real auth is Cloudflare Access in front of the
 * `admin.` subdomain — by the time a request reaches the Worker, Access has
 * already validated the session and stamped `Cf-Access-Authenticated-User-Email`.
 * We do NOT re-verify the JWT ourselves (that's Access's job); we just require
 * the header to be present in production, and attach the email for logging.
 *
 * In local dev there is no Access in front of `wrangler dev`, so the header is
 * never present — we allow the request through and log a warning instead of
 * blocking local development.
 */
export async function requireAccess(c: Context<{ Bindings: Env; Variables: { userEmail?: string } }>, next: Next) {
  const email = c.req.header('Cf-Access-Authenticated-User-Email');

  if (email) {
    c.set('userEmail', email);
    await next();
    return;
  }

  if (isLocalDev(c.env)) {
    console.warn(
      '[auth] No Cf-Access-Authenticated-User-Email header present — allowing request ' +
        'because ENVIRONMENT is not "production". This route would be rejected in prod.'
    );
    await next();
    return;
  }

  return jsonError(c, 401, 'Unauthorized — missing Cloudflare Access identity.');
}
