import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** Uniform JSON error response. Never leaks stack traces. */
export function jsonError(c: Context, status: ContentfulStatusCode, message: string) {
  return c.json({ error: message }, status);
}
