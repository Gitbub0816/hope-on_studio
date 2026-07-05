/* ============================================================
   Hope On Studio — particleImage
   Renders an image as a warm dot/glyph halftone field on canvas.
   Scroll-scrubbed assembly (assemble | slats variants), a static
   progress override for the editor, and a reduced-motion still.
   Reference: v1_sheet_02/03/05/06 — cream glyphs on ink, images
   assembling from a noise field, vertical venetian-blind reveals.
   ============================================================ */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  clamp,
  groundOf,
  hexToRgb,
  loadImage,
  makeSurface,
  reducedMotion,
  rgba,
  rng,
  sampleLuminance,
  smooth,
  token,
  type RGB,
  type Surface,
} from './util';

gsap.registerPlugin(ScrollTrigger);

export type ParticleVariant = 'assemble' | 'slats';
export type Palette = 'auto' | 'dark' | 'light';

export interface ParticleImageOptions {
  src: string;
  variant?: ParticleVariant;
  /** 0..1 override for editor/reduced-motion; when set, NO ScrollTrigger. */
  progress?: number;
  palette?: Palette;
}

export interface ParticleImageHandle {
  destroy(): void;
  setProgress(p: number): void;
}

/** Alpha quantisation for batched draw passes (one globalAlpha per level). */
const LEVELS = 18;
/** Hard particle ceiling (quality bar: ~12–18k). */
const MAX_PARTICLES = 16000;
/** Target cell size in CSS px at the smallest; grows to honour the cap. */
const MIN_CELL = 3;

interface Field {
  n: number;
  tx: Float32Array; // target x (css px)
  ty: Float32Array; // target y
  sdx: Float32Array; // start offset from target (x)
  sdy: Float32Array; // start offset from target (y)
  base: Float32Array; // base alpha (from luminance)
  size: Float32Array; // base half-glyph size
  delay: Float32Array; // assembly stagger 0..~0.55
  phase: Float32Array; // idle drift phase
  // scratch (per-frame)
  px: Float32Array;
  py: Float32Array;
  psz: Float32Array;
  plvl: Uint8Array;
}

export function particleImage(
  host: HTMLElement,
  opts: ParticleImageOptions,
): ParticleImageHandle {
  const variant: ParticleVariant = opts.variant ?? 'assemble';
  const controlled = typeof opts.progress === 'number';
  const reduce = reducedMotion();

  const surface = makeSurface(host, { className: 'engine-particle-canvas' });
  const { ctx } = surface;

  // Resolve polarity + a single warm fill colour (one fillStyle per pass).
  const pal: Palette = opts.palette ?? 'auto';
  const ground = pal === 'auto' ? groundOf(host) : pal === 'light' ? 'cream' : 'ink';
  const dark = ground === 'ink';
  const fill: RGB = dark
    ? hexToRgb(token('--cream', '#f2ece1'))
    : hexToRgb(token('--ink', '#191714'));
  // A warmer secondary the dim glyphs lean toward (kept subtle via global tint).
  const fillStyle = rgba(fill, 1);

  let field: Field | null = null;
  let img: HTMLImageElement | null = null;

  // progress: `target` is where scroll/editor wants us; `current` chases it.
  let target = controlled ? clamp(opts.progress as number) : 0;
  let current = target;
  let raf = 0;
  let visible = false;
  let disposed = false;
  let st: ScrollTrigger | null = null;
  let ro: ResizeObserver | null = null;
  let resizeT = 0;

  // Reduced-motion / initial fade-in on the canvas element itself.
  surface.canvas.style.willChange = 'opacity';
  surface.canvas.style.opacity = '0';
  surface.canvas.style.transition = 'opacity 900ms cubic-bezier(0.22,1,0.36,1)';

  /* ---- field construction ---------------------------------- */

  function buildField(): void {
    if (!img) return;
    const { w, h } = surface;
    const area = w * h;
    // cell so that count ≤ cap, but never finer than MIN_CELL.
    const cell = Math.max(MIN_CELL, Math.sqrt(area / MAX_PARTICLES));
    const cols = Math.max(2, Math.floor(w / cell));
    const rows = Math.max(2, Math.floor(h / cell));
    const cw = w / cols;
    const chh = h / rows;
    const lum = sampleLuminance(img, cols, rows);

    // Which cells become particles (skip the near-invisible ones).
    const cap = MAX_PARTICLES;
    const tx = new Float32Array(cap);
    const ty = new Float32Array(cap);
    const sdx = new Float32Array(cap);
    const sdy = new Float32Array(cap);
    const base = new Float32Array(cap);
    const size = new Float32Array(cap);
    const delay = new Float32Array(cap);
    const phase = new Float32Array(cap);

    const rand = rng(0x1a2b3c ^ cols ^ (rows << 8));
    const scatter = Math.min(w, h) * 0.55;
    const numSlats = clamp(Math.round(w / 46), 12, 30);
    const slatW = w / numSlats;
    const halfGlyphMax = Math.min(cw, chh) * 0.62;
    const cx = w / 2;
    const cy = h / 2;

    let n = 0;
    for (let ry = 0; ry < rows && n < cap; ry++) {
      for (let rx = 0; rx < cols && n < cap; rx++) {
        const L = lum[ry * cols + rx];
        // intensity = how strongly this cell shows a glyph.
        const v = dark ? L : 1 - L;
        if (v < 0.05) continue; // drop the void → keeps grain crisp & cheap
        const gx = (rx + 0.5) * cw;
        const gy = (ry + 0.5) * chh;
        tx[n] = gx;
        ty[n] = gy;
        // Slight per-glyph jitter off the grid so it reads organic, not tiled.
        const jx = (rand() - 0.5) * cw * 0.5;
        const jy = (rand() - 0.5) * chh * 0.5;
        tx[n] += jx;
        ty[n] += jy;
        base[n] = 0.28 + 0.72 * Math.pow(v, 0.85);
        size[n] = (0.34 + 0.66 * v) * halfGlyphMax;
        phase[n] = rand() * Math.PI * 2;

        if (variant === 'slats') {
          // Collapse to the slat's centre line; open horizontally L→R.
          const slat = Math.min(numSlats - 1, Math.floor(gx / slatW));
          const slatCenter = (slat + 0.5) * slatW;
          sdx[n] = slatCenter - tx[n];
          sdy[n] = 0;
          delay[n] = (slat / numSlats) * 0.5 + rand() * 0.06;
        } else {
          // Scatter into a noise cloud biased outward from centre.
          const ang = rand() * Math.PI * 2;
          const rad = scatter * (0.35 + rand() * 0.85);
          const bias = 0.4; // pull toward radial-from-centre for an inward collapse
          const ox = Math.cos(ang) * rad;
          const oy = Math.sin(ang) * rad;
          const rx0 = tx[n] - cx;
          const ry0 = ty[n] - cy;
          const rl = Math.hypot(rx0, ry0) || 1;
          sdx[n] = ox * (1 - bias) + (rx0 / rl) * rad * bias;
          sdy[n] = oy * (1 - bias) + (ry0 / rl) * rad * bias;
          // Stagger: outer glyphs settle a touch later → breathing collapse.
          delay[n] = clamp((rl / (Math.hypot(cx, cy) || 1)) * 0.32 + rand() * 0.2);
        }
        n++;
      }
    }

    field = {
      n,
      tx,
      ty,
      sdx,
      sdy,
      base,
      size,
      delay,
      phase,
      px: new Float32Array(n),
      py: new Float32Array(n),
      psz: new Float32Array(n),
      plvl: new Uint8Array(n),
    };
  }

  /* ---- reveal curve ---------------------------------------- */

  // Bell across the scroll window: assembled while the host is centred,
  // scattered on entry (p→0) and dissolving on exit (p→1).
  function reveal(p: number): number {
    if (controlled || reduce) {
      // Editor/reduced: monotonic assemble so progress reads as "how built".
      return smooth(clamp(p));
    }
    const inN = smooth(clamp(p / 0.4));
    const outN = smooth(clamp((p - 0.64) / 0.36));
    return inN * (1 - outN);
  }

  /* ---- render ---------------------------------------------- */

  function render(p: number, time: number): void {
    if (!field) return;
    const { w, h } = surface;
    ctx.clearRect(0, 0, w, h);
    const assemble = reveal(p);
    if (assemble <= 0.001) return;

    const f = field;
    const idle = reduce ? 0 : 1;
    // Drift is generous while scattered, near-still once assembled (crisp image).
    for (let i = 0; i < f.n; i++) {
      const d = f.delay[i];
      const local = d >= 1 ? 0 : (assemble - d) / (1 - d);
      const t = smooth(clamp(local));
      const inv = 1 - t;
      const driftAmp = (0.5 + 2.6 * inv) * idle;
      const ph = f.phase[i];
      const dx = Math.sin(time * 0.6 + ph) * driftAmp;
      const dy = Math.cos(time * 0.52 + ph * 1.3) * driftAmp;
      f.px[i] = f.tx[i] + f.sdx[i] * inv + dx;
      f.py[i] = f.ty[i] + f.sdy[i] * inv + dy;
      f.psz[i] = f.size[i] * (0.45 + 0.55 * t);
      const a = f.base[i] * t;
      const lvl = a <= 0 ? 0 : Math.min(LEVELS, 1 + ((a * LEVELS) | 0));
      f.plvl[i] = lvl;
    }

    // Batched draw: one globalAlpha per level, one fillStyle for the whole field.
    ctx.fillStyle = fillStyle;
    for (let lvl = 1; lvl <= LEVELS; lvl++) {
      ctx.globalAlpha = (lvl / LEVELS) * 0.96;
      for (let i = 0; i < f.n; i++) {
        if (f.plvl[i] !== lvl) continue;
        const s = f.psz[i];
        // Slight vertical bias → glyph/reed grain from the reference.
        ctx.fillRect(f.px[i] - s * 0.5, f.py[i] - s * 0.72, s, s * 1.44);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---- loops ----------------------------------------------- */

  function frame(): void {
    if (disposed) return;
    current += (target - current) * 0.14;
    if (Math.abs(target - current) < 0.0004) current = target;
    render(current, performance.now() / 1000);
    if (visible) raf = requestAnimationFrame(frame);
    else raf = 0;
  }

  function wake(): void {
    if (!raf && !disposed && field) raf = requestAnimationFrame(frame);
  }

  /* ---- resize ---------------------------------------------- */

  function onResize(): void {
    window.clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      if (disposed) return;
      if (surface.resize()) {
        buildField();
        if (!controlled && !reduce) ScrollTrigger.refresh();
      }
      render(current, performance.now() / 1000);
    }, 180);
  }

  /* ---- boot ------------------------------------------------ */

  loadImage(opts.src)
    .then((loaded) => {
      if (disposed) return;
      img = loaded;
      surface.resize();
      buildField();
      surface.canvas.style.opacity = '1';

      ro = new ResizeObserver(onResize);
      ro.observe(host);

      if (controlled) {
        render(current, 0);
        return;
      }
      if (reduce) {
        // Still, fully-assembled composition; gentle opacity fade only.
        target = current = 1;
        render(1, 0);
        return;
      }
      st = ScrollTrigger.create({
        trigger: host,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          target = self.progress;
          wake();
        },
        onToggle: (self) => {
          visible = self.isActive;
          if (visible) wake();
        },
      });
      target = st.progress;
      current = target;
      visible = st.isActive;
      // Prime one frame even if off-screen so nothing pops in blank.
      render(current, 0);
      if (visible) wake();
    })
    .catch((err) => {
      // Fail soft — never throw into the page. Log for the demo.
      console.error(err);
    });

  /* ---- handle ---------------------------------------------- */

  return {
    setProgress(p: number) {
      target = clamp(p);
      if (controlled) {
        current = target;
        render(current, 0);
      } else {
        wake();
      }
    },
    destroy() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.clearTimeout(resizeT);
      st?.kill();
      st = null;
      ro?.disconnect();
      ro = null;
      surface.destroy();
      field = null;
      img = null;
    },
  };
}
