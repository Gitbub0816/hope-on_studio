# Hope On Studio — Worker

Hono app on Cloudflare Workers: serves `/api/*`, streams media from R2 at
`/media/*`, and (via the `[assets]` binding in the root `wrangler.toml`) the
static `dist/site` build for everything else.

## One-time owner setup (before first deploy)

```sh
# 1. Create the D1 database, then paste the printed database_id into
#    wrangler.toml (both the top-level [[d1_databases]] and
#    [[env.production.d1_databases]] blocks currently say "TBD-CREATE-ON-DEPLOY").
npx wrangler d1 create hope-on-studio

# 2. Create the R2 bucket for media uploads (no id to copy — referenced by name).
npx wrangler r2 bucket create hope-on-studio-media

# 3. Apply the schema to the remote (production) database:
npx wrangler d1 execute DB --remote --file worker/src/db/schema.sql

# 4. Configure Cloudflare Access on the admin. subdomain route (Zero Trust >
#    Access > Applications in the dashboard) so Cf-Access-Authenticated-User-Email
#    is present on requests to mutating routes in production.
```

## Local development

```sh
# Apply schema to the local (sqlite-backed) D1 replica:
npx wrangler d1 execute DB --local --file worker/src/db/schema.sql

# Generate + apply seed content from shared/content/*.json:
node worker/scripts/build-seed.mjs
npx wrangler d1 execute DB --local --file worker/src/db/seed.sql

# Run the worker:
npx wrangler dev --local --port 8787
```

Suggested root `package.json` scripts (not added here — worker/** doesn't own
`package.json`; the orchestrator can wire these in):

```json
"seed:local": "node worker/scripts/build-seed.mjs && wrangler d1 execute DB --local --file worker/src/db/schema.sql && wrangler d1 execute DB --local --file worker/src/db/seed.sql",
"worker:typecheck": "tsc --noEmit -p worker"
```

## Auth model

Mutating routes (`POST /api/draft`, `POST /api/publish/:slug`,
`GET /api/revisions/:slug`, `POST /api/media`) go through
`worker/src/middleware/auth.ts`:

- If `Cf-Access-Authenticated-User-Email` is present (Cloudflare Access already
  validated the session before the request reached the Worker), the request is
  allowed and the email is attached to the request context.
- If it's absent and `ENVIRONMENT` (wrangler.toml `[vars]`) is not
  `"production"`, the request is allowed through with a `console.warn` — this
  is what makes `wrangler dev --local` usable without standing up Access.
- If it's absent and `ENVIRONMENT === "production"`, the request is rejected
  with `401 { error }`.

## Content model recap

- `pages`: one row per route (`slug` = `''` for landing, or an outlet slug, or
  `'404'`). `meta_json` holds `{ description, ground }`.
- `revisions`: every draft save and publish is a row; `status` is
  `'draft' | 'published'`. Publishing promotes the latest draft in place
  (`UPDATE ... SET status = 'published', published_at = ...`) so full history
  is retained without duplicating rows.
- `GET /api/content/:slug` reads the latest `published` revision only. The URL
  segment `'landing'` maps to the stored slug `''` (see
  `normalizeSlug` in `worker/src/db/queries.ts`) — this mapping is applied
  consistently across all `:slug` routes.

## Media

`POST /api/media` stores uploads in R2 under a content-hash key
(`sha256(bytes).<ext>`), and records `r2_key`/`filename`/`mime`/`alt` in the
`media` table. Width/height probing is not implemented (optional per the
build brief) — the response always returns `width: null, height: null`.
`GET /media/<key>` streams the object back with a 1-year immutable cache
header and the original content-type.
