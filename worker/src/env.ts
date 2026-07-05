/**
 * Cloudflare Worker bindings + vars, wired up in wrangler.toml.
 */
export interface Env {
  /** D1 binding — content store (pages, revisions, media, settings). */
  DB: D1Database;
  /** R2 binding — original media uploads. */
  MEDIA: R2Bucket;
  /** 'development' in `wrangler dev --local`, 'production' when deployed. */
  ENVIRONMENT?: string;
  /** Freeform note surfaced to the admin build so it knows which API it's talking to. */
  ADMIN_BUILD_NOTE?: string;
}

export function isLocalDev(env: Env): boolean {
  return env.ENVIRONMENT !== 'production';
}
