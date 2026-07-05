/* ============================================================
   Hope On Studio — vinesLayer  (Wave R, DESIGN.md top banner)

   The signature ambient effect: colourful flower-vines that
   sprout at random points and moments across a transparent
   canvas — "like the matrix dots", but botanical and elegant.

   Each vine: a curling stem (bezier-chain centreline with a
   natural bow + an occasional tendril spiral) draws itself in
   over ~1.2–2s, sprouting leaves and buds as it grows, then
   opens 1–3 blossoms (8–16 layered translucent petals, per-petal
   unfurl stagger, a gradient from a --vine-* hue to a lighter
   heart, gold stamen freckles), holds with a gentle idle sway,
   then fades out over ~2s. Every vine's shape/hue/timing is
   seeded-random — no two alike.

   Rendered to SING against near-white sage (#F3F6EF): vivid,
   saturated, translucent-layered — never neon-on-black, never
   muddy. Colours interpolate in linear light so petal gradients
   stay luminous (no grey mid-zones); each vine keeps one hue
   family + leaf green.

   Perf: single rAF, DPR≤2 (via makeSurface), a hard petal cap,
   pauses on document.hidden / host offscreen, clean destroy().
   Reduced motion: a few finished static vines, one soft fade-in.
   ============================================================ */

import {
  clamp,
  hexToRgb,
  lerp,
  makeSurface,
  reducedMotion,
  rgba,
  rng,
  smooth,
  token,
  type RGB,
} from './util';

export type VineDensity = 'ambient' | 'lush';
export type VineZone = 'full' | 'edges';

export interface VinesOptions {
  /** ambient = 2–5 sparse random pops (default); lush = 6–10 (sparingly). */
  density?: VineDensity;
  /** css colours; default = the five --vine-* tokens read at init. */
  palette?: string[];
  /** 'full' = anywhere (edge-biased so text stays readable); 'edges' = outer band. */
  zone?: VineZone;
}

export interface VinesHandle {
  destroy(): void;
}

const TAU = Math.PI * 2;

/** Hard ceiling on simultaneously-alive petals across all vines. */
const MAX_PETALS = 260;

/* ---- colour in linear light (perceptually decent blends) ------------------ */

function toLin(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function toSrgb(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(clamp(c) * 255);
}
/** Mix two colours in linear-light — avoids the muddy/grey midpoint that
 *  naive sRGB lerps produce between two saturated hues. */
function mixLin(a: RGB, b: RGB, t: number): RGB {
  return {
    r: toSrgb(lerp(toLin(a.r), toLin(b.r), t)),
    g: toSrgb(lerp(toLin(a.g), toLin(b.g), t)),
    b: toSrgb(lerp(toLin(a.b), toLin(b.b), t)),
  };
}

/* ---- geometry types ------------------------------------------------------- */

interface Node {
  x: number;
  y: number;
  nx: number; // unit normal x (for the ribbon offset)
  ny: number;
  w: number; // stem half-width here
  s: number; // 0..1 position along its strand
}

interface Ornament {
  s: number; // position along the strand
  side: 1 | -1;
  size: number;
  ang: number; // absolute leaf/bud orientation (rad)
  kind: 'leaf' | 'bud';
  tint: number; // small per-item colour jitter 0..1
}

interface Strand {
  nodes: Node[];
  attach: number; // global growth g at which this strand STARTS revealing
  ornaments: Ornament[];
  blossom: Blossom | null; // at the strand tip
}

interface Petal {
  angle: number; // radians around the blossom
  len: number;
  wid: number;
  delay: number; // 0..1 unfurl stagger
  curl: number; // closed-state rotation, relaxes to 0
  grad: CanvasGradient; // heart→saturated body, built once (frame alpha via globalAlpha)
  rim: string | null; // crisp petal-edge colour (outer ring only), null = no stroke
  alpha: number; // base translucency
}

interface Blossom {
  scale: number;
  rot: number;
  petals: Petal[];
  glow: RGB; // for the bud tip on the same strand
  glowGrad: CanvasGradient;
  glowR: number;
  coreGrad: CanvasGradient;
  coreR: number;
  dotStyle: string;
  dotR: number;
}

interface Vine {
  bx: number; // base anchor (sway pivot)
  by: number;
  strands: Strand[];
  // colour family
  leafDark: RGB;
  leafLite: RGB;
  // timeline (seconds, on the internal clock)
  born: number;
  growDur: number;
  bloomDur: number;
  holdDur: number;
  fadeDur: number;
  petals: number; // total petal count (for the cap)
  // sway
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
}

/* ---- the layer ------------------------------------------------------------ */

export function vinesLayer(host: HTMLElement, opts: VinesOptions = {}): VinesHandle {
  const density: VineDensity = opts.density ?? 'ambient';
  const zone: VineZone = opts.zone ?? 'full';
  const reduce = reducedMotion();

  const surface = makeSurface(host, { className: 'engine-vines-canvas' });
  const { ctx } = surface;
  surface.canvas.style.willChange = 'opacity';

  // Palette: explicit override, else the five --vine-* tokens.
  const VINE_TOKENS: [string, string][] = [
    ['--vine-fuchsia', '#d6479b'],
    ['--vine-violet', '#8a63d2'],
    ['--vine-teal', '#2fb5ae'],
    ['--vine-marigold', '#e9a13b'],
    ['--vine-leaf', '#4c9a63'],
  ];
  const parseColor = (css: string): RGB => {
    const s = css.trim();
    if (s.startsWith('#')) return hexToRgb(s);
    const m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const [r, g, b] = m[1].split(',').map((v) => parseFloat(v));
      return { r: r | 0, g: g | 0, b: b | 0 };
    }
    return hexToRgb('#d6479b');
  };
  const overridden = opts.palette?.length ? opts.palette.map(parseColor) : null;
  const tokenRGB = VINE_TOKENS.map(([t, fb]) => hexToRgb(token(t, fb)));
  // Blossom hues = everything except a leaf-green sibling; leaf comes from the
  // --vine-leaf token (or, for an override, the greenest member).
  const leafSeed = overridden
    ? overridden.reduce((best, c) => (c.g - Math.max(c.r, c.b) > best.g - Math.max(best.r, best.b) ? c : best))
    : tokenRGB[4];
  const blossomHues = overridden ?? tokenRGB.slice(0, 4);
  const warmWhite: RGB = { r: 255, g: 249, b: 251 };

  // Density → alive range + spawn cadence (seconds).
  const RANGE = density === 'lush' ? { min: 6, max: 10, cad: [0.7, 1.8] } : { min: 2, max: 5, cad: [1.5, 4] };

  let vines: Vine[] = [];
  let seedCounter = (Math.random() * 1e9) | 0;

  /* ---- build one vine (fully deterministic from its seed) ---------------- */

  function buildStrand(
    rand: () => number,
    bx: number,
    by: number,
    ang: number,
    len: number,
    unit: number,
    attach: number,
    withTendril: boolean,
    withBlossom: boolean,
    hue: RGB,
    stamen: RGB,
  ): Strand {
    const steps = 30;
    const ds = len / steps;
    const baseW = unit * (0.006 + rand() * 0.003);
    const tipW = unit * 0.0015;
    // Gentle bow + slow wave for a natural curl.
    const bow = (0.6 + rand() * 1.1) * (rand() < 0.5 ? -1 : 1);
    const waveAmp = (0.4 + rand() * 0.9) * (rand() < 0.5 ? -1 : 1);
    const waveFreq = 1.4 + rand() * 2.2;
    const wavePhase = rand() * TAU;
    const tendrilDir = rand() < 0.5 ? -1 : 1;
    const tendrilGain = 9 + rand() * 7;

    // Raw centreline.
    const raw: { x: number; y: number; w: number; s: number }[] = [];
    let x = bx;
    let y = by;
    let a = ang;
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      raw.push({ x, y, w: lerp(baseW, tipW, f * f), s: f });
      let curv = (bow + waveAmp * Math.sin(wavePhase + f * waveFreq * Math.PI)) / len;
      if (withTendril && f > 0.68) curv += (tendrilDir * (f - 0.68) * tendrilGain) / len;
      a += curv * ds;
      x += Math.cos(a) * ds;
      y += Math.sin(a) * ds;
    }
    // Normals from local tangents.
    const nodes: Node[] = raw.map((p, i) => {
      const prev = raw[Math.max(0, i - 1)];
      const next = raw[Math.min(raw.length - 1, i + 1)];
      let tx = next.x - prev.x;
      let ty = next.y - prev.y;
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      return { x: p.x, y: p.y, nx: -ty, ny: tx, w: p.w, s: p.s };
    });

    // Leaves + buds along the strand, alternating sides.
    const ornaments: Ornament[] = [];
    const count = Math.round(len / (unit * 0.075));
    for (let i = 0; i < count; i++) {
      const s = 0.16 + (i / Math.max(1, count - 1)) * 0.74;
      const idx = Math.min(nodes.length - 2, Math.max(1, Math.round(s * steps)));
      const tx = nodes[idx + 1].x - nodes[idx - 1].x;
      const ty = nodes[idx + 1].y - nodes[idx - 1].y;
      const stemAng = Math.atan2(ty, tx);
      const side: 1 | -1 = i % 2 === 0 ? 1 : -1;
      const bud = rand() < 0.16 && s > 0.55;
      ornaments.push({
        s,
        side,
        size: unit * (bud ? 0.02 + rand() * 0.012 : 0.05 + rand() * 0.035),
        // leaf splays ~55–75° off the stem, angled forward toward the tip
        ang: stemAng + side * (0.9 + rand() * 0.5) - 0.25,
        kind: bud ? 'bud' : 'leaf',
        tint: rand(),
      });
    }

    let blossom: Blossom | null = null;
    if (withBlossom) blossom = makeBlossom(rand, unit, hue, stamen);

    return { nodes, attach, ornaments, blossom };
  }

  function makeBlossom(rand: () => number, unit: number, hue: RGB, stamen: RGB): Blossom {
    const R = unit * (0.055 + rand() * 0.032);
    // A luminous (but not white) heart, and a deepened saturated hue for the
    // petal body + rim so blossoms read VIVID against the near-white sage.
    const heart = mixLin(hue, warmWhite, 0.48);
    const deep = mixLin(hue, { r: 70, g: 12, b: 58 }, 0.2); // saturated edge/rim
    const glow = mixLin(hue, warmWhite, 0.3);

    const outer = 6 + ((rand() * 4) | 0); // 6–9
    const inner = 4 + ((rand() * 3) | 0); // 4–6
    const petals: Petal[] = [];
    const build = (n: number, scale: number, off: number, spread: number, rim: boolean) => {
      for (let i = 0; i < n; i++) {
        // Stay in-hue (only deepen slightly) — keeps colour saturated, never grey.
        const body = mixLin(hue, deep, 0.05 + rand() * 0.16);
        const len = R * scale * (0.9 + rand() * 0.22);
        // Gradient built ONCE in the petal's local space (0,0 → 0,−len); it is
        // reused every frame (the draw transform is identical each time) and the
        // per-frame opacity is applied with globalAlpha — no per-frame allocs.
        const g = ctx.createLinearGradient(0, 0, 0, -len);
        g.addColorStop(0, rgba(heart, 0.9));
        g.addColorStop(0.32, rgba(body, 0.96));
        g.addColorStop(0.82, rgba(body, 0.72));
        g.addColorStop(1, rgba(body, 0.08));
        petals.push({
          angle: (i / n) * TAU + off + (rand() - 0.5) * spread,
          len,
          wid: R * scale * (0.42 + rand() * 0.12),
          delay: rand() * 0.45,
          curl: (0.6 + rand() * 0.7) * (rand() < 0.5 ? -1 : 1),
          grad: g,
          rim: rim ? rgba(body, 0.5) : null,
          alpha: 0.78 + rand() * 0.16,
        });
      }
    };
    build(outer, 1, 0, 0.12, true);
    build(inner, 0.62, Math.PI / outer, 0.2, false);
    // Inner petals open a touch later.
    const total = petals.length;
    petals.forEach((p, i) => {
      p.delay = clamp(p.delay * 0.45 + (i / total) * 0.55);
    });

    // Behind-glow + heart-core radial gradients: built once, alpha via globalAlpha.
    const glowR = R * 1.7;
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
    glowGrad.addColorStop(0, rgba(glow, 0.26));
    glowGrad.addColorStop(0.6, rgba(glow, 0.09));
    glowGrad.addColorStop(1, rgba(glow, 0));
    const coreR = R * 0.3;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    coreGrad.addColorStop(0, rgba(mixLin(stamen, warmWhite, 0.3), 0.9));
    coreGrad.addColorStop(0.7, rgba(stamen, 0.5));
    coreGrad.addColorStop(1, rgba(stamen, 0));

    return {
      scale: 1,
      rot: rand() * TAU,
      petals,
      glow,
      glowGrad,
      glowR,
      coreGrad,
      coreR,
      dotStyle: rgba(mixLin(stamen, { r: 120, g: 70, b: 20 }, 0.35), 0.8),
      dotR: Math.max(0.8, R * 0.03),
    };
  }

  function spawnVine(now: number, zoneOverride?: VineZone): Vine | null {
    const zoneUsed: VineZone = zoneOverride ?? zone;
    // Petal budget check.
    const alive = vines.reduce((s, v) => s + v.petals, 0);
    if (alive > MAX_PETALS) return null;

    const seed = (seedCounter = (seedCounter * 1103515245 + 12345) & 0x7fffffff);
    const rand = rng(seed ^ 0x9e3779b1);
    const { w, h } = surface;
    const unit = Math.min(w, h);

    // Spawn position.
    let fx: number;
    let fy: number;
    if (zoneUsed === 'edges') {
      // Outer 20% band on a random side.
      const band = 0.2;
      if (rand() < 0.5) {
        fx = rand() < 0.5 ? rand() * band : 1 - rand() * band;
        fy = rand();
      } else {
        fx = rand();
        fy = rand() < 0.5 ? rand() * band : 1 - rand() * band;
      }
    } else {
      // Full, but edge-biased: take the axis value farther from centre so
      // blossoms drift toward the margins and keep the middle legible.
      const eb = (): number => {
        const u = rand();
        const v = rand();
        return Math.abs(u - 0.5) > Math.abs(v - 0.5) ? u : v;
      };
      fx = clamp(eb(), 0.05, 0.95);
      fy = clamp(eb(), 0.05, 0.95);
    }
    const bx = fx * w;
    const by = fy * h;

    // Growth direction: grow INTO the frame (down from the top half, up from
    // the bottom), leaning toward the horizontal centre + a little randomness.
    const upper = fy < 0.5;
    let ang = upper ? Math.PI / 2 : -Math.PI / 2;
    ang += ((w * 0.5 - bx) / w) * 1.1;
    ang += (rand() - 0.5) * 0.9;

    // Hue family for this vine (single family + leaf green).
    const hue = blossomHues[(rand() * blossomHues.length) | 0];
    const stamen = mixLin(hexToRgb(token('--vine-marigold', '#e9a13b')), warmWhite, 0.15);
    const leafDark = mixLin(leafSeed, { r: 16, g: 56, b: 30 }, 0.3);
    const leafLite = mixLin(leafSeed, warmWhite, 0.32);

    const len = unit * (0.2 + rand() * 0.2);
    const strands: Strand[] = [];
    // Main strand.
    strands.push(
      buildStrand(rand, bx, by, ang, len, unit, 0, rand() < 0.5, true, hue, stamen),
    );
    // 0–2 side branches near the top, each ending in a blossom.
    const branches = rand() < 0.6 ? (rand() < 0.35 ? 2 : 1) : 0;
    for (let i = 0; i < branches; i++) {
      const main = strands[0].nodes;
      const af = 0.55 + rand() * 0.32; // attach fraction along the main stem
      const ni = Math.min(main.length - 2, Math.max(1, Math.round(af * (main.length - 1))));
      const node = main[ni];
      const tang = Math.atan2(
        main[ni + 1].y - main[ni - 1].y,
        main[ni + 1].x - main[ni - 1].x,
      );
      const bang = tang + (i % 2 === 0 ? 1 : -1) * (0.5 + rand() * 0.5);
      strands.push(
        buildStrand(
          rand,
          node.x,
          node.y,
          bang,
          len * (0.4 + rand() * 0.25),
          unit,
          af, // reveals once growth passes the attach point
          rand() < 0.4,
          true,
          hue,
          stamen,
        ),
      );
    }

    const petalTotal = strands.reduce((s, st) => s + (st.blossom ? st.blossom.petals.length : 0), 0);

    return {
      bx,
      by,
      strands,
      leafDark,
      leafLite,
      born: now,
      growDur: 1.2 + rand() * 0.8,
      bloomDur: 0.8 + rand() * 0.3,
      holdDur: 2.5 + rand() * 4,
      fadeDur: 2,
      petals: petalTotal,
      swayAmp: (2 + rand() * 2) * (Math.PI / 180) * (rand() < 0.5 ? -1 : 1),
      swayFreq: 0.5 + rand() * 0.5,
      swayPhase: rand() * TAU,
    };
  }

  /* ---- drawing ----------------------------------------------------------- */

  function strokeStrand(strand: Strand, reveal: number, leafGrow: number, v: Vine, alpha: number): void {
    const nodes = strand.nodes;
    if (reveal <= 0) return;

    // Stem ribbon (filled polygon of the revealed portion, tapered).
    const grown: Node[] = [];
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].s <= reveal) {
        grown.push(nodes[i]);
      } else {
        // partial final node
        const p = nodes[i - 1];
        const q = nodes[i];
        const span = q.s - p.s || 1;
        const k = clamp((reveal - p.s) / span);
        grown.push({
          x: lerp(p.x, q.x, k),
          y: lerp(p.y, q.y, k),
          nx: lerp(p.nx, q.nx, k),
          ny: lerp(p.ny, q.ny, k),
          w: lerp(p.w, q.w, k),
          s: reveal,
        });
        break;
      }
    }
    if (grown.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(grown[0].x + grown[0].nx * grown[0].w, grown[0].y + grown[0].ny * grown[0].w);
      for (let i = 1; i < grown.length; i++) {
        ctx.lineTo(grown[i].x + grown[i].nx * grown[i].w, grown[i].y + grown[i].ny * grown[i].w);
      }
      for (let i = grown.length - 1; i >= 0; i--) {
        ctx.lineTo(grown[i].x - grown[i].nx * grown[i].w, grown[i].y - grown[i].ny * grown[i].w);
      }
      ctx.closePath();
      const a = grown[0];
      const b = grown[grown.length - 1];
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, rgba(v.leafDark, 0.92 * alpha));
      g.addColorStop(1, rgba(mixLin(v.leafDark, v.leafLite, 0.5), 0.85 * alpha));
      ctx.fillStyle = g;
      ctx.fill();
    }

    // Leaves + buds.
    for (const orn of strand.ornaments) {
      const lg = smooth(clamp((leafGrow - orn.s) / 0.14));
      if (lg <= 0) continue;
      const idx = Math.min(nodes.length - 1, Math.round(orn.s * (nodes.length - 1)));
      const n = nodes[idx];
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(orn.ang);
      ctx.scale(lg, lg);
      if (orn.kind === 'leaf') {
        drawLeaf(orn.size, v, orn.tint, alpha);
      } else {
        drawBud(orn.size, strand.blossom, alpha);
      }
      ctx.restore();
    }
  }

  // Leaf pointing along +x (base at 0,0, tip at size,0).
  function drawLeaf(size: number, v: Vine, tint: number, alpha: number): void {
    const wdt = size * 0.42;
    const col = mixLin(v.leafDark, v.leafLite, 0.2 + tint * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.5, -wdt, size, 0);
    ctx.quadraticCurveTo(size * 0.5, wdt, 0, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, size, 0);
    g.addColorStop(0, rgba(v.leafDark, 0.9 * alpha));
    g.addColorStop(1, rgba(col, 0.82 * alpha));
    ctx.fillStyle = g;
    ctx.fill();
    // Centre vein.
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.92, 0);
    ctx.strokeStyle = rgba(mixLin(v.leafDark, v.leafLite, 0.55), 0.5 * alpha);
    ctx.lineWidth = Math.max(0.6, size * 0.03);
    ctx.stroke();
  }

  function drawBud(size: number, blossom: Blossom | null, alpha: number): void {
    const hue = blossom ? blossom.glow : { r: 214, g: 71, b: 155 };
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.7, -size * 0.6, size * 1.6, 0);
    ctx.quadraticCurveTo(size * 0.7, size * 0.6, 0, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, size * 1.6, 0);
    g.addColorStop(0, rgba({ r: 90, g: 140, b: 90 }, 0.7 * alpha));
    g.addColorStop(1, rgba(hue, 0.8 * alpha));
    ctx.fillStyle = g;
    ctx.fill();
  }

  function petalPath(len: number, wid: number): void {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-wid, -len * 0.35, -wid * 0.6, -len * 0.96, 0, -len);
    ctx.bezierCurveTo(wid * 0.6, -len * 0.96, wid, -len * 0.35, 0, 0);
    ctx.closePath();
  }

  function drawBlossom(b: Blossom, x: number, y: number, open: number, alpha: number): void {
    if (open <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(b.rot);
    ctx.scale(b.scale, b.scale);

    // Soft hue glow behind the flower — vivid lift off the pale sage.
    ctx.globalAlpha = alpha * smooth(open);
    ctx.fillStyle = b.glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, b.glowR, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    for (const p of b.petals) {
      const pt = smooth(clamp((open - p.delay) / (1 - p.delay || 1)));
      if (pt <= 0) continue;
      const os = pt < 1 ? 1 + Math.sin(pt * Math.PI) * 0.07 : 1;
      ctx.save();
      ctx.rotate(p.angle + p.curl * (1 - pt));
      ctx.scale(os, pt);
      const pa = p.alpha * alpha;
      petalPath(p.len, p.wid);
      ctx.globalAlpha = pa;
      ctx.fillStyle = p.grad;
      ctx.fill();
      // Crisp rim (the reference's bright petal outline) — outer ring only;
      // defines the silhouette against the pale ground without stroking every
      // overlapped inner petal.
      if (p.rim) {
        ctx.strokeStyle = p.rim;
        ctx.lineWidth = Math.max(0.5, p.len * 0.025);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Heart + gold stamen freckles.
    const coreT = smooth(clamp((open - 0.45) / 0.55));
    if (coreT > 0.01) {
      ctx.globalAlpha = coreT * alpha;
      ctx.fillStyle = b.coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, b.coreR, 0, TAU);
      ctx.fill();
      ctx.fillStyle = b.dotStyle;
      const dots = 8;
      for (let i = 0; i < dots; i++) {
        const a = (i / dots) * TAU + b.rot;
        const rr = b.coreR * (0.5 + (i % 3) * 0.3);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, b.dotR, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawVine(v: Vine, clock: number): void {
    const age = clock - v.born;

    // Timeline.
    const grow = smooth(clamp(age / v.growDur));
    const openAge = age - v.growDur;
    const open = smooth(clamp(openAge / v.bloomDur));
    const fadeStart = v.growDur + v.bloomDur + v.holdDur;
    const fadeOut = 1 - smooth(clamp((age - fadeStart) / v.fadeDur));
    const fadeIn = clamp(age / 0.28);
    const alpha = fadeIn * fadeOut;
    if (alpha <= 0) return;

    // Idle sway (ramps in after growth, out during fade).
    let sway = 0;
    if (!reduce) {
      const env = smooth(clamp((age - v.growDur * 0.6) / 0.9)) * fadeOut;
      sway = v.swayAmp * Math.sin(clock * v.swayFreq * TAU * 0.16 + v.swayPhase) * env;
    }

    ctx.save();
    ctx.translate(v.bx, v.by);
    ctx.rotate(sway);
    ctx.translate(-v.bx, -v.by);

    // Stems + foliage (main first, then branches — reads as depth).
    for (const strand of v.strands) {
      const reveal = clamp((grow - strand.attach) / (1 - strand.attach || 1));
      strokeStrand(strand, reveal, reveal, v, alpha);
    }
    // Blossoms on top.
    for (const strand of v.strands) {
      if (!strand.blossom) continue;
      const tip = strand.nodes[strand.nodes.length - 1];
      const reveal = clamp((grow - strand.attach) / (1 - strand.attach || 1));
      if (reveal < 0.999) continue; // only bloom once its strand is fully grown
      drawBlossom(strand.blossom, tip.x, tip.y, open, alpha);
    }
    ctx.restore();
  }

  /* ---- clock / loop ------------------------------------------------------ */

  let raf = 0;
  let clock = 0; // internal seconds, only advances while active
  let lastTs = 0;
  let nextSpawn = 0;
  let running = false;
  let disposed = false;
  let onscreen = true;
  let resizeT = 0;

  function tick(): void {
    if (disposed) return;
    const now = performance.now();
    let dt = (now - lastTs) / 1000;
    lastTs = now;
    if (dt > 0.1) dt = 0.1; // clamp long stalls (tab returns etc.)
    clock += dt;

    // Reap dead vines.
    vines = vines.filter((v) => clock - v.born < v.growDur + v.bloomDur + v.holdDur + v.fadeDur);

    // Spawn cadence.
    const targetMax = RANGE.max;
    if (clock >= nextSpawn && vines.length < targetMax) {
      const v = spawnVine(clock);
      if (v) vines.push(v);
      // Randomised cadence; spawn a touch faster while below the min alive band.
      const [lo, hi] = RANGE.cad;
      const urgency = vines.length < RANGE.min ? 0.45 : 1;
      nextSpawn = clock + (lo + Math.random() * (hi - lo)) * urgency;
    }

    const { w, h } = surface;
    ctx.clearRect(0, 0, w, h);
    for (const v of vines) drawVine(v, clock);

    raf = requestAnimationFrame(tick);
  }

  function start(): void {
    if (running || disposed || reduce) return;
    running = true;
    lastTs = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stop(): void {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ---- reduced motion: static composition -------------------------------- */

  function renderStatic(): void {
    const { w, h } = surface;
    ctx.clearRect(0, 0, w, h);
    const n = 3;
    for (let i = 0; i < n; i++) {
      // Static composition wreathes the edges so it never sits over copy.
      const v = spawnVine(0, 'edges');
      if (!v) break;
      // Finished: fully grown + fully open, held (before fade), no sway.
      v.born = 0;
      drawVine(v, v.growDur + v.bloomDur + 0.5);
    }
    surface.canvas.style.opacity = '0';
    surface.canvas.style.transition = 'opacity 1200ms cubic-bezier(0.22,1,0.36,1)';
    requestAnimationFrame(() => (surface.canvas.style.opacity = '1'));
  }

  /* ---- visibility / offscreen / resize ----------------------------------- */

  function evaluate(): void {
    if (document.hidden || !onscreen) stop();
    else start();
  }

  const onVis = () => evaluate();
  document.addEventListener('visibilitychange', onVis);

  let io: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => {
        onscreen = entries[entries.length - 1].isIntersecting;
        evaluate();
      },
      { threshold: 0 },
    );
    io.observe(host);
  }

  const onResize = () => {
    window.clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      if (disposed) return;
      surface.resize();
      if (reduce) renderStatic();
    }, 180);
  };
  let ro: ResizeObserver | null = new ResizeObserver(onResize);
  ro.observe(host);

  /* ---- boot -------------------------------------------------------------- */

  if (reduce) {
    renderStatic();
  } else {
    // Seed a couple of vines immediately so the layer is alive on first paint.
    vines.push(spawnVine(0)!);
    if (RANGE.min > 2) vines.push(spawnVine(0.4)!);
    nextSpawn = 0.6;
    start();
  }

  return {
    destroy() {
      disposed = true;
      stop();
      window.clearTimeout(resizeT);
      document.removeEventListener('visibilitychange', onVis);
      io?.disconnect();
      io = null;
      ro?.disconnect();
      ro = null;
      vines = [];
      surface.destroy();
    },
  };
}
