# Hope On Studio — Design System & Motion Language

> Companion to `PLAN.md`. This translates the three reference videos into a concrete,
> reusable design language. Reference frames live in `context/reference/` —
> **look at them** (`v1_*.jpg` especially) before building any visual.

---

## 1. The reference videos — what we took from each

### Video 1 — PRIMARY reference (`v1_sheet_01..07.jpg`) — "SON DAVEN" luxury resort site
The site's overall **shape, pacing, and soul** come from this one.

Observed anatomy & techniques (in scroll order across the frames):
- **Preloader → hero**: dark scene, huge letter-spaced display title ("SON DAVEN"),
  small-caps kicker above ("INVESTMENT PROJECT"), corner metadata (dev credit, date
  stamps, index numbers), nav = MENU + one CTA pill.
- **Signature effect — dot-matrix/particle imagery**: photographs rendered as fields
  of tiny glyphs/dots (sheep, pines, buildings, clouds all drawn in halftone). Images
  assemble from scattered particles on scroll and dissolve on exit. Sometimes revealed
  through **vertical slat/reed lines** (venetian-blind wipe).
- **Alternating section grounds**: near-black charcoal ↔ warm cream/champagne. The
  flip itself is a scroll moment (background cross-fades while content swaps polarity).
- **Ghost-duplicated headings**: "ABOUT US / ABOUT US" — the heading echoed offset
  behind itself at low opacity, slight vertical offset, like a print misregistration.
- **Scatter-word typography**: a sentence ("SUMMER TURNS THIS AREA INTO…") exploded
  across the viewport in mixed sizes/weights, words drifting at different parallax
  rates, assembling into readable order as you scroll.
- **Map/stats editorial**: thin-line map, huge serif numeral callout ("31 MIN."),
  labeled columns, small caps everywhere, generous whitespace.
- **Gallery-flow**: mixed-size images (some photos, some halftone) floating at
  different scroll speeds, slight rotations, overlapping the grid.
- **Forecast/stats section**: giant year ("Q4 2028"), columns of small data, a
  particle mountain behind.
- **Marquee**: "LATEST AND UPDATES" words sliding on a horizontal loop.
- **FAQ**: letters "F A Q" scattered wide, lines assemble; list items reveal with
  letter-jitter.
- **Elegant cookie/consent card**: serif, thin-bordered, letter-spaced — even the
  cookie banner is art-directed. Do the same for every utility surface.
- **Custom cursor**: small dot + a circular text badge ("INVEST IN SON") that follows
  the pointer over key sections.

### Video 2 (`v2_sheet_*.jpg`) — "$15K website elements"
Techniques to weave in: **3D-feeling product/parallax heroes** (layered depth on
mouse-move), **scroll-effect immersion** (full-bleed imagery with slow zoom + text
overlays), **dark 'visual experience' set-pieces** (single lit object, stat overlays),
**storytelling pacing** (one idea per viewport, cinematic sequencing).

### Video 3 (`v3_sheet_*.jpg`) — "3 ways to make your website interactive"
- **Entrance animations** (Sheldon Chalet): elegant serif luxury site; on load, nav
  items cascade in, heading fades up with letter-spacing easing, hero image slow-zooms.
  Every section entrance is choreographed — nothing just appears.
- **Micro-interactions** (neu web studio): nav links with slide/underline hovers,
  magnetic buttons (button drifts toward cursor), cursor-aware hover states.
- **Parallax scrolling** (coffee brand): giant display words scroll slower than
  floating product images; images rotated a few degrees, drifting at distinct speeds.

---

## 2. Palette — muted, elegant, with one reserved magic

Primary/secondary = **muted** (hard rule). The floral pop is **reserved** (hard rule:
not site-wide).

```css
:root {
  /* Grounds (alternate per section, like video 1) */
  --ink:        #191714;  /* near-black warm charcoal — dark sections        */
  --ink-soft:   #242019;  /* raised surfaces on dark                         */
  --cream:      #F2ECE1;  /* warm ivory — light sections                     */
  --cream-deep: #E7DECD;  /* cards/surfaces on light                         */

  /* Muted primaries — dusty, botanical, restrained */
  --sage:       #8A9484;  /* muted sage green — primary accent               */
  --clay:       #B08D7A;  /* dusty clay rose — secondary accent              */
  --stone:      #A8A196;  /* warm gray — rules, metadata, borders            */
  --champagne:  #D8C9A8;  /* soft gold — fine lines, numerals on dark        */

  /* THE FLORAL BLOOM — reserved. See §3 for the only allowed uses. */
  --bloom-peony:   #E86A8A;
  --bloom-coral:   #F2917B;
  --bloom-iris:    #9B7FC7;
  --bloom-gold:    #F0C36B;
}
```

Text on dark = `--cream` at 92% / `--stone` for secondary. Text on light = `--ink`.
Check AA contrast whenever muted-on-muted is tempting.

## 3. The Floral Bloom (the magic — used sparingly or it dies)

A living watercolor-floral particle system (petals/blossoms drawn on canvas, soft
additive blending, slow unfurl) using the four bloom colors against the muted world.
**Allowed appearances only:**

1. **Landing quote-bloom section** — the one full-viewport magic moment: as the owner's
   line about hope/creativity scrolls into view, flowers bloom across the dark ground,
   petals drift, then settle into a still painting.
2. **Outlet-triptych hover** — hovering one of the three outlet panels lets a small
   bloom unfurl behind its title (each outlet gets one signature bloom hue:
   Publishing = iris, Photography = coral, Learning Design = gold; peony is shared).
3. **Tiny grace notes** — one petal drifting past the footer; the 404 page; the admin
   "Published ✓" confirmation. Blink-and-you-miss-it scale.

Everywhere else: muted palette only. The restraint is what makes the bloom magical.

## 4. Typography — very elegant (hard rule)

| Role | Face | Notes |
|---|---|---|
| Display / headings | **Fraunces** (or Cormorant Garamond if Fraunces feels too sturdy in situ) | High-contrast serif, optical sizes, real italics. Big sizes, tight leading, generous letter-space on small caps |
| Editorial italic accents | **Cormorant Garamond Italic** | For the "whisper" lines, quotes, ghost duplicates |
| UI / metadata / small caps | **Figtree** (or Inter) | Letter-spaced uppercase 10–12px metadata like video 1's corner stamps |

Type scale (desktop): display 8–12vw hero, h2 ~4.5rem, h3 ~2.5rem, body 1.06rem/1.7,
metadata 0.72rem caps +0.18em tracking. Fluid via `clamp()`.

Typographic signatures to reuse: ghost-duplicated headings, scatter-words, huge serif
numerals for stats, small-caps kickers above every heading, corner metadata stamps
(`HOPE ON STUDIO — EST. 2026`, section index `01 / 04`).

## 5. Motion language

Global: **Lenis** smooth scroll (lerp ~0.08), GSAP + ScrollTrigger for everything.
Ease family: `power3.out` entrances, `expo.inOut` polarity flips, durations 0.9–1.4s.
Stagger letters 0.02s, words 0.06s, blocks 0.12s.

| Pattern | Spec |
|---|---|
| **Particle image reveal** | Canvas halftone: sample image luminance → glyph/dot grid (~2–4px cells). Scroll-scrub assembly: particles fly in from noise field → settle to image; reverse on exit. Optional vertical-slat wipe variant |
| **Entrance choreography** | Every section: kicker fades up → heading letters cascade → rule draws in → media reveals. Never more than 1.2s total |
| **Polarity flip** | Background ink↔cream cross-fade pinned over ~60vh of scroll |
| **Parallax** | 3 depth bands: bg imagery 0.85×, content 1×, floating accents 1.1× + rotation ±3° |
| **Ghost headings** | Duplicate at −0.35 opacity offset y +0.12em, follows main heading with 0.08s lag |
| **Marquee** | Infinite loop, pauses on hover, ~40s period |
| **Magnetic buttons** | Button translates ≤12px toward cursor within 80px radius, springs back |
| **Custom cursor** | 6px dot + trailing 28px ring; ring morphs to circular text badge ("EXPLORE ●") over links/panels |
| **Page transitions** | Leaving page dissolves to particles; next page assembles from them |
| **Reduced motion** | `prefers-reduced-motion`: kill Lenis/scrub/particles; serve composed static layouts with simple fades. Must still look designed |

## 6. Per-page personality

- **Landing** — the full video-1 arc (see `PLAN.md` Phase 1). Dark hero → cream
  manifesto → dark triptych → cream gallery → dark quote-bloom → marquee → footer.
- **Publishing** — paper & ink personality. Cream-dominant, book spreads as
  particle images, drop caps, page-turn micro-moments.
- **Photography** — darkroom personality. Ink-dominant, full-bleed halftone reveals
  that resolve into true photographs (the "develop" moment), gallery-flow dominant.
- **Learning Design** — blueprint personality. Balanced grounds, thin-line diagrams
  (like video 1's map), process steps with huge serif numerals, stats-editorial.

## 7. Utility surfaces are art too

Cookie/consent card, form fields, toasts, 404, the admin editor chrome — all follow
the same serif/small-caps/thin-border language (video 1 art-directed its *cookie
banner*; that's the bar).
