# Hope On Studio — Session Passdown

> Living handoff log. **Every session: read this first, and append an entry before
> you finish.** Newest entry on top. Keep entries short and factual: what was done,
> what's next, any decisions or gotchas.

---

## Entry format

```
## YYYY-MM-DD — <short title>
**Done:** …
**Next:** …
**Decisions/gotchas:** …
```

---

## 2026-07-05 (v2 REDESIGN) — Light Sage World shipped

**Owner redirect executed** (see DESIGN.md top banner): near-white sage ground
site-wide (polarity = light tint shift; dark only in preloader + framed
imagery), ambient flower-vine layer (engine/vines.ts, mounted from chrome),
completely new chrome (leaf rail nav right edge, vine-flourish wordmark,
rotated Enquire tab, scroll-progress tick), diagonal traveling gallery
stream (two opposing lanes, hover pause, counter-rotated captions), art
retuned light with vivid vine-hue pops, idle motion everywhere, AA contrast
audit done. Triptych re-treated for light world during integration (sage
veil instead of dark scrim, palette auto). Preloader untouched per owner.
Admin untouched per owner (inherits tokens). Editor/API/D1 needed NO
migration (token names kept).

## 2026-07-05 (DEPLOYED) — Both workers live on workers.dev

**Live URLs:** site https://hope-on-studio.caleb-owen2019.workers.dev ·
admin https://hope-on-studio-admin.caleb-owen2019.workers.dev
Verified: pages 200, /api serves seeded D1 content, admin proxies /api via
service binding, prod auth 401s without Access. **Pending:** owner enables
Access on the admin worker (Workers & Pages → hope-on-studio-admin →
Settings → Domains & Routes → workers.dev → Enable Access) — publish/save
return 401 until then. Owner should roll the API token shared in chat.

## 2026-07-05 (deploy prep) — Cloudflare resources provisioned, pushed to main

**Done:** Pushed full history to `main` (owner-authorized). Provisioned via the
Cloudflare API: R2 bucket `hope-on-studio-media` (created), D1 `hope-on-studio`
(pre-existing, id `b1384ba7-e3bd-4e6e-b584-7b0fa0aa4703` now in wrangler.toml)
with schema applied and all 4 pages seeded as published revisions — production
D1 is LIVE with content. Added `admin-worker/` (name `hope-on-studio-admin`):
serves `dist/admin`, proxies `/api|/media` to the main worker via service
binding so Access headers flow through; verified locally with multi-config
`wrangler dev`. **Owner still does:** `wrangler deploy --env production` (main),
`wrangler deploy --config admin-worker/wrangler.toml` (admin, after
`npm run build:admin`), then enable Cloudflare Access on the admin hostname
(NOT the Zero Trust "private web app/tunnel" wizard — use self-hosted app or
the workers.dev Enable Access toggle).

## 2026-07-05 (later) — Full site + admin editor built (multi-agent build)

**Done:** The entire site is built and pushed. Orchestrated across parallel agents:
- **Engine** (`site/src/engine/`): halftone particle images (assemble + slats
  variants, ground-aware palette, static-progress mode for the editor, 60fps
  measured) + procedural floral bloom (grace-note/full).
- **Motion** (`site/src/motion/`): Lenis+GSAP, ink↔cream polarity flips, entrance
  choreography, ghost headings, scatter words, marquee, magnetic, custom cursor
  with circular-text badge, parallax. Reduced-motion everywhere.
- **Artwork**: procedural generator (`tools/art/generate.mjs`, Playwright/SVG) for
  all 25 placeholder images — upgraded once already (organic rosettes, chiaroscuro).
  ALL are placeholders awaiting the owner's real photography/scans.
- **Pages**: landing (10 blocks, preloader, chrome) + publishing/photography/
  learning-design personalities + art-directed 404. All blocks editable-by-design.
- **Backend** (`worker/`): Hono on CF Workers, D1 revisions (draft/publish), R2
  media, Cloudflare Access auth model, seed pipeline (`npm run seed:local`).
- **Admin editor** (`admin/`, port 5174 dev): live clone using the real block
  renderers — select/inspect, inline text edit, image swap→R2, drag reorder,
  block palette, autosave drafts, publish with bloom, undo/redo, per-revision
  restore (route `GET /api/revisions/:slug/:id` added).

**Next:**
1. Deploy: create real D1 db + R2 bucket, fill ids in wrangler.toml (see
   worker/README.md), set up `admin.` subdomain routing + Cloudflare Access.
2. Polish backlog: Barba page-transition dissolve (deferred), inspector array
   item add/remove, mobile pass on admin, Lighthouse run, real favicon.
3. Replace placeholder art with the owner's real photography when supplied.

**Decisions/gotchas:**
- Dev: `npm run dev` (site :5173), `npm run dev:admin` (:5174), worker
  `npx wrangler dev --local --port 8787` after `npm run seed:local`.
- Screenshot verification pattern: scripts must live in repo root (module
  resolution) and drive wheel events, not scrollTo (Lenis fights it).
- Editor renders blocks with render() only (no mount) at engine progress 1 —
  intentional static preview.

## 2026-07-05 — Project inception: reference analysis + planning docs

**Done:**
- Analyzed the owner's three reference videos (frames preserved in
  `context/reference/` — originals were TikTok screen recordings, not committed):
  - `v1_*` (PRIMARY, 28s): "SON DAVEN" — dark/cream editorial luxury site with
    dot-matrix particle image reveals. The site's overall shape follows this.
  - `v2_*`: "$15K elements" — 3D/parallax heroes, visual-experience set pieces.
  - `v3_*`: entrance animations, micro-interactions (magnetic buttons), parallax
    scrolling with floating rotated imagery.
- Wrote `context/PLAN.md` (master plan: requirements, architecture, phases,
  acceptance bar) and `context/DESIGN.md` (palette, typography, motion language,
  bloom rules, per-page personalities).
- Wrote root `CLAUDE.md` bootstrap.

**Next:** Phase 0 (see `PLAN.md § 3`): scaffold workspaces (site/worker/admin/shared),
design tokens, fonts, Lenis+GSAP, and **prove the canvas halftone/particle engine
first** — it is the highest-risk, highest-value piece.

**Decisions/gotchas:**
- Stack decided: Vite + vanilla TS site, GSAP/Lenis, custom canvas particle engine,
  Cloudflare Worker (Hono) + D1 + R2, admin editor = same block renderer + edit
  overlay. Details in `PLAN.md § 2`. Don't relitigate without owner input.
- Content model: pages → revisions (draft/published) → `blocks_json`. The editor and
  site share one block registry — build every block with both surfaces in mind.
- Floral bloom color is RESERVED (three allowed uses, `DESIGN.md § 3`). The rest of
  the site stays muted. This is an owner hard rule.
- Branch: all work on `claude/parallax-3d-micro-interactions-7gqokr`.
- No real copy/photography yet — write evocative placeholder copy in-voice (never
  lorem ipsum) and track placeholder assets here until the owner provides real ones.
- This is a gift for the owner's wife. Bar = "absolutely breathtaking."
