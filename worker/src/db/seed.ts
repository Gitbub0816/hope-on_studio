/**
 * Seeding lives in worker/scripts/build-seed.mjs (see worker/README.md).
 *
 * Rationale: D1's Node driver isn't available outside the Workers runtime, and
 * this repo has no ts-node/tsx to run a .ts script directly. Rather than add a
 * new dependency, seeding uses the "generate a plain SQL file, then apply it
 * with the wrangler CLI" approach (allowed by the build brief as a simpler
 * alternative): build-seed.mjs reads shared/content/*.json and writes
 * worker/src/db/seed.sql, which is then applied with
 * `wrangler d1 execute DB --local --file worker/src/db/seed.sql`.
 *
 * This file exists as the documented anchor point for that pipeline; see
 * SEED_PIPELINE below and worker/README.md for the exact commands.
 */
export const SEED_PIPELINE = [
  'node worker/scripts/build-seed.mjs',
  'npx wrangler d1 execute DB --local --file worker/src/db/schema.sql',
  'npx wrangler d1 execute DB --local --file worker/src/db/seed.sql',
] as const;
