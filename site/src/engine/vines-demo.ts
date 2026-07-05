/* ============================================================
   Hope On Studio — vines layer demo (dev only, not in the build)
   Four full-viewport panels on the near-white sage ground:
     · ambient (default) — 2–5 sparse random pops
     · lush — 6–10 alive (404 / publish moments)
     · edges — spawns constrained to the outer band (text-safe)
     · reduced motion — a few finished static vines, no cycling
   A live FPS meter (top-right) is exposed on window.__vinesFps so
   Playwright can read a measured average.
   ============================================================ */

import { vinesLayer } from './index';

function panel(opts: {
  tint?: boolean;
  kicker: string;
  title: string;
  note: string;
}): HTMLElement {
  const root = document.createElement('section');
  root.className = 'panel' + (opts.tint ? ' panel--tint' : '');
  if (opts.tint) root.dataset.ground = 'ink';
  else root.dataset.ground = 'cream';

  const stage = document.createElement('div');
  stage.className = 'stage';

  const cap = document.createElement('div');
  cap.className = 'caption';
  const k = document.createElement('p');
  k.className = 'kicker';
  k.textContent = opts.kicker;
  const t = document.createElement('h2');
  t.className = 'title';
  t.textContent = opts.title;
  const n = document.createElement('p');
  n.className = 'note';
  n.textContent = opts.note;
  cap.append(k, t, n);

  root.append(stage, cap);
  document.getElementById('demo')!.append(root);
  return stage;
}

const ambient = panel({
  kicker: '01 — density: ambient (default) · zone: full',
  title: 'Flower-vines, drifting up',
  note: 'Vines sprout at random points and moments, draw themselves in, bloom, hold with a gentle sway, then fade. 2–5 alive at once. Edge-biased so the centre stays legible.',
});
vinesLayer(ambient, {});

const lush = panel({
  tint: true,
  kicker: '02 — density: lush · zone: full',
  title: 'The full flourish',
  note: 'Six to ten vines alive at once — reserved for the 404 and “published ✓” moments. The same botanical language, turned up.',
});
vinesLayer(lush, { density: 'lush' });

const edges = panel({
  kicker: '03 — zone: edges',
  title: 'Framing the frame',
  note: 'Spawns constrained to the outer 20% band, wreathing content without crossing it. Shown here in lush so the border reads clearly.',
});
vinesLayer(edges, { density: 'lush', zone: 'edges' });

const reduced = panel({
  tint: true,
  kicker: '04 — prefers-reduced-motion',
  title: 'Stillness, still designed',
  note: 'When reduced motion is requested: a few finished static vines fade in once — no growth, sway, or fade cycling. (Run this page with an emulated reduced-motion preference to see it.)',
});
vinesLayer(reduced, { density: 'lush' });

/* ---- FPS meter (measured, exposed for Playwright) ------------------------- */

const badge = document.getElementById('fps')!;
let frames = 0;
let acc = 0;
let last = performance.now();
const samples: number[] = [];
(window as unknown as { __vinesFps?: number }).__vinesFps = 0;

function meter(now: number): void {
  const dt = now - last;
  last = now;
  frames++;
  acc += dt;
  if (acc >= 500) {
    const fps = Math.round((frames * 1000) / acc);
    badge.textContent = `fps ${fps}`;
    samples.push(fps);
    if (samples.length > 20) samples.shift();
    const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
    (window as unknown as { __vinesFps?: number; __vinesFpsAvg?: number }).__vinesFps = fps;
    (window as unknown as { __vinesFpsAvg?: number }).__vinesFpsAvg = avg;
    frames = 0;
    acc = 0;
  }
  requestAnimationFrame(meter);
}
requestAnimationFrame(meter);

// eslint-disable-next-line no-console
console.log('[vines-demo] ready');
