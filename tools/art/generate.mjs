// Hope On Studio — placeholder art generator
// Builds every /assets/art/*.jpg referenced by shared/content/*.json, plus the
// tileable paper-grain texture and the OG card, as HTML/SVG compositions
// screenshotted with Playwright chromium. Deterministic (seeded) per image.
//
// Usage: node tools/art/generate.mjs [name-substring]

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT_ART = path.join(ROOT, 'site/public/assets/art');
const OUT_TEX = path.join(ROOT, 'site/public/assets/textures');
const OUT_ROOT = path.join(ROOT, 'site/public/assets');
fs.mkdirSync(OUT_ART, { recursive: true });
fs.mkdirSync(OUT_TEX, { recursive: true });

// ---------------------------------------------------------------------------
// Palette (DESIGN.md § 2) — do not deviate.
// ---------------------------------------------------------------------------
const INK = '#191714';
const INK_SOFT = '#242019';
const CREAM = '#F2ECE1';
const CREAM_DEEP = '#E7DECD';
const SAGE = '#8A9484';
const CLAY = '#B08D7A';
const STONE = '#A8A196';
const CHAMPAGNE = '#D8C9A8';
const BLOOM = { peony: '#E86A8A', coral: '#F2917B', iris: '#9B7FC7', gold: '#F0C36B' };

// ---------------------------------------------------------------------------
// Fonts — reference installed @fontsource packages directly via file:// URLs.
// ---------------------------------------------------------------------------
const FONT_FRAUNCES = path.join(ROOT, 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2');
const FONT_FRAUNCES_ITALIC = path.join(ROOT, 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-standard-italic.woff2');
const FONT_FIGTREE = path.join(ROOT, 'node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2');
const FONT_CORMORANT_ITALIC = path.join(ROOT, 'node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2');

const FONT_FACE_CSS = `
@font-face { font-family: 'Fraunces'; src: url('file://${FONT_FRAUNCES}') format('woff2'); font-weight: 100 900; font-style: normal; }
@font-face { font-family: 'Fraunces'; src: url('file://${FONT_FRAUNCES_ITALIC}') format('woff2'); font-weight: 100 900; font-style: italic; }
@font-face { font-family: 'Figtree'; src: url('file://${FONT_FIGTREE}') format('woff2'); font-weight: 100 900; font-style: normal; }
@font-face { font-family: 'Cormorant Garamond'; src: url('file://${FONT_CORMORANT_ITALIC}') format('woff2'); font-weight: 500; font-style: italic; }
`;

// ---------------------------------------------------------------------------
// Seeded randomness — deterministic per image name.
// ---------------------------------------------------------------------------
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(name) { return mulberry32(hashStr(name)); }
const rf = (rng, min, max) => min + rng() * (max - min);
const ri = (rng, min, max) => Math.floor(rf(rng, min, max + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ---------------------------------------------------------------------------
// Small SVG geometry helpers
// ---------------------------------------------------------------------------
function petalPath(cx, cy, len, width, rot) {
  // teardrop / petal silhouette, pointed at (cx,cy), rounded tip away from it
  const rad = (rot * Math.PI) / 180;
  const tipX = cx + Math.cos(rad) * len;
  const tipY = cy + Math.sin(rad) * len;
  const nRad = rad + Math.PI / 2;
  const w = width / 2;
  const c1x = cx + Math.cos(rad) * len * 0.35 + Math.cos(nRad) * w;
  const c1y = cy + Math.sin(rad) * len * 0.35 + Math.sin(nRad) * w;
  const c2x = cx + Math.cos(rad) * len * 0.75 + Math.cos(nRad) * w * 0.6;
  const c2y = cy + Math.sin(rad) * len * 0.75 + Math.sin(nRad) * w * 0.6;
  const c3x = cx + Math.cos(rad) * len * 0.75 - Math.cos(nRad) * w * 0.6;
  const c3y = cy + Math.sin(rad) * len * 0.75 - Math.sin(nRad) * w * 0.6;
  const c4x = cx + Math.cos(rad) * len * 0.35 - Math.cos(nRad) * w;
  const c4y = cy + Math.sin(rad) * len * 0.35 - Math.sin(nRad) * w;
  return `M ${cx} ${cy} C ${c1x} ${c1y} ${c2x} ${c2y} ${tipX} ${tipY} C ${c3x} ${c3y} ${c4x} ${c4y} ${cx} ${cy} Z`;
}

function leafPath(cx, cy, len, width, rot) {
  return petalPath(cx, cy, len, width, rot); // same silhouette family, thinner
}

// A curved stem from base to tip with small leaves along it.
function botanicalStem(rng, { x, y, height, angle = -90, lineColor = STONE, petalColor = CLAY, opacity = 0.5, scale = 1 }) {
  const rad = (angle * Math.PI) / 180;
  const tipX = x + Math.cos(rad) * height;
  const tipY = y + Math.sin(rad) * height;
  const bendX = x + Math.cos(rad) * height * 0.5 + Math.cos(rad + Math.PI / 2) * rf(rng, -18, 18) * scale;
  const bendY = y + Math.sin(rad) * height * 0.5 + Math.sin(rad + Math.PI / 2) * rf(rng, -18, 18) * scale;
  let g = `<g opacity="${opacity}">`;
  g += `<path d="M ${x} ${y} Q ${bendX} ${bendY} ${tipX} ${tipY}" stroke="${lineColor}" stroke-width="${1.6 * scale}" fill="none" stroke-linecap="round"/>`;
  const leafCount = ri(rng, 2, 4);
  for (let i = 0; i < leafCount; i++) {
    const t = 0.25 + (i / leafCount) * 0.6 + rf(rng, -0.05, 0.05);
    const px = x + (tipX - x) * t;
    const py = y + (tipY - y) * t;
    const side = i % 2 === 0 ? 1 : -1;
    const leafAngle = angle + side * rf(rng, 35, 65);
    g += `<path d="${leafPath(px, py, 22 * scale * rf(rng, 0.7, 1.2), 10 * scale, leafAngle)}" fill="${lineColor}" opacity="${rf(rng, 0.35, 0.6)}"/>`;
  }
  // small petal cluster at the tip
  const petals = ri(rng, 3, 5);
  for (let i = 0; i < petals; i++) {
    const pa = (360 / petals) * i + rf(rng, -10, 10);
    g += `<path d="${petalPath(tipX, tipY, 16 * scale * rf(rng, 0.8, 1.2), 9 * scale, pa)}" fill="${petalColor}" opacity="${rf(rng, 0.55, 0.85)}"/>`;
  }
  g += `<circle cx="${tipX}" cy="${tipY}" r="${4 * scale}" fill="${CHAMPAGNE}" opacity="0.8"/>`;
  g += `</g>`;
  return g;
}

function botanicalCluster(rng, cx, cy, count, opts = {}) {
  let g = '';
  for (let i = 0; i < count; i++) {
    const angle = -90 + rf(rng, -35, 35);
    const height = rf(rng, opts.minH ?? 90, opts.maxH ?? 220);
    g += botanicalStem(rng, {
      x: cx + rf(rng, -60, 60),
      y: cy + rf(rng, -10, 10),
      height,
      angle,
      lineColor: opts.lineColor ?? STONE,
      petalColor: opts.petalColor ?? CLAY,
      opacity: opts.opacity ?? 0.55,
      scale: opts.scale ?? rf(rng, 0.8, 1.3),
    });
  }
  return g;
}

// Faint bloom-color whispers — reserved use, keep well under 5% of pixel area.
function bloomWhisper(rng, w, h, count = 5) {
  const hues = Object.values(BLOOM);
  let g = `<g filter="url(#softBlur)">`;
  for (let i = 0; i < count; i++) {
    const cx = rf(rng, w * 0.1, w * 0.9);
    const cy = rf(rng, h * 0.1, h * 0.9);
    const len = rf(rng, 14, 26);
    const col = pick(rng, hues);
    g += `<path d="${petalPath(cx, cy, len, len * 0.55, rf(rng, 0, 360))}" fill="${col}" opacity="${rf(rng, 0.08, 0.16)}"/>`;
  }
  g += `</g>`;
  return g;
}

function vignette(w, h, id = 'vg') {
  return `
  <radialGradient id="${id}" cx="50%" cy="42%" r="75%">
    <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="72%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.42"/>
  </radialGradient>`;
}

function grainFilter(id, seed, freq = 0.85) {
  return `
  <filter id="${id}" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" stitchTiles="stitch" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 0"/>
  </filter>`;
}

function softBlurFilter(id = 'softBlur', dev = 6) {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${dev}"/></filter>`;
}

function windowLight(id, w, h, cx, cy, r, color = CREAM, op = 0.5) {
  return {
    def: `<radialGradient id="${id}" cx="${(cx / w) * 100}%" cy="${(cy / h) * 100}%" r="${r}">
      <stop offset="0%" stop-color="${color}" stop-opacity="${op}"/>
      <stop offset="60%" stop-color="${color}" stop-opacity="${op * 0.25}"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>`,
  };
}

function metaText(x, y, text, { size = 12, color = STONE, anchor = 'start', tracking = 2 } = {}) {
  return `<text x="${x}" y="${y}" font-family="Figtree" font-size="${size}" fill="${color}" letter-spacing="${tracking}" text-anchor="${anchor}" font-weight="500">${text.toUpperCase()}</text>`;
}

function tickAnnotation(rng, x, y, len = 14) {
  const a = rf(rng, -20, 20);
  const rad = (a * Math.PI) / 180;
  const x2 = x + Math.cos(rad) * len, y2 = y + Math.sin(rad) * len;
  return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${STONE}" stroke-width="1"/><circle cx="${x2}" cy="${y2}" r="2" fill="${CLAY}"/>`;
}

function dashedGuide(x1, y1, x2, y2, color = STONE, opacity = 0.5) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" stroke-dasharray="2 5" opacity="${opacity}"/>`;
}

function ruleLines(x, y, w, count, gap, color = STONE, opacity = 0.35) {
  let g = '';
  for (let i = 0; i < count; i++) {
    const yy = y + i * gap;
    const ww = w * rf_static(0.82, 1);
    g += `<rect x="${x}" y="${yy}" width="${ww}" height="2.4" rx="1.2" fill="${color}" opacity="${opacity}"/>`;
  }
  return g;
}
function rf_static(min, max) { return min + Math.random() * (max - min); } // only for minor non-deterministic width jitter tolerated visually

function bookMockup(rng, { x, y, w, h, fill = CLAY, foil = CHAMPAGNE, rot = 0, title = '' }) {
  const g = `<g transform="translate(${x} ${y}) rotate(${rot})">
    <rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="${INK_SOFT}" opacity="0.5" transform="translate(6 10)"/>
    <rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="${fill}"/>
    <rect x="0" y="0" width="${w * 0.09}" height="${h}" rx="10" fill="#000000" opacity="0.12"/>
    <rect x="${w * 0.14}" y="${h * 0.42}" width="${w * 0.72}" height="2" fill="${foil}" opacity="0.85"/>
    <text x="${w / 2}" y="${h * 0.38}" font-family="Fraunces" font-size="${w * 0.09}" fill="${foil}" text-anchor="middle" font-style="italic" font-weight="380">${title}</text>
    <rect x="${w * 0.14}" y="${h * 0.46}" width="${w * 0.5}" height="1.4" fill="${foil}" opacity="0.5"/>
  </g>`;
  return g;
}

function chairShape(x, y, s, color) {
  // abstract chair silhouette: back rect + seat + two legs
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}">
    <rect x="-30" y="-120" width="60" height="90" rx="8" opacity="0.85"/>
    <rect x="-38" y="-32" width="76" height="18" rx="6" opacity="0.9"/>
    <rect x="-30" y="-14" width="6" height="60" opacity="0.8"/>
    <rect x="24" y="-14" width="6" height="60" opacity="0.8"/>
  </g>`;
}

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------
function page(w, h, svgBody, defs = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${FONT_FACE_CSS}
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body { width:${w}px; height:${h}px; overflow:hidden; background:${CREAM}; }
    svg { display:block; }
  </style></head><body>
  <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>${defs}</defs>
    ${svgBody}
  </svg>
  </body></html>`;
}

// ---------------------------------------------------------------------------
// Scene builders
// ---------------------------------------------------------------------------

function sceneOutletCover(rng, w, h, { ground = 'cream', hue = 'iris', style = 'floral' }) {
  const bg = ground === 'cream' ? CREAM : INK;
  const line = ground === 'cream' ? STONE : CHAMPAGNE;
  const petal = ground === 'cream' ? CLAY : SAGE;
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.9) + softBlurFilter() + softBlurFilter('blur2', 14) + vignette(w, h);
  let body = `<rect width="${w}" height="${h}" fill="${bg}"/>`;
  if (ground === 'dark') {
    const wl = windowLight('wl', w, h, w * 0.5, h * 0.32, '85%', CHAMPAGNE, 0.35);
    defs += wl.def;
    body += `<rect width="${w}" height="${h}" fill="url(#wl)"/>`;
  }
  // fine-line frame — reads as "art directed", not just a floating motif
  body += `<rect x="${w * 0.06}" y="${h * 0.05}" width="${w * 0.88}" height="${h * 0.9}" fill="none" stroke="${line}" stroke-width="1" opacity="0.35"/>`;

  if (style === 'floral') {
    // open journal spread as the anchor, botanicals layered both above and below it
    const bw = w * 0.66, bh = h * 0.3, bx = (w - bw) / 2, by = h * 0.56;
    body += botanicalCluster(rng, w * 0.32, h * 0.4, 4, { lineColor: line, petalColor: petal, opacity: 0.55, minH: h * 0.12, maxH: h * 0.24, scale: 1.2 });
    body += botanicalCluster(rng, w * 0.68, h * 0.36, 4, { lineColor: line, petalColor: SAGE, opacity: 0.5, minH: h * 0.1, maxH: h * 0.2, scale: 1.1 });
    body += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="14" fill="${CREAM_DEEP}" stroke="${STONE}" stroke-width="1" opacity="0.92"/>`;
    body += `<line x1="${w / 2}" y1="${by + 10}" x2="${w / 2}" y2="${by + bh - 10}" stroke="${line}" stroke-width="1" opacity="0.5"/>`;
    body += ruleLines(bx + bw * 0.1, by + bh * 0.24, bw * 0.32, 4, bh * 0.16, STONE, 0.32);
    body += ruleLines(bx + bw * 0.58, by + bh * 0.24, bw * 0.32, 4, bh * 0.16, STONE, 0.32);
    body += botanicalCluster(rng, bx + bw * 0.5, by + bh * 0.5, 1, { lineColor: line, petalColor: petal, opacity: 0.5, minH: bh * 0.3, maxH: bh * 0.4, scale: 0.6 });
    body += botanicalCluster(rng, w * 0.5, h * 0.9, 3, { lineColor: line, petalColor: petal, opacity: 0.4, minH: h * 0.06, maxH: h * 0.1, scale: 0.7 });
  } else if (style === 'stillLife') {
    // a proper toned still life: vase with gradient shading + generous bloom + cast shadow
    const vaseGrad = `<linearGradient id="vaseGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${INK_SOFT}"/>
      <stop offset="45%" stop-color="#332C24"/>
      <stop offset="100%" stop-color="#100E0B"/>
    </linearGradient>`;
    defs += vaseGrad;
    body += `<g filter="url(#blur2)"><ellipse cx="${w * 0.5}" cy="${h * 0.86}" rx="${w * 0.24}" ry="${h * 0.035}" fill="#000" opacity="0.55"/></g>`;
    body += botanicalCluster(rng, w * 0.5, h * 0.5, 6, { lineColor: line, petalColor: petal, opacity: 0.7, minH: h * 0.18, maxH: h * 0.32, scale: 1.7 });
    body += botanicalCluster(rng, w * 0.5, h * 0.52, 3, { lineColor: line, petalColor: SAGE, opacity: 0.55, minH: h * 0.12, maxH: h * 0.22, scale: 1.3 });
    body += `<rect x="${w * 0.42}" y="${h * 0.66}" width="${w * 0.16}" height="${h * 0.2}" rx="6" fill="url(#vaseGrad)"/>`;
    body += `<rect x="${w * 0.42}" y="${h * 0.66}" width="${w * 0.035}" height="${h * 0.2}" rx="4" fill="${CHAMPAGNE}" opacity="0.12"/>`;
  } else if (style === 'blueprint') {
    body += `<text x="${w * 0.12}" y="${h * 0.28}" font-family="Fraunces" font-size="${h * 0.16}" fill="${INK}" opacity="0.88">L</text>`;
    for (let i = 0; i < 6; i++) {
      const y1 = h * (0.36 + i * 0.06);
      body += dashedGuide(w * 0.15, y1, w * 0.85, y1 - rf(rng, 10, 60), line, 0.5);
    }
    for (let i = 0; i < 14; i++) body += tickAnnotation(rng, rf(rng, w * 0.16, w * 0.84), rf(rng, h * 0.32, h * 0.8));
    // small node markers like a curriculum path
    for (let i = 0; i < 4; i++) {
      const nx = w * (0.22 + i * 0.2), ny = h * rf(rng, 0.42, 0.7);
      body += `<circle cx="${nx}" cy="${ny}" r="5" fill="${CLAY}" opacity="0.8"/>`;
    }
    body += metaText(w * 0.12, h * 0.86, 'Field Notes — 01', { size: 13, color: line, tracking: 3 });
  }
  body += bloomWhisper(rng, w, h, 6, BLOOM[hue]);
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.05"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
  body += metaText(w * 0.1, h * 0.09, 'Hope On Studio', { size: 13, color: line, tracking: 3 });
  return page(w, h, body, defs);
}

function sceneHeroBloomField(rng, w, h) {
  let defs = grainFilter('grain', 77, 0.9) + softBlurFilter('blur1', 10) + vignette(w, h);
  const wl = windowLight('wl', w, h, w * 0.5, h * 0.4, '90%', CHAMPAGNE, 0.18);
  defs += wl.def;
  let body = `<rect width="${w}" height="${h}" fill="${INK}"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#wl)"/>`;
  // silhouette botanical field across the whole width, varying heights
  const clusters = 9;
  for (let i = 0; i < clusters; i++) {
    const cx = (w / clusters) * i + rf(rng, -30, 30);
    body += botanicalCluster(rng, cx, h * rf(rng, 0.78, 0.95), ri(rng, 1, 3), {
      lineColor: STONE, petalColor: pick(rng, [SAGE, CLAY]), opacity: rf(rng, 0.25, 0.5), minH: h * 0.2, maxH: h * 0.55, scale: rf(rng, 1, 1.8),
    });
  }
  body += bloomWhisper(rng, w, h, 10);
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.045"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
  body += metaText(w * 0.06, h * 0.09, 'Hope On Studio — Est. 2026', { size: 13, color: CHAMPAGNE, tracking: 3 });
  body += metaText(w * 0.93, h * 0.09, '01 / 04', { size: 13, color: STONE, tracking: 2, anchor: 'end' });
  return page(w, h, body, defs);
}

function sceneBookStack(rng, w, h) {
  let defs = grainFilter('grain', 12, 0.9) + vignette(w, h);
  let body = `<rect width="${w}" height="${h}" fill="${CREAM}"/>`;
  // soft table shadow band
  body += `<ellipse cx="${w * 0.5}" cy="${h * 0.82}" rx="${w * 0.42}" ry="${h * 0.08}" fill="${INK}" opacity="0.08"/>`;
  const titles = ['Field Notes', 'Hope On', 'Marginalia'];
  const fills = [CLAY, SAGE, CHAMPAGNE];
  const n = 3;
  const bw = w * 0.24, bh = h * 0.52;
  for (let i = 0; i < n; i++) {
    const x = w * 0.28 + i * (bw * 0.62) - bw / 2;
    const y = h * 0.28 + (n - i) * 8;
    const rot = (i - 1) * 4 + rf(rng, -2, 2);
    body += bookMockup(rng, { x, y, w: bw, h: bh, fill: fills[i], foil: i === 1 ? INK : CHAMPAGNE, rot, title: titles[i] });
  }
  // botanical endpaper peeking from the front book
  body += botanicalCluster(rng, w * 0.3, h * 0.66, 2, { lineColor: STONE, petalColor: CLAY, opacity: 0.35, minH: 60, maxH: 100, scale: 0.9 });
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.04"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
  body += metaText(w * 0.06, h * 0.09, 'Publishing', { size: 13, color: STONE, tracking: 3 });
  return page(w, h, body, defs);
}

function scenePageSpread(rng, w, h, { variant = 'floral' } = {}) {
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.85) + vignette(w, h);
  let body = `<rect width="${w}" height="${h}" fill="${CREAM}"/>`;
  // page fold shadow
  body += `<rect x="${w / 2 - 3}" y="0" width="6" height="${h}" fill="${INK}" opacity="0.06"/>`;
  body += `<line x1="${w / 2}" y1="0" x2="${w / 2}" y2="${h}" stroke="${STONE}" stroke-width="1" opacity="0.3"/>`;

  if (variant === 'floral') {
    body += botanicalCluster(rng, w * 0.27, h * 0.55, 4, { lineColor: STONE, petalColor: CLAY, opacity: 0.6, minH: h * 0.14, maxH: h * 0.3 });
    body += botanicalCluster(rng, w * 0.74, h * 0.5, 4, { lineColor: STONE, petalColor: SAGE, opacity: 0.55, minH: h * 0.12, maxH: h * 0.26 });
    body += ruleLines(w * 0.6, h * 0.24, w * 0.32, 8, h * 0.045, STONE, 0.28);
  } else if (variant === 'dropcap') {
    body += `<text x="${w * 0.12}" y="${h * 0.62}" font-family="Fraunces" font-size="${h * 0.42}" fill="${INK}" opacity="0.92">H</text>`;
    body += ruleLines(w * 0.42, h * 0.22, w * 0.46, 12, h * 0.05, STONE, 0.32);
    body += ruleLines(w * 0.12, h * 0.78, w * 0.76, 4, h * 0.045, STONE, 0.24);
    body += `<text x="${w * 0.5}" y="${h * 0.92}" font-family="Cormorant Garamond" font-style="italic" font-size="${h * 0.045}" fill="${CLAY}" text-anchor="middle">hope on studio</text>`;
  } else if (variant === 'prompts') {
    body += metaText(w * 0.12, h * 0.14, 'Journal Prompt No. 4', { size: 14, color: CLAY, tracking: 3 });
    body += `<text x="${w * 0.12}" y="${h * 0.24}" font-family="Fraunces" font-style="italic" font-size="${h * 0.045}" fill="${INK}" opacity="0.85">What did you notice today?</text>`;
    body += ruleLines(w * 0.12, h * 0.34, w * 0.76, 14, h * 0.043, STONE, 0.3);
    for (let i = 0; i < 8; i++) body += tickAnnotation(rng, rf(rng, w * 0.14, w * 0.84), rf(rng, h * 0.36, h * 0.82), 10);
    body += botanicalCluster(rng, w * 0.88, h * 0.86, 1, { lineColor: STONE, petalColor: SAGE, opacity: 0.5, minH: 60, maxH: 90, scale: 0.8 });
  } else if (variant === 'foilcover') {
    body = `<rect width="${w}" height="${h}" fill="${INK_SOFT}"/>`;
    const bw = w * 0.72, bh = h * 0.8, bx = (w - bw) / 2, by = (h - bh) / 2;
    body += bookMockup(rng, { x: bx, y: by, w: bw, h: bh, fill: CLAY, foil: CHAMPAGNE, rot: 0, title: 'Hope On' });
    body += botanicalCluster(rng, bx + bw * 0.5, by + bh * 0.68, 2, { lineColor: CHAMPAGNE, petalColor: SAGE, opacity: 0.4, minH: 60, maxH: 100, scale: 0.9 });
    body += metaText(w * 0.5, h * 0.94, 'Linen Cloth · Foil Stamp', { size: 13, color: STONE, tracking: 3, anchor: 'middle' });
  }
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.045"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
  return page(w, h, body, defs);
}

function sceneBlueprint(rng, w, h, { title = 'Course Map', numeral = '01' } = {}) {
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.8) + vignette(w, h);
  let body = `<rect width="${w}" height="${h}" fill="${CREAM}"/>`;
  // thin-line map: a meandering path with node ticks (echoes video-1 map/stats section)
  let path = `M ${w * 0.08} ${h * 0.7}`;
  let px = w * 0.08, py = h * 0.7;
  const nodes = [];
  for (let i = 0; i < 6; i++) {
    px += rf(rng, w * 0.1, w * 0.16);
    py += rf(rng, -h * 0.22, h * 0.15);
    path += ` L ${px} ${py}`;
    nodes.push([px, py]);
  }
  body += `<path d="${path}" stroke="${STONE}" stroke-width="1.3" fill="none" opacity="0.7"/>`;
  nodes.forEach(([nx, ny], i) => {
    body += `<circle cx="${nx}" cy="${ny}" r="4" fill="${CLAY}" opacity="0.85"/>`;
    body += dashedGuide(nx, ny, nx, ny - h * 0.09, STONE, 0.4);
    body += metaText(nx, ny - h * 0.11, `0${i + 1}`, { size: 11, color: STONE, anchor: 'middle' });
  });
  for (let i = 0; i < 10; i++) body += tickAnnotation(rng, rf(rng, w * 0.1, w * 0.9), rf(rng, h * 0.15, h * 0.85));
  body += `<text x="${w * 0.08}" y="${h * 0.28}" font-family="Fraunces" font-size="${h * 0.22}" fill="${INK}" opacity="0.9">${numeral}</text>`;
  body += metaText(w * 0.08, h * 0.36, title, { size: 15, color: CLAY, tracking: 3 });
  body += metaText(w * 0.08, h * 0.92, 'Learning Design — Curriculum', { size: 12, color: STONE, tracking: 2 });
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.04"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
  return page(w, h, body, defs);
}

function sceneStoryboard(rng, w, h) {
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.85) + vignette(w, h);
  let body = `<rect width="${w}" height="${h}" fill="${CREAM}"/>`;
  const cols = 3, gap = w * 0.03, pad = w * 0.06;
  const cw = (w - pad * 2 - gap * (cols - 1)) / cols;
  const ch = h * 0.62;
  for (let i = 0; i < cols; i++) {
    const x = pad + i * (cw + gap);
    const y = h * 0.16;
    body += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="6" fill="${CREAM_DEEP}" stroke="${STONE}" stroke-width="1"/>`;
    // mini scene inside: a small editorial diagram, distinct per frame (no literal pictograms)
    const hz = y + ch * rf(rng, 0.58, 0.68);
    body += `<line x1="${x + 10}" y1="${hz}" x2="${x + cw - 10}" y2="${hz}" stroke="${STONE}" stroke-width="1" opacity="0.5"/>`;
    const cx = x + cw * 0.5, cy = y + ch * 0.36;
    if (i === 0) {
      // lens/aperture motif — concentric rings
      body += `<circle cx="${cx}" cy="${cy}" r="${cw * 0.16}" fill="none" stroke="${CLAY}" stroke-width="1.5" opacity="0.75"/>`;
      body += `<circle cx="${cx}" cy="${cy}" r="${cw * 0.09}" fill="none" stroke="${CLAY}" stroke-width="1" opacity="0.55"/>`;
      body += `<circle cx="${cx}" cy="${cy}" r="${cw * 0.025}" fill="${CLAY}" opacity="0.8"/>`;
    } else if (i === 1) {
      body += botanicalCluster(rng, cx, hz, 1, { lineColor: STONE, petalColor: SAGE, opacity: 0.65, minH: ch * 0.22, maxH: ch * 0.3, scale: 0.8 });
    } else {
      // small bar-chart motif — progress across a lesson
      const bars = 4;
      for (let b = 0; b < bars; b++) {
        const bh2 = ch * rf(rng, 0.12, 0.26);
        const bx = cx - cw * 0.18 + b * (cw * 0.12);
        body += `<rect x="${bx}" y="${cy + ch * 0.14 - bh2}" width="${cw * 0.07}" height="${bh2}" fill="${CLAY}" opacity="${0.45 + b * 0.1}"/>`;
      }
    }
    for (let t = 0; t < 4; t++) body += tickAnnotation(rng, rf(rng, x + 10, x + cw - 10), rf(rng, y + 10, hz - 10), 8);
    body += metaText(x + cw / 2, y + ch + 24, `Scene ${i + 1}`, { size: 12, color: STONE, anchor: 'middle', tracking: 2 });
  }
  body += metaText(w * 0.06, h * 0.09, 'Lesson Storyboard', { size: 14, color: CLAY, tracking: 3 });
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.04"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
  return page(w, h, body, defs);
}

function sceneMoodyStill(rng, w, h, { subject = 'stillLife', lightX = 0.5, lightY = 0.28, hue = SAGE } = {}) {
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.75) + softBlurFilter('blur2', 14) + vignette(w, h);
  const wl = windowLight('wl', w, h, w * lightX, h * lightY, '80%', CHAMPAGNE, 0.55);
  defs += wl.def;
  let body = `<rect width="${w}" height="${h}" fill="${INK}"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#wl)"/>`;

  if (subject === 'stillLife') {
    const vaseGrad = `<linearGradient id="vaseGrad2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3A3225"/>
      <stop offset="45%" stop-color="${INK_SOFT}"/>
      <stop offset="100%" stop-color="#0E0C0A"/>
    </linearGradient>`;
    defs += vaseGrad;
    body += `<g filter="url(#blur2)"><ellipse cx="${w * 0.5}" cy="${h * 0.82}" rx="${w * 0.2}" ry="${h * 0.045}" fill="#000" opacity="0.5"/></g>`;
    body += `<rect x="${w * 0.44}" y="${h * 0.62}" width="${w * 0.12}" height="${h * 0.2}" rx="8" fill="url(#vaseGrad2)"/>`;
    body += `<rect x="${w * 0.443}" y="${h * 0.62}" width="${w * 0.025}" height="${h * 0.2}" rx="4" fill="${CHAMPAGNE}" opacity="0.15"/>`;
    body += botanicalCluster(rng, w * 0.5, h * 0.62, 5, { lineColor: CHAMPAGNE, petalColor: CLAY, opacity: 0.75, minH: h * 0.14, maxH: h * 0.3, scale: 1.3 });
    body += botanicalCluster(rng, w * 0.5, h * 0.63, 2, { lineColor: CHAMPAGNE, petalColor: SAGE, opacity: 0.55, minH: h * 0.1, maxH: h * 0.2, scale: 1.0 });
  } else if (subject === 'portrait') {
    // abstract seated silhouette facing the window light
    body += `<g filter="url(#blur2)">`;
    body += `<ellipse cx="${w * 0.5}" cy="${h * 0.4}" rx="${w * 0.11}" ry="${h * 0.08}" fill="${INK_SOFT}" opacity="0.92"/>`;
    body += `<path d="M ${w * 0.32} ${h * 0.95} Q ${w * 0.5} ${h * 0.55} ${w * 0.68} ${h * 0.95} Z" fill="${INK_SOFT}" opacity="0.92"/>`;
    body += `</g>`;
    body += `<ellipse cx="${w * lightX}" cy="${h * lightY}" rx="${w * 0.05}" ry="${w * 0.05}" fill="${CHAMPAGNE}" opacity="0.15"/>`;
  } else if (subject === 'handsBook') {
    // an open book resting in soft lap-light, with the reader's hands as
    // gently blurred silhouettes framing it from below — kept abstract but legible.
    const pageGrad = `<linearGradient id="pageGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${CREAM}"/>
      <stop offset="100%" stop-color="${CREAM_DEEP}"/>
    </linearGradient>`;
    defs += pageGrad;
    const bw = w * 0.5, bh = h * 0.24, bx = (w - bw) / 2, by = h * 0.5;
    body += `<g filter="url(#blur2)"><ellipse cx="${w * 0.5}" cy="${by + bh + h * 0.02}" rx="${bw * 0.62}" ry="${h * 0.03}" fill="#000" opacity="0.4"/></g>`;
    body += `<path d="M ${bx} ${by + 6} Q ${w * 0.5} ${by - 10} ${bx + bw} ${by + 6} L ${bx + bw} ${by + bh} Q ${w * 0.5} ${by + bh + 14} ${bx} ${by + bh} Z" fill="url(#pageGrad)" stroke="${STONE}" stroke-width="1" opacity="0.96"/>`;
    body += `<line x1="${w / 2}" y1="${by - 4}" x2="${w / 2}" y2="${by + bh + 6}" stroke="${STONE}" stroke-width="1" opacity="0.45"/>`;
    body += ruleLines(bx + bw * 0.08, by + bh * 0.22, bw * 0.34, 5, bh * 0.15, STONE, 0.4);
    body += ruleLines(bx + bw * 0.56, by + bh * 0.22, bw * 0.34, 5, bh * 0.15, STONE, 0.4);
    // hands: soft dark silhouettes entering from bottom corners, cradling the book
    body += `<g filter="url(#blur2)" opacity="0.92">`;
    body += `<path d="M ${w * 0.06} ${h} Q ${w * 0.14} ${h * 0.78} ${w * 0.3} ${by + bh * 0.7} Q ${w * 0.34} ${by + bh + 20} ${w * 0.24} ${h * 0.92} Q ${w * 0.14} ${h} ${w * 0.06} ${h} Z" fill="${INK_SOFT}"/>`;
    body += `<path d="M ${w * 0.94} ${h} Q ${w * 0.86} ${h * 0.78} ${w * 0.7} ${by + bh * 0.7} Q ${w * 0.66} ${by + bh + 20} ${w * 0.76} ${h * 0.92} Q ${w * 0.86} ${h} ${w * 0.94} ${h} Z" fill="${INK_SOFT}"/>`;
    body += `</g>`;
  } else if (subject === 'interior') {
    body += `<rect x="${w * 0.58}" y="${h * 0.14}" width="${w * 0.32}" height="${h * 0.38}" fill="${CHAMPAGNE}" opacity="0.18"/>`;
    body += `<line x1="${w * 0.74}" y1="${h * 0.14}" x2="${w * 0.74}" y2="${h * 0.52}" stroke="${STONE}" stroke-width="2" opacity="0.4"/>`;
    body += `<g filter="url(#blur2)">${chairShape(w * 0.4, h * 0.86, 1.4 * (h / 1600), INK_SOFT)}</g>`;
    body += botanicalCluster(rng, w * 0.78, h * 0.7, 1, { lineColor: STONE, petalColor: SAGE, opacity: 0.4, minH: 60, maxH: 100, scale: 0.9 });
  }
  body += bloomWhisper(rng, w, h, 3);
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.07"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
  body += metaText(w * 0.06, h * 0.06, 'Photography', { size: 12, color: STONE, tracking: 3 });
  return page(w, h, body, defs);
}

function sceneContactSheet(rng, w, h) {
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.8) + vignette(w, h);
  let body = `<rect width="${w}" height="${h}" fill="${INK}"/>`;
  // sprocket holes top/bottom
  const holeGap = w / 26;
  for (let i = 0; i < 26; i++) {
    body += `<rect x="${i * holeGap + holeGap * 0.3}" y="${h * 0.03}" width="${holeGap * 0.4}" height="${h * 0.025}" rx="2" fill="${CREAM}" opacity="0.5"/>`;
    body += `<rect x="${i * holeGap + holeGap * 0.3}" y="${h * 0.95}" width="${holeGap * 0.4}" height="${h * 0.025}" rx="2" fill="${CREAM}" opacity="0.5"/>`;
  }
  const cols = 5, rows = 2;
  const pad = w * 0.03, gap = w * 0.012;
  const cw = (w - pad * 2 - gap * (cols - 1)) / cols;
  const ch = (h * 0.78 - gap * (rows - 1)) / rows;
  const tones = [CREAM_DEEP, CHAMPAGNE, STONE, CLAY, SAGE];
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = pad + c * (cw + gap);
      const y = h * 0.11 + r * (ch + gap);
      const tone = pick(rng, tones);
      body += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${tone}" opacity="${rf(rng, 0.55, 0.85)}"/>`;
      if (rng() > 0.4) body += botanicalCluster(rng, x + cw * 0.5, y + ch * 0.7, 1, { lineColor: INK, petalColor: INK, opacity: 0.3, minH: ch * 0.2, maxH: ch * 0.35, scale: 0.5 });
      body += metaText(x + 6, y + ch - 6, `${String(++n).padStart(2, '0')}`, { size: 9, color: INK, tracking: 1 });
    }
  }
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.06"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
  body += metaText(w * 0.06, h * 0.09, 'Contact Sheet — Roll 04', { size: 13, color: CHAMPAGNE, tracking: 3 });
  return page(w, h, body, defs);
}

function sceneShadowOnPaper(rng, w, h) {
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.9) + softBlurFilter('blur3', 7) + vignette(w, h);
  let body = `<rect width="${w}" height="${h}" fill="${CREAM}"/>`;
  body += `<g filter="url(#blur3)" opacity="0.5">`;
  body += botanicalCluster(rng, w * 0.5, h * 0.55, 5, { lineColor: INK, petalColor: INK, opacity: 0.55, minH: h * 0.18, maxH: h * 0.4, scale: 1.6 });
  body += `</g>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.05"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
  body += metaText(w * 0.08, h * 0.94, 'Shadow Study — Botanical', { size: 12, color: STONE, tracking: 2 });
  return page(w, h, body, defs);
}

function sceneDuskLandscape(rng, w, h) {
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.75) + vignette(w, h);
  const grad = `<linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${INK}"/>
    <stop offset="55%" stop-color="${INK_SOFT}"/>
    <stop offset="78%" stop-color="${CLAY}" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="${CHAMPAGNE}" stop-opacity="0.35"/>
  </linearGradient>`;
  defs += grad;
  let body = `<rect width="${w}" height="${h}" fill="url(#dusk)"/>`;
  // distant treeline / botanical silhouette ridge
  let ridge = `M 0 ${h * 0.72}`;
  for (let x = 0; x <= w; x += w / 14) ridge += ` L ${x} ${h * (0.72 + Math.sin(x / 90) * 0.03 - 0.02 * (x / w))}`;
  ridge += ` L ${w} ${h} L 0 ${h} Z`;
  body += `<path d="${ridge}" fill="${INK}" opacity="0.9"/>`;
  body += botanicalCluster(rng, w * 0.2, h * 0.7, 2, { lineColor: INK, petalColor: INK, opacity: 0.8, minH: h * 0.15, maxH: h * 0.25, scale: 1.2 });
  body += botanicalCluster(rng, w * 0.82, h * 0.68, 2, { lineColor: INK, petalColor: INK, opacity: 0.8, minH: h * 0.15, maxH: h * 0.22, scale: 1.1 });
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.05"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
  body += metaText(w * 0.06, h * 0.09, 'Dusk — Field Study', { size: 13, color: CHAMPAGNE, tracking: 3 });
  return page(w, h, body, defs);
}

// ---------------------------------------------------------------------------
// Scene table — maps every referenced asset to a builder call.
// ---------------------------------------------------------------------------
const SCENES = {
  'hero-bloom-field': { w: 1600, h: 1100, build: (rng) => sceneHeroBloomField(rng, 1600, 1100) },

  'outlet-publishing': { w: 1600, h: 2000, build: (rng) => sceneOutletCover(rng, 1600, 2000, { ground: 'cream', hue: 'iris', style: 'floral' }) },
  'outlet-photography': { w: 1600, h: 2000, build: (rng) => sceneOutletCover(rng, 1600, 2000, { ground: 'dark', hue: 'coral', style: 'stillLife' }) },
  'outlet-learning': { w: 1600, h: 2000, build: (rng) => sceneOutletCover(rng, 1600, 2000, { ground: 'cream', hue: 'gold', style: 'blueprint' }) },

  'gallery-01': { w: 1600, h: 1100, build: (rng) => scenePageSpread(rng, 1600, 1100, { variant: 'floral' }) },
  'gallery-02': { w: 1600, h: 2000, build: (rng) => sceneMoodyStill(rng, 1600, 2000, { subject: 'stillLife' }) },
  'gallery-03': { w: 1600, h: 1100, build: (rng) => sceneStoryboard(rng, 1600, 1100) },
  'gallery-04': { w: 1600, h: 2000, build: (rng) => scenePageSpread(rng, 1600, 2000, { variant: 'foilcover' }) },
  'gallery-05': { w: 1600, h: 1100, build: (rng) => sceneContactSheet(rng, 1600, 1100) },

  'learning-hero': { w: 1600, h: 1100, build: (rng) => sceneBlueprint(rng, 1600, 1100, { title: 'Fine-Line Blueprint', numeral: 'A' }) },
  'ld-artifact-01': { w: 1600, h: 1100, build: (rng) => sceneBlueprint(rng, 1600, 1100, { title: 'Course Journey Map', numeral: '02' }) },
  'ld-artifact-02': { w: 1600, h: 1100, build: (rng) => sceneStoryboard(rng, 1600, 1100) },
  'ld-artifact-03': { w: 1600, h: 1100, build: (rng) => scenePageSpread(rng, 1600, 1100, { variant: 'prompts' }) },

  'photography-hero': { w: 1600, h: 2000, build: (rng) => sceneMoodyStill(rng, 1600, 2000, { subject: 'portrait', lightY: 0.24 }) },
  'photo-develop-01': { w: 1600, h: 2000, build: (rng) => sceneMoodyStill(rng, 1600, 2000, { subject: 'stillLife', lightY: 0.22 }) },
  'photo-develop-02': { w: 1600, h: 2000, build: (rng) => sceneMoodyStill(rng, 1600, 2000, { subject: 'portrait', lightX: 0.62, lightY: 0.3 }) },
  'photo-frame-01': { w: 1600, h: 2000, build: (rng) => sceneShadowOnPaper(rng, 1600, 2000) },
  'photo-frame-02': { w: 1600, h: 2000, build: (rng) => sceneMoodyStill(rng, 1600, 2000, { subject: 'handsBook', lightY: 0.3 }) },
  'photo-frame-03': { w: 1600, h: 2000, build: (rng) => sceneMoodyStill(rng, 1600, 2000, { subject: 'interior', lightX: 0.7, lightY: 0.22 }) },
  'photo-frame-04': { w: 1600, h: 1100, build: (rng) => sceneDuskLandscape(rng, 1600, 1100) },

  'publishing-hero': { w: 1600, h: 1100, build: (rng) => sceneBookStack(rng, 1600, 1100) },
  'pub-spread-01': { w: 1600, h: 1100, build: (rng) => scenePageSpread(rng, 1600, 1100, { variant: 'floral' }) },
  'pub-spread-02': { w: 1600, h: 1600, build: (rng) => scenePageSpread(rng, 1600, 1600, { variant: 'dropcap' }) },
  'pub-spread-03': { w: 1600, h: 2000, build: (rng) => scenePageSpread(rng, 1600, 2000, { variant: 'prompts' }) },
  'pub-spread-04': { w: 1600, h: 2000, build: (rng) => scenePageSpread(rng, 1600, 2000, { variant: 'foilcover' }) },
};

// ---------------------------------------------------------------------------
// Extras: paper grain texture + OG card
// ---------------------------------------------------------------------------
function buildGrainTexture() {
  const w = 512, h = 512;
  const defs = `<filter id="g" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="42" stitchTiles="stitch" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.33  0 0 0 0 0.28  0 0 0 0.16 0"/>
  </filter>`;
  const body = `<rect width="${w}" height="${h}" fill="transparent"/><rect width="${w}" height="${h}" filter="url(#g)"/>`;
  return { html: page(w, h, body, defs), w, h };
}

function buildOgCard() {
  const w = 1200, h = 630;
  const rng = makeRng('og-card');
  let defs = grainFilter('grain', 5, 0.85) + vignette(w, h);
  const wl = windowLight('wl', w, h, w * 0.5, h * 0.35, '85%', CHAMPAGNE, 0.22);
  defs += wl.def;
  let body = `<rect width="${w}" height="${h}" fill="${INK}"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#wl)"/>`;
  body += botanicalCluster(rng, w * 0.12, h * 0.85, 2, { lineColor: STONE, petalColor: CLAY, opacity: 0.4, minH: 90, maxH: 150, scale: 1.1 });
  body += botanicalCluster(rng, w * 0.9, h * 0.85, 2, { lineColor: STONE, petalColor: SAGE, opacity: 0.4, minH: 90, maxH: 150, scale: 1.1 });
  body += metaText(w * 0.5, h * 0.32, 'Publishing · Photography · Learning Design', { size: 14, color: STONE, tracking: 3, anchor: 'middle' });
  body += `<text x="${w / 2}" y="${h * 0.56}" font-family="Fraunces" font-size="86" fill="${CREAM}" text-anchor="middle" letter-spacing="4" opacity="0.95">HOPE ON STUDIO</text>`;
  body += `<line x1="${w * 0.38}" y1="${h * 0.62}" x2="${w * 0.62}" y2="${h * 0.62}" stroke="${CHAMPAGNE}" stroke-width="1" opacity="0.6"/>`;
  body += `<text x="${w / 2}" y="${h * 0.68}" font-family="Cormorant Garamond" font-style="italic" font-size="24" fill="${CHAMPAGNE}" text-anchor="middle" opacity="0.85">a gift, made with hope</text>`;
  body += bloomWhisper(rng, w, h, 5);
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.05"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
  return { html: page(w, h, body, defs), w, h };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
async function main() {
  const filter = process.argv[2];
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page1 = await browser.newPage({ deviceScaleFactor: 1 });

  async function shoot(html, w, h, outPath, { type = 'jpeg', quality = 82, omitBackground = false } = {}) {
    await page1.setViewportSize({ width: w, height: h });
    await page1.setContent(html, { waitUntil: 'networkidle' });
    await page1.evaluate(() => document.fonts.ready);
    const opts = { path: outPath, type };
    if (type === 'jpeg') opts.quality = quality;
    if (omitBackground) opts.omitBackground = true;
    await page1.screenshot(opts);
    const size = fs.statSync(outPath).size;
    console.log(`  ${path.basename(outPath)}  ${w}x${h}  ${(size / 1024).toFixed(0)}KB`);
  }

  const names = Object.keys(SCENES).filter((n) => !filter || n.includes(filter));
  console.log(`Generating ${names.length} art assets...`);
  for (const name of names) {
    const spec = SCENES[name];
    const rng = makeRng(name);
    const html = spec.build(rng);
    await shoot(html, spec.w, spec.h, path.join(OUT_ART, `${name}.jpg`));
  }

  if (!filter || 'paper-grain'.includes(filter)) {
    const { html, w, h } = buildGrainTexture();
    await shoot(html, w, h, path.join(OUT_TEX, 'paper-grain.png'), { type: 'png', omitBackground: true });
  }
  if (!filter || 'og'.includes(filter)) {
    const { html, w, h } = buildOgCard();
    await shoot(html, w, h, path.join(OUT_ROOT, 'og.jpg'));
  }

  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
