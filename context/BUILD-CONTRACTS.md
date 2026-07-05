# Build contracts & file ownership (agents: read before touching anything)

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
