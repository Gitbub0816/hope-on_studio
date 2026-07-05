/* ============================================================
   Hope On Studio — bloom
   The reserved floral magic moment (DESIGN.md § 3). Watercolour
   petals drawn procedurally: bezier petal shapes, soft radial
   gradients in the four --bloom-* hues, unfurling in staggered
   layers then settling into a still painting.
   grace-note = 1–3 tiny blossoms · full = a viewport-scale bloom.
   ============================================================ */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  clamp,
  groundOf,
  hexToRgb,
  lerp,
  makeSurface,
  reducedMotion,
  rgba,
  rgbMix,
  rng,
  smooth,
  token,
  type RGB,
} from './util';

gsap.registerPlugin(ScrollTrigger);

export type BloomHue = 'peony' | 'coral' | 'iris' | 'gold';
export type BloomIntensity = 'grace-note' | 'full';
export type BloomTrigger = 'scroll' | 'hover' | 'immediate';

export interface BloomOptions {
  hues?: BloomHue[];
  intensity?: BloomIntensity;
  trigger?: BloomTrigger;
}

export interface BloomHandle {
  destroy(): void;
  play(): void;
}

const HUE_TOKENS: Record<BloomHue, [string, string]> = {
  peony: ['--bloom-peony', '#e86a8a'],
  coral: ['--bloom-coral', '#f2917b'],
  iris: ['--bloom-iris', '#9b7fc7'],
  gold: ['--bloom-gold', '#f0c36b'],
};

interface Petal {
  angle: number; // radians around the blossom
  len: number; // css px, un-scaled
  wid: number;
  color: RGB;
  delay: number; // 0..1 within the blossom's local timeline
  curl: number; // unfurl rotation (radians) applied while closed
  sway: number; // idle sway phase
}

interface Blossom {
  x: number; // css px
  y: number;
  scale: number;
  rot: number;
  delay: number; // 0..1 global stagger
  core: RGB;
  petals: Petal[];
}

interface DriftPetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  len: number;
  wid: number;
  color: RGB;
  start: number; // global t at which it detaches
}

export function bloom(host: HTMLElement, opts: BloomOptions): BloomHandle {
  const intensity: BloomIntensity = opts.intensity ?? 'grace-note';
  const trig: BloomTrigger = opts.trigger ?? 'scroll';
  const reduce = reducedMotion();
  const dark = groundOf(host) === 'ink';

  const surface = makeSurface(host, { className: 'engine-bloom-canvas' });
  const { ctx } = surface;
  surface.canvas.style.willChange = 'opacity';

  const cream = hexToRgb(token('--cream', '#f2ece1'));
  const hues: BloomHue[] = opts.hues?.length ? opts.hues : ['peony', 'coral', 'iris', 'gold'];
  const palette: RGB[] = hues.map((h) => {
    const [tok, fb] = HUE_TOKENS[h];
    return hexToRgb(token(tok, fb));
  });

  const rand = rng(0x9e3779 ^ hues.join('').length ^ (intensity === 'full' ? 77 : 13));
  const pick = (): RGB => palette[(rand() * palette.length) | 0];

  let blossoms: Blossom[] = [];
  let drifters: DriftPetal[] = [];
  // Total local duration (seconds) of the unfurl.
  const DUR = intensity === 'full' ? 3.6 : 1.9;

  /* ---- composition ----------------------------------------- */

  function buildPetals(count: number, baseLen: number, hue: RGB, spread: number): Petal[] {
    const out: Petal[] = [];
    for (let i = 0; i < count; i++) {
      const jitter = (rand() - 0.5) * spread;
      out.push({
        angle: (i / count) * Math.PI * 2 + jitter,
        len: baseLen * (0.82 + rand() * 0.32),
        wid: baseLen * (0.42 + rand() * 0.16),
        color: rgbMix(hue, pick(), rand() * 0.35),
        delay: rand() * 0.5,
        curl: (0.5 + rand() * 0.7) * (rand() < 0.5 ? -1 : 1),
        sway: rand() * Math.PI * 2,
      });
    }
    return out;
  }

  function makeBlossom(x: number, y: number, scale: number): Blossom {
    const hue = pick();
    // Layered petals (peony-like): outer big, inner tighter.
    const R = 82 * scale;
    const petals: Petal[] = [
      ...buildPetals(11, R, hue, 0.14),
      ...buildPetals(9, R * 0.74, rgbMix(hue, pick(), 0.4), 0.2),
      ...buildPetals(7, R * 0.5, rgbMix(hue, pick(), 0.3), 0.26),
      ...buildPetals(5, R * 0.3, rgbMix(hue, cream, 0.28), 0.32),
    ];
    // Inner layers open slightly later.
    const total = petals.length;
    petals.forEach((p, i) => {
      p.delay = clamp(p.delay * 0.5 + (i / total) * 0.5);
    });
    return {
      x,
      y,
      scale,
      rot: rand() * Math.PI * 2,
      delay: 0,
      // Warm golden heart regardless of petal hue.
      core: rgbMix(hexToRgb(token('--bloom-gold', '#f0c36b')), cream, 0.35),
      petals,
    };
  }

  function build(): void {
    const { w, h } = surface;
    blossoms = [];
    drifters = [];
    if (intensity === 'full') {
      // A viewport-scale spread: one dominant bloom + supporting blossoms.
      const anchors: [number, number, number][] = [
        [0.5, 0.52, 1.15],
        [0.26, 0.4, 0.72],
        [0.72, 0.62, 0.86],
        [0.4, 0.72, 0.56],
        [0.62, 0.32, 0.5],
        [0.84, 0.44, 0.42],
        [0.16, 0.66, 0.44],
      ];
      const base = Math.min(w, h) / 440;
      anchors.forEach(([fx, fy, s], i) => {
        const b = makeBlossom(
          w * fx + (rand() - 0.5) * w * 0.05,
          h * fy + (rand() - 0.5) * h * 0.05,
          s * base * (0.9 + rand() * 0.2),
        );
        b.delay = clamp(i * 0.055 + rand() * 0.05);
        blossoms.push(b);
      });
      // Drifting petals that detach late and float off.
      const dcount = 7;
      for (let i = 0; i < dcount; i++) {
        drifters.push({
          x: w * (0.3 + rand() * 0.4),
          y: h * (0.4 + rand() * 0.3),
          vx: (rand() - 0.5) * 34,
          vy: -18 - rand() * 26,
          rot: rand() * Math.PI * 2,
          vr: (rand() - 0.5) * 1.2,
          len: 30 + rand() * 22,
          wid: 16 + rand() * 10,
          color: rgbMix(pick(), cream, 0.2),
          start: 0.55 + rand() * 0.3,
        });
      }
    } else {
      // grace-note: 1–3 small blossoms clustered toward centre.
      const count = 1 + ((rand() * 3) | 0);
      const base = Math.min(w, h) / 300;
      for (let i = 0; i < count; i++) {
        const b = makeBlossom(
          w * (0.5 + (rand() - 0.5) * 0.4),
          h * (0.5 + (rand() - 0.5) * 0.4),
          base * (0.7 + rand() * 0.5),
        );
        b.delay = clamp(i * 0.12 + rand() * 0.08);
        blossoms.push(b);
      }
    }
  }

  /* ---- petal drawing --------------------------------------- */

  // Draw a single petal pointing "up" (base at 0,0, tip at 0,-len).
  function petalPath(len: number, wid: number): void {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-wid, -len * 0.35, -wid * 0.62, -len * 0.94, 0, -len);
    ctx.bezierCurveTo(wid * 0.62, -len * 0.94, wid, -len * 0.35, 0, 0);
    ctx.closePath();
  }

  function paintPetal(len: number, wid: number, color: RGB, alpha: number): void {
    const g = ctx.createRadialGradient(0, -len * 0.5, 0, 0, -len * 0.5, len * 0.98);
    const soft = rgbMix(color, cream, 0.5);
    g.addColorStop(0, rgba(soft, 0.66 * alpha));
    g.addColorStop(0.4, rgba(color, 0.54 * alpha));
    g.addColorStop(0.8, rgba(color, 0.3 * alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    petalPath(len, wid);
    ctx.fill();
  }

  function paintBlossom(b: Blossom, gt: number, time: number): void {
    const local = clamp((gt - b.delay) / (1 - b.delay || 1));
    if (local <= 0) return;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.scale(b.scale, b.scale);

    // Soft watercolour wash behind the blossom (bleed).
    const washA = smooth(clamp(local * 1.4)) * 0.6;
    if (washA > 0.01) {
      const wr = 165;
      const wash = ctx.createRadialGradient(0, 0, 0, 0, 0, wr);
      const washHue = rgbMix(b.petals[0].color, cream, 0.15);
      wash.addColorStop(0, rgba(washHue, 0.22 * washA));
      wash.addColorStop(0.6, rgba(washHue, 0.08 * washA));
      wash.addColorStop(1, rgba(washHue, 0));
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.arc(0, 0, wr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Additive-ish glow so overlapping petals gain luminosity (kept low → no neon).
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (const p of b.petals) {
      const pt = smooth(clamp((local - p.delay) / (1 - p.delay || 1)));
      if (pt <= 0) continue;
      // Overshoot for an organic unfurl, then settle.
      const os = pt < 1 ? 1 + Math.sin(pt * Math.PI) * 0.06 : 1;
      const sway = Math.sin(time * 0.5 + p.sway) * 0.03 * pt;
      ctx.save();
      ctx.rotate(p.angle + p.curl * (1 - pt) + sway);
      ctx.scale(os, pt);
      paintPetal(p.len, p.wid, p.color, clamp(pt * 1.1));
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Golden core + stamen freckles.
    const coreT = smooth(clamp((local - 0.5) / 0.5));
    if (coreT > 0.01) {
      const cr = 16;
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, cr);
      cg.addColorStop(0, rgba(rgbMix(b.core, cream, 0.4), 0.85 * coreT));
      cg.addColorStop(0.6, rgba(b.core, 0.5 * coreT));
      cg.addColorStop(1, rgba(b.core, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(rgbMix(b.core, cream, 0.55), 0.7 * coreT);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + b.rot;
        const rr = 4 + (i % 3) * 3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function paintDrifter(d: DriftPetal, gt: number, time: number): void {
    if (gt < d.start) return;
    const life = clamp((gt - d.start) / (1 - d.start || 1));
    const travel = life; // eased outside via smooth on alpha
    const x = d.x + d.vx * travel * 3 + Math.sin(time * 0.7 + d.rot) * 8;
    const y = d.y + d.vy * travel * 3;
    const alpha = smooth(clamp(life * 1.2)) * (1 - smooth(clamp((life - 0.6) / 0.4)));
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(d.rot + d.vr * travel * 3 + time * 0.2);
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    paintPetal(d.len, d.wid, d.color, alpha);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  /* ---- timeline / loop ------------------------------------- */

  let raf = 0;
  let startTs = 0;
  let playing = false;
  let played = false;
  let disposed = false;
  let visible = true;
  let st: ScrollTrigger | null = null;
  let ro: ResizeObserver | null = null;
  let resizeT = 0;
  let cleanupHover: (() => void) | null = null;

  function renderAt(gt: number): void {
    const { w, h } = surface;
    ctx.clearRect(0, 0, w, h);
    const time = performance.now() / 1000;
    for (const b of blossoms) paintBlossom(b, gt, time);
    for (const d of drifters) paintDrifter(d, gt, time);
  }

  function frame(): void {
    if (disposed) return;
    const elapsed = (performance.now() - startTs) / 1000;
    const gt = clamp(elapsed / DUR);
    renderAt(gt);
    // Keep a gentle idle sway alive for a while after the unfurl completes.
    const settleFor = DUR + (intensity === 'full' ? 6 : 3);
    if (elapsed < settleFor && visible) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = 0;
      playing = false;
      renderAt(1); // final still
    }
  }

  function play(): void {
    if (disposed) return;
    if (reduce) {
      // Fade in the finished still — no motion.
      renderAt(1);
      surface.canvas.style.opacity = '0';
      surface.canvas.style.transition = 'opacity 1200ms cubic-bezier(0.22,1,0.36,1)';
      requestAnimationFrame(() => (surface.canvas.style.opacity = '1'));
      played = true;
      return;
    }
    startTs = performance.now();
    playing = true;
    played = true;
    surface.canvas.style.opacity = '1';
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /* ---- resize ---------------------------------------------- */

  function onResize(): void {
    window.clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      if (disposed) return;
      if (surface.resize()) build();
      // Re-render current state (played → still; else nothing yet).
      if (played) renderAt(playing ? clamp((performance.now() - startTs) / 1000 / DUR) : 1);
    }, 180);
  }

  /* ---- boot ------------------------------------------------ */

  build();
  ro = new ResizeObserver(onResize);
  ro.observe(host);

  if (trig === 'immediate') {
    play();
  } else if (trig === 'hover') {
    const enter = () => {
      if (!playing) play();
    };
    host.addEventListener('pointerenter', enter);
    // Stash remover on destroy via closure below.
    cleanupHover = () => host.removeEventListener('pointerenter', enter);
  } else {
    // scroll
    st = ScrollTrigger.create({
      trigger: host,
      start: 'top 78%',
      onEnter: () => play(),
      onToggle: (self) => {
        visible = self.isActive;
        if (visible && playing && !raf) raf = requestAnimationFrame(frame);
      },
    });
  }

  return {
    play,
    destroy() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.clearTimeout(resizeT);
      st?.kill();
      st = null;
      ro?.disconnect();
      ro = null;
      cleanupHover?.();
      surface.destroy();
      blossoms = [];
      drifters = [];
    },
  };
}
