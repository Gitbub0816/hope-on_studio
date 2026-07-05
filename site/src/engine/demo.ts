/* ============================================================
   Hope On Studio — engine demo (dev only, not in the vite build)
   A scrollable page exercising particleImage (assemble + slats,
   on ink and cream grounds), the editor-static progress override,
   and both bloom intensities. Test imagery is generated on a
   canvas at runtime → data URL, so no asset files are written.
   ============================================================ */

import { bloom, particleImage } from './index';

/* ---- test image generators ------------------------------------------------ */

/** A high-key peony/rose bloom (bright subject on near-black) — reads cleanly
 *  as a halftone dot field and inverts nicely on a cream ground. */
function genFlower(size = 1000): string {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = Math.round(size * 1.25);
  const g = c.getContext('2d')!;
  const W = c.width;
  const H = c.height;
  g.fillStyle = '#0a0908';
  g.fillRect(0, 0, W, H);

  const cx = W * 0.5;
  const cy = H * 0.44;
  const R = W * 0.34;
  // Light from the upper-left.
  const lightAng = -Math.PI * 0.75;

  // Stem + leaves (dark-mid, below the bloom).
  g.strokeStyle = '#2c2b26';
  g.lineWidth = W * 0.02;
  g.beginPath();
  g.moveTo(cx + W * 0.01, cy + R * 0.7);
  g.quadraticCurveTo(cx + W * 0.04, H * 0.82, cx - W * 0.02, H * 0.98);
  g.stroke();
  for (const dir of [-1, 1]) {
    const lx = cx + dir * W * 0.14;
    const ly = H * 0.82;
    const lg = g.createRadialGradient(lx - dir * W * 0.04, ly - W * 0.02, 2, lx, ly, W * 0.18);
    lg.addColorStop(0, '#55554a');
    lg.addColorStop(1, 'rgba(10,9,8,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.ellipse(lx, ly, W * 0.17, W * 0.06, dir * 0.4, 0, Math.PI * 2);
    g.fill();
  }

  // Petals: layered ellipses with directional shading.
  const layers = [
    { count: 11, rad: 1.0, size: 0.42 },
    { count: 9, rad: 0.66, size: 0.36 },
    { count: 7, rad: 0.4, size: 0.3 },
    { count: 5, rad: 0.2, size: 0.24 },
  ];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (const L of layers) {
    for (let i = 0; i < L.count; i++) {
      const a = (i / L.count) * Math.PI * 2 + rnd() * 0.4 + L.rad;
      const dist = R * L.rad * (0.9 + rnd() * 0.2);
      const px = cx + Math.cos(a) * dist * 0.85;
      const py = cy + Math.sin(a) * dist * 0.85;
      // Brightness by how much the petal faces the light.
      const facing = Math.cos(a - lightAng) * 0.5 + 0.5;
      const bright = 90 + facing * 150 * (1 - L.rad * 0.3);
      const pr = R * L.size;
      const hi = Math.min(255, bright + 34);
      const mid = bright * 0.72;
      const pg = g.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 1, px, py, pr);
      pg.addColorStop(0, `rgb(${hi | 0},${(hi * 0.96) | 0},${(hi * 0.9) | 0})`);
      pg.addColorStop(0.6, `rgb(${mid | 0},${(mid * 0.95) | 0},${(mid * 0.86) | 0})`);
      pg.addColorStop(1, 'rgba(10,9,8,0)');
      g.fillStyle = pg;
      g.beginPath();
      g.ellipse(px, py, pr * 0.72, pr, a + Math.PI / 2, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Dark heart of the flower.
  const heart = g.createRadialGradient(cx, cy, 1, cx, cy, R * 0.22);
  heart.addColorStop(0, 'rgba(20,16,10,0.9)');
  heart.addColorStop(1, 'rgba(10,9,8,0)');
  g.fillStyle = heart;
  g.beginPath();
  g.arc(cx, cy, R * 0.22, 0, Math.PI * 2);
  g.fill();

  return c.toDataURL('image/jpeg', 0.88);
}

/** A misty pine-ridge landscape (bright sky, dark trees) — echoes the
 *  reference forest frames and reads beautifully through the slats variant. */
function genPines(size = 1200): string {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = Math.round(size * 0.625);
  const g = c.getContext('2d')!;
  const W = c.width;
  const H = c.height;
  // Sky: bright top fading to mist.
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#f4f0e6');
  sky.addColorStop(0.55, '#cfc6b2');
  sky.addColorStop(1, '#6d685c');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // A soft sun glow upper-right.
  const sun = g.createRadialGradient(W * 0.72, H * 0.28, 4, W * 0.72, H * 0.28, W * 0.3);
  sun.addColorStop(0, 'rgba(255,255,255,0.9)');
  sun.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, W, H);

  // Receding ridges.
  const ridge = (yBase: number, amp: number, shade: string) => {
    g.fillStyle = shade;
    g.beginPath();
    g.moveTo(0, H);
    g.lineTo(0, yBase);
    for (let x = 0; x <= W; x += 20) {
      const y = yBase + Math.sin(x * 0.006) * amp + Math.sin(x * 0.021) * amp * 0.4;
      g.lineTo(x, y);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fill();
  };
  ridge(H * 0.62, 18, 'rgba(90,86,74,0.5)');
  ridge(H * 0.72, 14, 'rgba(58,55,47,0.7)');

  // Pine silhouettes.
  let seed = 3;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const drawPine = (x: number, baseY: number, h: number, tone: string) => {
    g.fillStyle = tone;
    const w = h * 0.42;
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
      const ty = baseY - (t / tiers) * h;
      const tw = w * (1 - t / tiers);
      g.beginPath();
      g.moveTo(x, ty - h / tiers - 6);
      g.lineTo(x - tw / 2, ty);
      g.lineTo(x + tw / 2, ty);
      g.closePath();
      g.fill();
    }
    g.fillRect(x - h * 0.02, baseY, h * 0.04, h * 0.12);
  };
  // Far, hazy pines.
  for (let i = 0; i < 22; i++) {
    const x = (i / 22) * W + rnd() * 30;
    drawPine(x, H * 0.78, 60 + rnd() * 40, 'rgba(40,38,32,0.55)');
  }
  // Near, dark pines.
  for (let i = 0; i < 12; i++) {
    const x = rnd() * W;
    drawPine(x, H * 0.99, 150 + rnd() * 130, 'rgba(16,15,12,0.95)');
  }

  return c.toDataURL('image/jpeg', 0.9);
}

/* ---- DOM helpers ---------------------------------------------------------- */

function section(opts: {
  ground: 'ink' | 'cream';
  kicker: string;
  title: string;
  note: string;
  stageClass?: string;
  intro?: boolean;
}): { root: HTMLElement; stage: HTMLElement } {
  const root = document.createElement('section');
  root.className = 'demo-section' + (opts.intro ? ' intro' : '');
  root.dataset.ground = opts.ground;
  const kicker = document.createElement('p');
  kicker.className = 'demo-kicker';
  kicker.textContent = opts.kicker;
  const title = document.createElement('h2');
  title.className = 'demo-title';
  title.textContent = opts.title;
  const note = document.createElement('p');
  note.className = 'demo-note';
  note.textContent = opts.note;
  root.append(kicker, title, note);
  const stage = document.createElement('div');
  stage.className = 'stage' + (opts.stageClass ? ' ' + opts.stageClass : '');
  if (!opts.intro) root.append(stage);
  document.getElementById('demo')!.append(root);
  return { root, stage };
}

/* ---- build the page ------------------------------------------------------- */

const flower = genFlower(1000);
const pines = genPines(1200);

// 0. Intro
section({
  ground: 'ink',
  intro: true,
  kicker: 'Hope On Studio — Engine',
  title: 'The particle field',
  note: 'Scroll. Images assemble from a warm field of glyphs and dissolve on exit. Below: assemble & slats on both grounds, the editor’s static override, and the reserved floral bloom.',
});

// 1. Assemble on ink
{
  const { stage } = section({
    ground: 'ink',
    kicker: '01 — variant: assemble',
    title: 'Bloom, in halftone',
    note: 'Cream glyphs on ink. Particles scatter in a noise field and collapse into the image as the section centres, then dissolve.',
  });
  particleImage(stage, { src: flower, variant: 'assemble', palette: 'auto' });
}

// 2. Slats on ink (wide, landscape)
{
  const { stage } = section({
    ground: 'ink',
    kicker: '02 — variant: slats',
    title: 'Through the reeds',
    note: 'Venetian-blind reveal — the image opens from vertical slat lines, left to right, like the reference forest frames.',
    stageClass: 'stage--wide',
  });
  particleImage(stage, { src: pines, variant: 'slats', palette: 'auto' });
}

// 3. Assemble on cream (inverted polarity)
{
  const { stage } = section({
    ground: 'cream',
    kicker: '03 — palette: auto → light',
    title: 'Ink on ivory',
    note: 'The same field, polarity inverted for a cream ground: dark ink glyphs assembling on warm ivory.',
  });
  particleImage(stage, { src: flower, variant: 'assemble', palette: 'auto' });
}

// 4. Slats on cream
{
  const { stage } = section({
    ground: 'cream',
    kicker: '04 — slats · light',
    title: 'Reeds, reversed',
    note: 'Slats variant on ivory — the landscape opens as dark reed lines widening into the scene.',
    stageClass: 'stage--wide',
  });
  particleImage(stage, { src: pines, variant: 'slats', palette: 'auto' });
}

// 5. Editor-static override
{
  const { root, stage } = section({
    ground: 'ink',
    kicker: '05 — editor override',
    title: 'Static progress',
    note: 'When opts.progress is set, there is no ScrollTrigger — the field renders at an exact progress. Drag to scrub the assembly the way the admin editor does.',
  });
  const handle = particleImage(stage, { src: flower, variant: 'assemble', progress: 1, palette: 'dark' });
  const row = document.createElement('div');
  row.className = 'editor-row';
  const label = document.createElement('span');
  label.textContent = 'progress 1.00';
  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = '1';
  range.step = '0.01';
  range.value = '1';
  range.addEventListener('input', () => {
    const p = parseFloat(range.value);
    handle.setProgress(p);
    label.textContent = 'progress ' + p.toFixed(2);
  });
  row.append(range, label);
  root.append(row);
}

// 6. Bloom — grace-note on ink
{
  const { stage } = section({
    ground: 'ink',
    kicker: '06 — bloom · grace-note',
    title: 'A grace note',
    note: 'One to three small blossoms unfurl and settle. The reserved floral pop against the muted world.',
    stageClass: 'stage--bloom',
  });
  bloom(stage, { intensity: 'grace-note', hues: ['iris', 'peony'], trigger: 'scroll' });
}

// 7. Bloom — full on ink
{
  const { stage } = section({
    ground: 'ink',
    kicker: '07 — bloom · full',
    title: 'The full bloom',
    note: 'A viewport-scale bloom: layered petals, watercolour wash, drifting petals — the landing’s quote-bloom moment.',
    stageClass: 'stage--bloom',
  });
  bloom(stage, { intensity: 'full', trigger: 'scroll' });
}

// 8. Bloom — full on cream
{
  const { stage } = section({
    ground: 'cream',
    kicker: '08 — bloom · full · light',
    title: 'Bloom on ivory',
    note: 'The same bloom over a cream ground — painterly, never neon.',
    stageClass: 'stage--bloom',
  });
  bloom(stage, { intensity: 'full', hues: ['coral', 'gold', 'peony'], trigger: 'scroll' });
}

// eslint-disable-next-line no-console
console.log('[engine-demo] ready');
