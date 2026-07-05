# Build contracts & file ownership (agents: read before touching anything)

## WAVE T — Theme system (sitewide + per-block styling, add elements)

Fixed contracts (orchestrator-owned, DONE — read, don't edit):
- `shared/types.ts`: `Theme`, `FontKey`, `BlockStyle`, `Block.style?`
- `shared/theme-default.json` — the default theme document
- `site/src/fonts.ts` — curated font catalog + `ensureFont(key)` lazy loader
- `site/src/boot.ts` — `applyBlockStyle(node, style)` applied in renderPage

Ownership this wave:

| Area | Owner |
|---|---|
| `worker/src/**` (settings routes + seed), `site/src/theme.ts` (NEW), `site/src/motion/polarity.ts` (theme-awareness only), `site/src/pages/*.ts` (theme boot call only), `worker/README.md` | theme-runtime agent |
| `admin/src/**` | editor agent |

### Theme runtime interface — `site/src/theme.ts` (theme-runtime agent builds; editor agent consumes)

```ts
import type { Theme } from '@shared/types';
export const DEFAULT_THEME: Theme;                    // from shared/theme-default.json
export async function fetchTheme(): Promise<Theme>;   // GET /api/settings/theme, fallback DEFAULT_THEME, 2.5s timeout
export async function applyTheme(t: Theme, root?: HTMLElement): Promise<void>;
// applyTheme maps colors → the CSS custom props on :root (or `root`):
//   cream→--cream(+--bg when base), sageTint→--sage-tint, ink→--ink(+--fg),
//   champagne→--champagne, vine*→--vine-*; derives --cream-deep/--sage-tint-deep
//   by darkening ~4%; sets html font-size = calc(100% * typeScale);
//   loads fonts via ensureFont and sets --font-display/--font-italic/--font-ui.
```

### API (theme-runtime agent adds to worker)
- `GET /api/settings/theme` → Theme JSON (PUBLIC — no auth; the site boots with it). 404→ serve DEFAULT (return the default doc, don't error).
- `PUT /api/settings/theme` (auth like other mutating routes) → upsert into `settings` (key 'theme').

### Ordering contract
Page entries: `applyTheme(await fetchTheme())` must complete BEFORE `initMotion()` runs (polarity reads ground colors). `initMotion`'s polarity must read `--cream`/`--sage-tint` computed values at init instead of hardcoded hexes.

## WAVE R — "Light Sage World" redesign (owner redirect, DESIGN.md top banner)

Ownership for this wave ONLY (v1 waves below are historical):

| Area | Owner |
|---|---|
| `site/src/engine/vines.ts`, `site/vines-demo.html`, one export line appended to `site/src/engine/index.ts` | vines agent |
| `site/src/motion/**`, `site/src/blocks/*.css` EXCEPT `gallery-flow.css`/`chrome.css`, `site/src/blocks/hero.ts`, `site/src/engine/util.ts` (palette-auto fix only), `site/src/styles/pages-*.css`, `site/src/styles/motion.css` | light-world agent |
| `site/src/blocks/gallery-flow.ts` + `gallery-flow.css` | gallery agent |
| `site/src/chrome.ts` + `chrome.css` (and `site/src/pages/*.ts` ONLY if a chrome call signature changes) | chrome agent |
| `tools/art/**`, `site/public/assets/**` | art agent |
| `tokens.css`, `base.css`, docs, deploy | orchestrator (done — do not edit) |

### Vines layer interface (engine) — chrome agent consumes this

```ts
// site/src/engine/vines.ts
export function vinesLayer(host: HTMLElement, opts?: {
  density?: 'ambient' | 'lush';   // ambient = sparse random pops (default)
  palette?: string[];             // css colors; default = the five --vine-* tokens
  zone?: 'full' | 'edges';        // spawn region (default 'full')
}): { destroy(): void };
```

Behavior: canvas layer filling `host`. Vines sprout at random points/timing
("matrix dots" energy): a stem draws itself in over ~1.2-2s with leaves, opens
1-3 blossoms (vivid vine palette, layered petals), holds, then gracefully fades;
2-5 alive at any moment in 'ambient'. 60fps budget; pause when tab hidden;
reduced motion = a few static vine illustrations, no growth animation.

Multiple agents build this repo in parallel. **Only touch files you own.** If you need
a change in someone else's area, note it in your final report instead of editing.

## Fixed contracts (owned by the orchestrator — do NOT edit)

- `shared/types.ts` — block prop shapes. Additive suggestions go in your report.
- `site/src/blocks/contract.ts` — BlockRenderer interface, `el()`, `blockRoot()`.
- `site/src/boot.ts` — fonts/styles import + `loadContent` + `renderPage`.
- `site/src/styles/tokens.css` — design tokens. Use tokens; never hard-code colors.
- `vite.config.ts`, `tsconfig.json`, `package.json` (report needed deps instead of
  installing conflicting ones; `npm i <pkg>` for NEW packages only is fine).
- `shared/content/*.json` — seed content (copy edits allowed if clearly better).

## Ownership map

| Area | Owner |
|---|---|
| `site/src/engine/**` | engine agent (Wave 1) |
| `site/src/motion/**`, `site/src/styles/motion.css` | motion agent (Wave 1) |
| `site/public/assets/**`, `tools/art/**` | artwork agent (Wave 1) |
| `worker/**`, `wrangler.toml`, `migrations` | backend agent (Wave 1) |
| `site/src/blocks/{hero,manifesto,outlet-triptych,scatter-words,gallery-flow,quote-bloom,marquee,faq-scatter,contact-card,footer}*`, `site/src/pages/landing.ts`, `site/src/chrome.ts`, `site/index.html` | landing agent (Wave 2) |
| `site/src/blocks/{particle-image,stats-editorial,process-steps}*`, `site/src/pages/{publishing,photography,learning-design,404}.ts`, `site/{publishing,photography,learning-design}/index.html`, `site/404.html` | detail-pages agent (Wave 2) |
| `admin/**` | admin agent (Wave 3) |

## Interface contracts between areas

### Engine (`site/src/engine/`) must export from `site/src/engine/index.ts`:

```ts
/** Halftone particle image. Renders `img` as a glyph/dot field on a canvas
 *  inside `host`, scroll-scrubbed via GSAP ScrollTrigger. */
export function particleImage(host: HTMLElement, opts: {
  src: string;
  variant?: 'assemble' | 'slats';
  /** 0..1 progress override for editor/reduced-motion; when set, no ScrollTrigger */
  progress?: number;
  palette?: 'auto' | 'dark' | 'light';
}): { destroy(): void; setProgress(p: number): void };

/** Floral bloom moment (RESERVED usage — DESIGN.md § 3). Petals unfurl on canvas. */
export function bloom(host: HTMLElement, opts: {
  hues?: ('peony' | 'coral' | 'iris' | 'gold')[];
  intensity?: 'grace-note' | 'full';
  trigger?: 'scroll' | 'hover' | 'immediate';
}): { destroy(): void; play(): void };
```

Reduced motion: both must render a beautiful static composition when
`matchMedia('(prefers-reduced-motion: reduce)')` matches (no scrub, gentle fade only).

### Motion (`site/src/motion/`) must export from `site/src/motion/index.ts`:

```ts
export function initMotion(): void;            // Lenis + GSAP + ScrollTrigger + polarity flips; call once per page
export function entrance(el: HTMLElement, opts?: { delay?: number }): void; // kicker→heading→rule→media choreography (auto-detects .kicker/h1-h3/.rule/img inside)
export function ghostHeading(el: HTMLElement): void;   // duplicated echo treatment
export function scatterWords(el: HTMLElement): void;   // per-word parallax assembly
export function marquee(el: HTMLElement): void;        // infinite loop, hover pause
export function magnetic(el: HTMLElement): void;       // magnetic button
export function initCursor(): void;                    // dot + ring cursor (no-op on touch)
export function parallax(el: HTMLElement, depth: number): void; // -1..1 band
```

Polarity flip: `initMotion()` watches `[data-ground]` sections and cross-fades
`document.body` background between ink/cream as they enter (video-1 style).

### Blocks
Follow `site/src/blocks/contract.ts`. One file per block: `site/src/blocks/<type>.ts`
plus `<type>.css` imported by the block file. Editable-by-design:
`data-edit="props.path"` on text nodes, `data-edit-img="props.path"` on images.

### Backend API (worker) — routes the front-end relies on:
- `GET /api/content/:slug` → published `PageContent` (slug `landing` for `''`)
- `POST /api/draft` (auth) → save draft revision
- `POST /api/publish/:slug` (auth) → promote latest draft
- `GET /api/revisions/:slug` (auth) → `RevisionSummary[]`
- `POST /api/media` (auth, multipart) → upload to R2 → `{ src, width, height }`
- `GET /media/*` → serve from R2

### Assets
Artwork agent produces images at the exact paths referenced in
`shared/content/*.json` (grep for `/assets/art/`). 1600px wide min, muted per
DESIGN.md § 2, JPEG quality ~82. Plus `paper-grain.png` tileable texture.

## Conventions

- TypeScript strict; no `any` unless unavoidable.
- GSAP: register plugins once in motion layer; blocks import gsap directly for
  their own timelines but use ScrollTrigger via `initMotion`'s defaults.
- Every animation checks reduced motion (ctx.reducedMotion or the media query).
- CSS: tokens only for color; BEM-ish class names scoped by block (`.hero__title`).
- Test your area compiles: `npx tsc --noEmit` and `npx vite build` before reporting.
