# Hope On Studio — Master Plan

> **This is the source of truth for the entire project.** Read this, `DESIGN.md`, and
> `PASSDOWN.md` at the start of every session before writing any code.

---

## 1. What we are building

**Hope On Studio** — an elegant, breathtaking portfolio/brand site for the owner's three
creative outlets, plus a WIX-style visual editor on an admin subdomain so she can
rearrange and edit the site herself without touching code.

### The three creative outlets (hard rule — these are the pillars of the whole site)

1. **Publishing** — creative and artistic books and journals
2. **Photography**
3. **Learning Design** — course creation and instructional design (ID)

### Pages (hard rule)

| Route | Purpose |
|---|---|
| `/` | Landing page — the showpiece. Follows the general shape of reference video 1 |
| `/publishing` | Full detail page for Publishing |
| `/photography` | Full detail page for Photography |
| `/learning-design` | Full detail page for Learning Design |
| `admin.` subdomain | Drag-and-drop visual editor — a live clone of the site with an editing layer |

### Hard rules from the owner (never violate)

- Three creative outlets exactly as listed above.
- General design follows **reference video 1** (SON DAVEN — see `DESIGN.md` and
  `context/reference/v1_*.jpg`): alternating dark/cream editorial sections, elegant
  serif typography, dot-matrix/particle image reveals, scroll-driven storytelling.
- **Muted colors** for primary and secondary palette. A **floral, magical pop of
  color** exists but is *not site-wide* — it is a reserved, special moment (see
  `DESIGN.md § Floral Bloom`).
- Fonts and design must be **very elegant**.
- `admin.` subdomain is a full drag-and-drop editor that clones the real site and lets
  the owner move/edit content.
- Hosting: **Cloudflare** (Workers + static assets). Storage: **D1** (content) and
  **R2** (media). No other cloud services.
- Do not stop until it is **absolutely breathtaking**. "Good enough" is not done.
- This site is a gift for the owner's wife. Treat the craft accordingly.

---

## 2. Architecture

### Tech stack (decided — do not relitigate without owner input)

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** everywhere | One language across site, editor, and Worker |
| Front-end | **Vite + vanilla TS** (no framework for the public site) | The site is a bespoke scroll-driven canvas/DOM experience; a framework adds weight without helping. Total control over motion and paint |
| Motion | **GSAP + ScrollTrigger** + **Lenis** smooth scroll | Industry standard for this exact genre of site (video 1/2/3 are all GSAP-style work) |
| Signature effect | Custom **canvas 2D halftone/particle engine** (`src/engine/`) | The dot-matrix image reveals in video 1 are the visual centerpiece; built once, reused everywhere |
| Server | **Cloudflare Worker + Hono** | Serves the API (`/api/*`), renders published content, serves static assets |
| Content store | **D1** (SQLite) | Pages → sections → blocks as JSON documents with ordering |
| Media store | **R2** | Original uploads + generated responsive variants |
| Admin editor | Same rendering engine + an **edit overlay layer** (drag handles, inspector, block palette). `interact.js` (or hand-rolled pointer logic) for drag/drop | The editor IS the site plus an overlay — that's what makes it a true "clone that she edits" |
| Auth (admin) | **Cloudflare Access** in front of `admin.` subdomain (fallback: session table in D1 + password) | Zero auth code to maintain; her Google login just works |

### How content-driven rendering works (the key design decision)

The public site is **not** hard-coded HTML. Every page is a list of **blocks** stored in
D1. The front-end has a **block registry**: for each block type there is (a) a renderer
that produces DOM + registers its animations, and (b) an editor schema (what's editable:
text fields, images, layout variants, color-accent toggle).

```
D1: pages ──< sections ──< blocks (type, props JSON, sort order)
                                    │
              ┌─────────────────────┴──────────────────────┐
              ▼                                            ▼
   Public site (site.hopeon.*)                  Admin (admin.hopeon.*)
   Worker renders published revision            Same renderer + edit overlay
   → hydrates GSAP/canvas animations            → drag to reorder, click to edit,
                                                  upload to R2, save draft, publish
```

- **Published vs draft**: every save in the editor writes a draft revision; "Publish"
  promotes it. The public site only ever reads the published revision. Full revision
  history kept in D1 (cheap — it's JSON).
- Block types are designed ONCE and used by both surfaces. Adding a block type = one
  renderer + one schema entry, and it automatically appears in the editor palette.

### Block types (initial set — the vocabulary of the whole site)

Derived from video 1's page anatomy, adapted to Hope On Studio (see `DESIGN.md § 4`):

`hero`, `manifesto` (ghost-duplicated heading + prose), `outlet-triptych` (the three
creative outlets, landing only), `particle-image` (halftone canvas image), `scatter-words`,
`gallery-flow` (mixed-size parallax gallery), `stats-editorial`, `marquee`,
`faq-scatter`, `quote-bloom` (floral pop moment), `contact-card`, `footer`.

### Repository layout (target)

```
/
├── CLAUDE.md                  ← session bootstrap (read first)
├── context/                   ← planning + design docs + passdown + reference frames
├── package.json               ← workspace root
├── wrangler.toml              ← Worker config (site + admin + D1 + R2 bindings)
├── site/                      ← public site (Vite + TS)
│   ├── src/
│   │   ├── engine/            ← canvas halftone/particle engine, bloom system
│   │   ├── motion/            ← GSAP/Lenis setup, entrance choreography, cursor
│   │   ├── blocks/            ← block registry: one folder per block type
│   │   ├── styles/            ← design tokens (CSS custom props), typography, layers
│   │   └── main.ts
│   └── index.html
├── admin/                     ← editor app (imports site's block registry)
│   └── src/
│       ├── overlay/           ← drag handles, selection, inspector panel
│       ├── palette/           ← "add block" UI
│       └── api-client.ts
├── worker/                    ← Hono app: API + serving both surfaces
│   ├── src/
│   │   ├── routes/            (content CRUD, publish, media upload → R2)
│   │   └── db/                (D1 schema + migrations + seed)
└── shared/                    ← block schemas/types shared by site, admin, worker
```

### D1 schema (v1)

```sql
pages(id, slug, title, meta_json, created_at)
revisions(id, page_id, status TEXT CHECK(status IN ('draft','published')),
          blocks_json, created_at, published_at)
media(id, r2_key, filename, mime, width, height, alt, variants_json, created_at)
settings(key PRIMARY KEY, value_json)        -- palette accents, fonts, socials
sessions(id, expires_at)                     -- only if not using CF Access
```

`blocks_json` = ordered array of `{ id, type, props }`. Simple, diffable, revisable.

---

## 3. Build phases

Work through these in order. Update `PASSDOWN.md` at the end of every session with
where you are.

### Phase 0 — Foundation ✅ start here
- [ ] Scaffold workspaces (`site/`, `worker/`, `admin/`, `shared/`), Vite, TS, wrangler.
- [ ] Design tokens in CSS custom properties (palette, type scale, spacing — from `DESIGN.md`).
- [ ] Load fonts (self-hosted woff2: Fraunces + Cormorant Garamond italic + sans, see `DESIGN.md`).
- [ ] Lenis + GSAP + ScrollTrigger wired; `prefers-reduced-motion` kill-switch from day 1.
- [ ] Halftone/particle engine MVP: render an image as a dot/glyph field on canvas,
      scroll-scrubbed assemble/dissolve. **This is the highest-risk, highest-value item —
      prove it early.** Target: 60fps on a mid laptop, graceful static fallback.

### Phase 1 — Landing page (static content first, breathtaking)
- [ ] Build every landing block with hard-coded seed content, full motion choreography.
- [ ] Page anatomy (mirrors video 1's arc — see `DESIGN.md § 4` for full spec):
      preloader → hero (studio name, particle reveal) → manifesto → the three-outlet
      triptych (each panel teases its detail page, floral bloom on hover) →
      gallery-flow → quote-bloom (THE magical floral moment) → marquee →
      FAQ/about scatter → contact/footer.
- [ ] Custom cursor, magnetic buttons, entrance animations, micro-interactions throughout.

### Phase 2 — The three detail pages
- [ ] `/publishing` — editorial, book/journal spreads as particle images, page-turn feel.
- [ ] `/photography` — image-forward: full-bleed halftone reveals, gallery-flow dominant.
- [ ] `/learning-design` — structured/instructional personality: stats-editorial,
      process steps, scatter-words.
- [ ] Shared nav + page transitions (dissolve-to-particles between routes).

### Phase 3 — Content backend
- [ ] D1 schema + migrations + seed script (seed = the hard-coded Phase 1/2 content).
- [ ] Hono API: pages/revisions CRUD, publish, R2 media upload with variant generation.
- [ ] Public site renders from published revisions (SSR the HTML skeleton in the Worker
      for SEO, hydrate motion client-side).

### Phase 4 — Admin editor (`admin.` subdomain)
- [ ] Auth (Cloudflare Access).
- [ ] Render the site in edit mode: block outlines on hover, click to select.
- [ ] Inspector panel: edit text inline, swap images (upload → R2), block variant +
      accent toggles, spacing controls (token-bound, so she can't break the design).
- [ ] Drag to reorder blocks/sections; add from block palette; delete with undo.
- [ ] Draft autosave, preview mode, Publish button, revision history + one-click revert.
- [ ] Make the editor itself elegant — she is the primary user. Onboarding hints.

### Phase 5 — Ship & polish
- [ ] Performance: LCP < 2.5s, canvas work budgeted, images AVIF/WebP from R2, lazy loading.
- [ ] Accessibility: reduced-motion path is genuinely beautiful (static compositions,
      soft fades), semantic HTML, focus states, contrast on muted palette double-checked.
- [ ] SEO/meta/OG images. 404 page (make it delightful — particle scatter).
- [ ] Wrangler deploy: production + preview environments; custom domain + `admin.` subdomain
      routing; D1 + R2 bindings documented in README.
- [ ] Cross-browser + mobile pass. The particle engine must degrade gracefully on mobile.

---

## 4. Content placeholders

Until the owner supplies real copy/photography: write **real, evocative placeholder
copy in Hope On Studio's voice** (never lorem ipsum), and use tasteful neutral
photography placeholders (muted florals, paper textures, studio scenes) clearly listed
in `PASSDOWN.md` as "awaiting real assets". Structure everything so swapping content is
trivial via the editor.

---

## 5. Definition of "breathtaking" (acceptance bar)

- First load produces an audible "oh." The hero alone must be portfolio-grade.
- Every scroll position looks intentional; no dead zones between animations.
- The particle/halftone signature effect appears at least once per page, flawlessly.
- The floral bloom moment feels like magic *because* the rest is muted and restrained.
- The owner's wife can reorder sections, rewrite a heading, and swap a photo on her
  own in under two minutes, and nothing she does can make the site ugly.
- Lighthouse: 90+ performance, 100 accessibility (with reduced-motion), 100 SEO.
