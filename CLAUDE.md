# Hope On Studio

An elegant, breathtaking brand site for three creative outlets — **Publishing**,
**Photography**, **Learning Design** — plus a WIX-style drag-and-drop editor on the
`admin.` subdomain. Cloudflare Workers + D1 + R2. A gift for the owner's wife.

## Start every session by reading, in order

1. `context/PASSDOWN.md` — where the last session left off (append your own entry when done)
2. `context/PLAN.md` — requirements, hard rules, architecture, build phases
3. `context/DESIGN.md` — palette, typography, motion language, reference-video analysis
4. `context/reference/*.jpg` — frames from the owner's reference videos (v1 = primary)

## Non-negotiable hard rules (full list in PLAN.md § 1)

- Exactly three outlets: Publishing, Photography, Learning Design. Landing + one
  detail page each. Admin editor on `admin.` subdomain.
- Design follows reference video 1 (dark/cream editorial, serif elegance, particle
  image reveals). Muted primary/secondary palette; the floral color pop is reserved
  for a few magic moments only (`DESIGN.md § 3`) — never site-wide.
- Cloudflare hosting, D1 for content, R2 for media. TypeScript.
- Bar: absolutely breathtaking. Don't ship "good enough."

## Working agreements

- Branch: `claude/parallax-3d-micro-interactions-7gqokr` — commit and push here only.
- Site and admin editor share one block registry (`shared/`); every block is built
  editable-by-design (see PLAN.md § 2).
- `prefers-reduced-motion` support is mandatory in every animation from day 1.
- Utility surfaces (forms, toasts, 404, editor chrome) get the same art direction as
  hero sections.
- Placeholder copy must be written in-voice (never lorem ipsum); log placeholder
  assets in PASSDOWN.md until the owner supplies real ones.
- Before finishing a session: update `context/PASSDOWN.md`, commit, push.
