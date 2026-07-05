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
