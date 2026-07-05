// Hope On Studio — placeholder art generator
// Builds every /assets/art/*.jpg referenced by shared/content/*.json, plus the
// tileable paper-grain texture and the OG card, as HTML/SVG compositions
// screenshotted with Playwright chromium. Deterministic (seeded) per image.
//
// Art direction (rework pass): rich, layered, chiaroscuro compositions built to
// feed the halftone particle engine — every image carries a clear LIGHT mass
// against a DARK mass, dense botanical layers at three depths, organic
// bezier-petal rosettes (never clip-art star-flowers), branching stems with
// natural curve, film/paper grain, and soft *directional* light (no symmetric
// center vignettes). Palette strictly DESIGN.md §2; bloom hues are whispers only.
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
// v2 "Light Sage World" — owner redirect (context/DESIGN.md top banner):
// the site ground is near-white sage; these two match site/src/styles/tokens.css
// exactly so generated art sits flush with the live page background.
const CREAM = '#F3F6EF';
const CREAM_DEEP = '#E9EFE0';
const SAGE_TINT = '#E4EBDA';
const SAGE_TINT_DEEP = '#D9E2CB';
const SAGE = '#8A9484';
const CLAY = '#B08D7A';
const STONE = '#A8A196';
const CHAMPAGNE = '#D8C9A8';
const BLOOM = { peony: '#E86A8A', coral: '#F2917B', iris: '#9B7FC7', gold: '#F0C36B' };
// The vivid vine-flower family (DESIGN.md top banner + tokens.css --vine-*).
// Reserved for accents/pops against the light sage ground — never a full ground.
const VINE = { fuchsia: '#D6479B', violet: '#8A63D2', teal: '#2FB5AE', marigold: '#E9A13B', leaf: '#4C9A63' };

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
// Colour helpers — mixing lets us derive per-petal light/shade without new hues.
// ---------------------------------------------------------------------------
function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function rgbToHex(c) { return '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return rgbToHex(ca.map((v, i) => v + (cb[i] - v) * t));
}

// ---------------------------------------------------------------------------
// Organic petal geometry — an asymmetric, gently curling bezier silhouette.
// Drawn in local space pointing +x from the origin; caller positions/rotates.
// ---------------------------------------------------------------------------
function petalLocal(len, w, curl = 0, belly = 1) {
  const ty = curl * len;                 // sideways drift of the tip → a curl
  const wA = w * belly, wB = w * (2 - belly) * 0.5 + w * 0.25; // asymmetric flanks
  return `M 0 0 `
    + `C ${0.10 * len} ${wA} ${0.52 * len} ${wA * 1.05 + ty * 0.5} ${len} ${ty} `
    + `C ${0.52 * len} ${-wB * 1.05 + ty * 0.5} ${0.10 * len} ${-wB} 0 0 Z`;
}

// A leaf: a slim petal with a suggested midrib.
function leaf(cx, cy, len, w, rot, color, opacity = 0.6) {
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})">`
    + `<path d="${petalLocal(len, w, 0.12, 0.8)}" fill="${color}" opacity="${opacity}"/>`
    + `<path d="M 0 0 L ${len * 0.92} ${len * 0.06}" stroke="${mix(color, INK, 0.3)}" stroke-width="${Math.max(0.6, w * 0.06)}" opacity="${opacity * 0.5}" fill="none"/>`
    + `</g>`;
}

// ---------------------------------------------------------------------------
// Rosette — a peony / ranunculus-like bloom: concentric rings of overlapping
// organic petals, per-petal rotation + length jitter, directional shading so a
// clear lit side reads against a shaded side. This replaces the star-flowers.
// ---------------------------------------------------------------------------
function rosette(rng, cx, cy, R, opts = {}) {
  const {
    baseColor = CLAY, tipColor, coreColor = CHAMPAGNE,
    rings = 4, basePetals = 14, opacity = 1, lightAngle = -70, lightStrength = 0.42,
    open = 1, // 1 = fully open; <1 = tighter bud
  } = opts;
  const tip = tipColor || mix(baseColor, CREAM, 0.42);
  let g = `<g opacity="${opacity}">`;
  // subtle drop shadow behind the whole head for lift
  g += `<ellipse cx="${cx}" cy="${cy + R * 0.16}" rx="${R * 0.92}" ry="${R * 0.8}" fill="${INK}" opacity="0.10"/>`;
  for (let r = 0; r < rings; r++) {
    const t = rings <= 1 ? 0 : r / (rings - 1);       // 0 outer … 1 inner
    const count = Math.max(3, Math.round(basePetals * (1 - t * 0.6)));
    const emanate = R * (0.10 + (1 - t) * 0.34) * open;
    const len = R * (0.46 + (1 - t) * 0.56);
    const w = len * rf(rng, 0.44, 0.56);
    const ringBase = mix(baseColor, tip, t * 0.85);   // inner petals lighter
    const rot0 = r * 26 + rf(rng, -10, 10);
    for (let i = 0; i < count; i++) {
      const a = (360 / count) * i + rot0 + rf(rng, -7, 7);
      const rad = (a * Math.PI) / 180;
      const px = cx + Math.cos(rad) * emanate;
      const py = cy + Math.sin(rad) * emanate;
      const shade = 0.5 + 0.5 * Math.cos(((a - lightAngle) * Math.PI) / 180); // 0 shade … 1 lit
      let fill = mix(ringBase, CREAM, shade * lightStrength);
      fill = mix(fill, INK, (1 - shade) * 0.28);
      const ll = len * rf(rng, 0.82, 1.16);
      const ww = w * rf(rng, 0.85, 1.12);
      const curl = rf(rng, -0.16, 0.16);
      g += `<path transform="translate(${px} ${py}) rotate(${a})" d="${petalLocal(ll, ww, curl)}" `
        + `fill="${fill}" opacity="${(0.9 - t * 0.06).toFixed(2)}"/>`;
    }
  }
  // core cluster + stamens catching the light
  g += `<circle cx="${cx}" cy="${cy}" r="${R * 0.16}" fill="${mix(baseColor, tip, 0.92)}"/>`;
  const stamens = ri(rng, 9, 16);
  for (let i = 0; i < stamens; i++) {
    const a = rng() * 360, rad = (a * Math.PI) / 180, rr = R * rf(rng, 0.02, 0.15);
    g += `<circle cx="${cx + Math.cos(rad) * rr}" cy="${cy + Math.sin(rad) * rr}" `
      + `r="${(R * rf(rng, 0.012, 0.03)).toFixed(2)}" fill="${coreColor}" opacity="${rf(rng, 0.55, 0.95).toFixed(2)}"/>`;
  }
  g += `</g>`;
  return g;
}

// A tight bud — smaller, more closed rosette for variety in a bouquet.
function bud(rng, cx, cy, R, color, opacity = 1) {
  return rosette(rng, cx, cy, R, { baseColor: color, rings: 3, basePetals: 8, open: 0.5, opacity, lightStrength: 0.35 });
}

// ---------------------------------------------------------------------------
// Branching stem with a natural bezier bow and leaves riding the curve.
// Returns { g, tip:[x,y] } so callers can perch a bloom on the end.
// ---------------------------------------------------------------------------
function branch(rng, x, y, len, angle, opts = {}) {
  const { color = STONE, width = 2, leaves = 4, leafColor, opacity = 0.7, bow = 1, scale = 1 } = opts;
  const rad = (angle * Math.PI) / 180;
  const nrad = rad + Math.PI / 2;
  const ex = x + Math.cos(rad) * len, ey = y + Math.sin(rad) * len;
  const b = rf(rng, -1, 1) * len * 0.16 * bow;
  const c1x = x + Math.cos(rad) * len * 0.34 + Math.cos(nrad) * b;
  const c1y = y + Math.sin(rad) * len * 0.34 + Math.sin(nrad) * b;
  const c2x = x + Math.cos(rad) * len * 0.70 + Math.cos(nrad) * b * 1.4;
  const c2y = y + Math.sin(rad) * len * 0.70 + Math.sin(nrad) * b * 1.4;
  const lc = leafColor || color;
  let g = `<g opacity="${opacity}">`;
  g += `<path d="M ${x} ${y} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}" stroke="${color}" `
    + `stroke-width="${(width * scale).toFixed(2)}" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < leaves; i++) {
    const tt = 0.28 + (i / Math.max(1, leaves)) * 0.62;
    const mt = 1 - tt;
    const bx = mt * mt * mt * x + 3 * mt * mt * tt * c1x + 3 * mt * tt * tt * c2x + tt * tt * tt * ex;
    const by = mt * mt * mt * y + 3 * mt * mt * tt * c1y + 3 * mt * tt * tt * c2y + tt * tt * tt * ey;
    const side = i % 2 ? 1 : -1;
    const la = angle + side * rf(rng, 36, 64);
    g += leaf(bx, by, len * 0.18 * scale * rf(rng, 0.8, 1.2), len * 0.055 * scale, la, lc, rf(rng, 0.45, 0.72));
  }
  g += `</g>`;
  return { g, tip: [ex, ey] };
}

// ---------------------------------------------------------------------------
// A gathered bouquet rising from a base point (used above a vase / in a field).
// ---------------------------------------------------------------------------
function bouquet(rng, baseX, baseY, opts = {}) {
  const {
    stems = 7, spread = 46, minLen = 300, maxLen = 560, stemColor = CHAMPAGNE,
    bloomColors = [CLAY, mix(SAGE, CLAY, 0.4), STONE], lightAngle = -70,
    bloomScale = 1, leafColor, bloomEvery = 0.72, whisperHue = null,
    whisperChance = 0.28, whisperMix = 0.5,
  } = opts;
  let g = '';
  const order = [];
  for (let i = 0; i < stems; i++) order.push(i);
  for (let i = 0; i < stems; i++) {
    const f = stems <= 1 ? 0 : i / (stems - 1);
    const angle = -90 + (f - 0.5) * 2 * spread + rf(rng, -6, 6);
    const len = rf(rng, minLen, maxLen) * (1 - Math.abs(f - 0.5) * 0.28);
    const br = branch(rng, baseX + rf(rng, -14, 14), baseY, len, angle, {
      color: stemColor, width: rf(rng, 2, 3.2), leaves: ri(rng, 2, 5),
      leafColor: leafColor || mix(SAGE, stemColor, 0.4), opacity: rf(rng, 0.6, 0.85), bow: 1.1,
    });
    g += br.g;
    if (rng() < bloomEvery) {
      const R = len * rf(rng, 0.14, 0.22) * bloomScale;
      const useWhisper = whisperHue && rng() < whisperChance;
      const whisperCol = Array.isArray(whisperHue) ? pick(rng, whisperHue) : whisperHue;
      const col = useWhisper ? mix(pick(rng, bloomColors), whisperCol, whisperMix) : pick(rng, bloomColors);
      if (rng() < 0.72) g += rosette(rng, br.tip[0], br.tip[1], R, { baseColor: col, coreColor: CHAMPAGNE, rings: ri(rng, 3, 4), basePetals: ri(rng, 11, 15), lightAngle });
      else g += bud(rng, br.tip[0], br.tip[1], R * 0.7, col);
    } else {
      // seed head / grass tip to fill rhythm
      g += `<circle cx="${br.tip[0]}" cy="${br.tip[1]}" r="${(len * 0.02).toFixed(1)}" fill="${mix(stemColor, CHAMPAGNE, 0.4)}" opacity="0.7"/>`;
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// Layered botanical field across the full width — three depth bands with blur +
// opacity + scale falloff, so it reads as a lush moonlit meadow, never sparse.
// ---------------------------------------------------------------------------
function botanicalField(rng, w, h, opts = {}) {
  const {
    baseY, bands = 3, perBand = 11, stemColor = STONE, bloomColors = [SAGE, CLAY], whisperHue = null,
    // groundMode 'dark' (default) = old behaviour: far band inks toward near-black,
    // near band stays lighter (reads against a dark sky). groundMode 'light' inverts
    // this so the field reads as a dark-on-light silhouette against a pale sage ground:
    // near band goes deep ink-sage, far band fades toward the background.
    groundMode = 'dark', inkColor = INK, whisperChance = 0.22, whisperMix = 0.5,
  } = opts;
  let g = '';
  for (let band = 0; band < bands; band++) {
    const depth = bands <= 1 ? 1 : band / (bands - 1); // 0 far … 1 near
    const op = 0.30 + depth * 0.55;
    const scale = 0.7 + depth * 0.8;
    const col = groundMode === 'light'
      ? mix(stemColor, inkColor, 0.12 + depth * 0.72)
      : mix(stemColor, INK, (1 - depth) * 0.38);
    const n = Math.round(perBand * (0.75 + depth * 0.6));
    const useBlur = band < bands - 1;
    let layer = `<g opacity="${op.toFixed(2)}"${useBlur ? ` filter="url(#fieldBlur${band})"` : ''}>`;
    for (let i = 0; i < n; i++) {
      const x = (w / n) * (i + rf(rng, 0.1, 0.9));
      const by = baseY + rf(rng, -h * 0.015, h * 0.05) - depth * h * 0.02;
      const len = h * (0.16 + depth * 0.26) * rf(rng, 0.7, 1.25);
      const angle = -90 + rf(rng, -15, 15);
      const br = branch(rng, x, by, len, angle, {
        color: col, width: 1.5 * scale, leaves: ri(rng, 2, 5),
        leafColor: mix(col, bloomColors[0], 0.3), opacity: 1, bow: 1.2, scale,
      });
      layer += br.g;
      if (depth > 0.28 && rng() < 0.55) {
        const R = len * rf(rng, 0.12, 0.2);
        const useWhisper = whisperHue && rng() < whisperChance;
        const whisperCol = Array.isArray(whisperHue) ? pick(rng, whisperHue) : whisperHue;
        const col2 = useWhisper ? mix(pick(rng, bloomColors), whisperCol, whisperMix) : mix(pick(rng, bloomColors), col, 0.25);
        layer += rosette(rng, br.tip[0], br.tip[1], R, { baseColor: col2, coreColor: mix(CHAMPAGNE, col, 0.3), rings: 3, basePetals: ri(rng, 9, 12), opacity: 0.92, lightStrength: 0.3 + depth * 0.2 });
      } else {
        layer += `<circle cx="${br.tip[0]}" cy="${br.tip[1]}" r="${(len * 0.022).toFixed(1)}" fill="${mix(col, CHAMPAGNE, 0.35)}" opacity="0.8"/>`;
      }
    }
    layer += `</g>`;
    g += layer;
  }
  return g;
}

// Scattered drifting petals / seed motes to give negative space rhythm.
function scatter(rng, w, h, count, colors, o = {}) {
  const { yMin = 0.08, yMax = 0.72, size = 12, op = 0.5, blurId = null } = o;
  let g = blurId ? `<g filter="url(#${blurId})">` : '<g>';
  for (let i = 0; i < count; i++) {
    const x = rf(rng, w * 0.05, w * 0.95), y = rf(rng, h * yMin, h * yMax);
    const s = size * rf(rng, 0.55, 1.5);
    g += `<path transform="translate(${x} ${y}) rotate(${(rng() * 360).toFixed(0)})" `
      + `d="${petalLocal(s, s * 0.5, 0.18)}" fill="${pick(rng, colors)}" opacity="${(op * rf(rng, 0.5, 1)).toFixed(2)}"/>`;
  }
  g += '</g>';
  return g;
}

// ---------------------------------------------------------------------------
// Light & atmosphere — soft DIRECTIONAL washes (no symmetric center vignette).
// ---------------------------------------------------------------------------
function directionalLight(id, w, h, cx, cy, r, color = CHAMPAGNE, op = 0.5) {
  return `<radialGradient id="${id}" cx="${((cx / w) * 100).toFixed(1)}%" cy="${((cy / h) * 100).toFixed(1)}%" r="${r}">
    <stop offset="0%" stop-color="${color}" stop-opacity="${op}"/>
    <stop offset="45%" stop-color="${color}" stop-opacity="${(op * 0.35).toFixed(3)}"/>
    <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
  </radialGradient>`;
}

// A gentle asymmetric grounding — darker toward the bottom & one lower edge only,
// applied as an overlay. Reads as settled light, not a picture-frame vignette.
function groundShade(id, w, h, dark = INK, strength = 0.34) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${dark}" stop-opacity="0"/>
    <stop offset="58%" stop-color="${dark}" stop-opacity="0"/>
    <stop offset="100%" stop-color="${dark}" stop-opacity="${strength}"/>
  </linearGradient>`;
}

function grainFilter(id, seed, freq = 0.85) {
  return `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" stitchTiles="stitch" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 0"/>
  </filter>`;
}

function blurFilter(id, dev) {
  return `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${dev}"/></filter>`;
}

function fieldBlurDefs(bands) {
  let d = '';
  for (let b = 0; b < bands - 1; b++) d += blurFilter(`fieldBlur${b}`, (bands - 1 - b) * 3.2);
  return d;
}

function metaText(x, y, text, { size = 12, color = STONE, anchor = 'start', tracking = 2 } = {}) {
  return `<text x="${x}" y="${y}" font-family="Figtree" font-size="${size}" fill="${color}" letter-spacing="${tracking}" text-anchor="${anchor}" font-weight="500">${text.toUpperCase()}</text>`;
}

function tickAnnotation(rng, x, y, len = 14, color = STONE, dot = CLAY) {
  const a = rf(rng, -22, 22), rad = (a * Math.PI) / 180;
  const x2 = x + Math.cos(rad) * len, y2 = y + Math.sin(rad) * len;
  return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1"/><circle cx="${x2}" cy="${y2}" r="2" fill="${dot}"/>`;
}

function dashedGuide(x1, y1, x2, y2, color = STONE, opacity = 0.5, dash = '2 5') {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" stroke-dasharray="${dash}" opacity="${opacity}"/>`;
}

// Handwriting-suggestion lines: a wavering baseline broken into "words".
function scriptLines(rng, x, y, w, count, gap, color = STONE, opacity = 0.4) {
  let g = '';
  for (let i = 0; i < count; i++) {
    const yy = y + i * gap;
    let cx = x;
    const end = x + w * rf(rng, 0.7, 0.98);
    while (cx < end) {
      const wl = Math.min(rf(rng, w * 0.06, w * 0.2), end - cx);
      const wobble = rf(rng, -1.5, 1.5);
      g += `<path d="M ${cx} ${yy} q ${wl * 0.5} ${wobble} ${wl} 0" stroke="${color}" stroke-width="1.6" fill="none" opacity="${opacity}" stroke-linecap="round"/>`;
      cx += wl + rf(rng, w * 0.015, w * 0.035);
    }
  }
  return g;
}

// A pressed / dried flower laid flat on a page (softer, flatter than a live one).
function pressedFlower(rng, cx, cy, R, color) {
  let g = `<g opacity="0.9">`;
  g += branch(rng, cx, cy + R * 1.6, R * 1.8, -90, { color: mix(SAGE, STONE, 0.5), width: 1.6, leaves: 4, leafColor: mix(SAGE, STONE, 0.4), opacity: 0.7, bow: 0.6 }).g;
  g += rosette(rng, cx, cy, R, { baseColor: color, coreColor: mix(CHAMPAGNE, color, 0.3), rings: 3, basePetals: 12, opacity: 0.85, lightStrength: 0.25 });
  g += `</g>`;
  return g;
}

function bookMockup(rng, { x, y, w, h, fill = CLAY, foil = CHAMPAGNE, rot = 0, title = '', lightX = -0.5 }) {
  // cloth cover with spine, a woven-cloth texture band, foil title + rule
  const spineW = w * 0.1;
  const shade = mix(fill, INK, 0.22);
  const litEdge = mix(fill, CREAM, 0.18);
  let g = `<g transform="translate(${x} ${y}) rotate(${rot})">`;
  g += `<rect x="8" y="12" width="${w}" height="${h}" rx="7" fill="${INK}" opacity="0.28"/>`;               // cast shadow
  g += `<rect x="0" y="0" width="${w}" height="${h}" rx="7" fill="${fill}"/>`;                                // board
  g += `<rect x="0" y="0" width="${w}" height="${h}" rx="7" fill="url(#cloth)" opacity="0.5"/>`;             // cloth weave
  g += `<rect x="0" y="0" width="${spineW}" height="${h}" rx="7" fill="${shade}"/>`;                          // spine
  g += `<rect x="${spineW}" y="0" width="2.5" height="${h}" fill="${INK}" opacity="0.18"/>`;                 // hinge
  g += `<rect x="${w - 4}" y="6" width="4" height="${h - 12}" rx="2" fill="${litEdge}" opacity="0.5"/>`;      // lit fore-edge
  if (title) {
    g += `<rect x="${w * 0.24}" y="${h * 0.34}" width="${w * 0.56}" height="1.8" fill="${foil}" opacity="0.9"/>`;
    g += `<text x="${w * 0.52}" y="${h * 0.30}" font-family="Fraunces" font-size="${w * 0.085}" fill="${foil}" text-anchor="middle" font-style="italic" font-weight="380">${title}</text>`;
    g += `<rect x="${w * 0.24}" y="${h * 0.83}" width="${w * 0.3}" height="1.4" fill="${foil}" opacity="0.55"/>`;
    g += `<circle cx="${w * 0.52}" cy="${h * 0.9}" r="${w * 0.02}" fill="none" stroke="${foil}" stroke-width="1.2" opacity="0.6"/>`;
  }
  g += `</g>`;
  return g;
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

// Shared texture defs (cloth weave for book covers, paper fibre).
function clothDef() {
  return `<filter id="cloth" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="turbulence" baseFrequency="0.02 0.5" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.5 0 0 0 0"/>
  </filter>`;
}

// ===========================================================================
// Scene builders
// ===========================================================================

// --- Landing hero: a lush LIGHT botanical meadow across the full width ------
// v2 rework (DESIGN.md top banner): the landing hero particle field must read
// as pale sage ground with a strong dark-on-light meadow silhouette (the
// halftone engine samples luminance, so this contrast band structure matters
// as much as the final look) plus a generous scatter of vivid vine-color
// blossoms threaded through — no dark sky mass anywhere in this composition.
function sceneHeroBloomField(rng, w, h) {
  const bands = 3;
  // a deep GREEN-ink (not the warm near-black INK) so the silhouette reads as
  // sage-ink, not brown-gray, against the pale sage field
  const meadowInk = mix(SAGE, '#1B2417', 0.7);
  const vineHues = [VINE.fuchsia, VINE.violet, VINE.teal, VINE.marigold];
  let defs = grainFilter('grain', 77, 0.9) + fieldBlurDefs(bands)
    + directionalLight('sun', w, h, w * 0.64, h * 0.2, '65%', CHAMPAGNE, 0.22)
    + groundShade('gs', w, h, SAGE_TINT_DEEP, 0.2) + blurFilter('sb', 8);
  // pale sage sky — near-white at top, settling to a soft sage tint at the ground
  defs += `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${CREAM}"/>
    <stop offset="52%" stop-color="${mix(CREAM, SAGE_TINT, 0.55)}"/>
    <stop offset="100%" stop-color="${SAGE_TINT_DEEP}"/>
  </linearGradient>`;
  let body = `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#sun)"/>`;
  // faraway drifting motes high in the frame, muted
  body += scatter(rng, w, h, 10, [STONE, CLAY, mix(CREAM, SAGE, 0.35)], { yMin: 0.1, yMax: 0.46, size: 8, op: 0.3, blurId: 'sb' });
  // the meadow silhouette — full width, three depths, strong dark-on-light
  // structure for the halftone engine, with vivid vine blossoms threaded in
  body += botanicalField(rng, w, h, {
    baseY: h * 0.99, bands, perBand: 13, stemColor: mix(SAGE, STONE, 0.22),
    groundMode: 'light', inkColor: meadowInk,
    bloomColors: [SAGE, mix(SAGE, CLAY, 0.35), mix(SAGE, meadowInk, 0.3)],
    whisperHue: vineHues, whisperChance: 0.24, whisperMix: 0.88,
  });
  // a couple of nearer, sharper focal blooms — one vivid, one muted sage
  body += rosette(rng, w * 0.30, h * 0.64, h * 0.054, { baseColor: mix(VINE.violet, CREAM, 0.08), coreColor: CHAMPAGNE, rings: 4, basePetals: 15, lightAngle: -60, lightStrength: 0.42 });
  body += rosette(rng, w * 0.71, h * 0.70, h * 0.048, { baseColor: mix(SAGE, meadowInk, 0.35), coreColor: CHAMPAGNE, rings: 4, basePetals: 13, lightAngle: -60, lightStrength: 0.42 });
  // a small cluster of clearly vivid vine-color blossoms threaded through the mid-field
  body += rosette(rng, w * 0.5, h * 0.685, h * 0.032, { baseColor: VINE.marigold, coreColor: mix(CREAM, VINE.marigold, 0.3), rings: 3, basePetals: 11, opacity: 0.94 });
  body += rosette(rng, w * 0.42, h * 0.79, h * 0.024, { baseColor: VINE.teal, coreColor: CREAM, rings: 3, basePetals: 10, opacity: 0.92 });
  body += rosette(rng, w * 0.86, h * 0.8, h * 0.026, { baseColor: VINE.fuchsia, coreColor: CREAM, rings: 3, basePetals: 10, opacity: 0.92 });
  // scattered petals resting low in the grass — a minority (~1 in 6-7) vivid
  body += scatter(rng, w, h, 15, [mix(SAGE, CLAY, 0.3), STONE, mix(STONE, INK, 0.1), VINE.fuchsia, VINE.marigold], { yMin: 0.6, yMax: 0.97, size: 12, op: 0.55 });
  body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.045"/>`;
  body += metaText(w * 0.06, h * 0.08, 'Hope On Studio — Est. 2026', { size: 15, color: mix(STONE, INK, 0.25), tracking: 3 });
  body += metaText(w * 0.94, h * 0.08, '01 / 04', { size: 15, color: STONE, tracking: 2, anchor: 'end' });
  return page(w, h, body, defs);
}

// --- Photography hero: a moody window still-life (readable subject) ----------
// v2: keeps its chiaroscuro drama (these are the "prints"/halftone particle
// sources) but the shadow floor is lifted a touch so it doesn't read as a
// black hole floating on the light sage page, plus a vivid vine whisper in
// the bouquet.
function sceneWindowStill(rng, w, h, { label = 'Photography', index = null } = {}) {
  const floor = mix(INK, STONE, 0.14); // lifted from pure INK
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.75) + blurFilter('sb', 10) + blurFilter('sbBig', 26)
    + groundShade('gs', w, h, floor, 0.34)
    + directionalLight('pool', w, h, w * 0.40, h * 0.5, '55%', CHAMPAGNE, 0.14);
  // window mullion light: a bright warm rectangle up-left = the LIGHT mass
  const winX = w * 0.08, winY = h * 0.05, winW = w * 0.44, winH = h * 0.6;
  defs += `<linearGradient id="win" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${mix(CREAM, CHAMPAGNE, 0.3)}" stop-opacity="0.95"/>
    <stop offset="70%" stop-color="${CHAMPAGNE}" stop-opacity="0.5"/>
    <stop offset="100%" stop-color="${CHAMPAGNE}" stop-opacity="0.12"/>
  </linearGradient>`;
  defs += `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${mix(INK_SOFT, CHAMPAGNE, 0.16)}"/>
    <stop offset="55%" stop-color="${mix(INK_SOFT, STONE, 0.1)}"/>
    <stop offset="100%" stop-color="${floor}"/>
  </linearGradient>`;
  // table plane
  const tableY = h * 0.68;
  defs += `<linearGradient id="table" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${mix(INK_SOFT, CHAMPAGNE, 0.24)}"/>
    <stop offset="100%" stop-color="${floor}"/>
  </linearGradient>`;
  defs += `<linearGradient id="vase" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${mix(STONE, INK, 0.3)}"/>
    <stop offset="42%" stop-color="${mix(INK_SOFT, STONE, 0.22)}"/>
    <stop offset="100%" stop-color="${floor}"/>
  </linearGradient>`;

  let body = `<rect width="${w}" height="${h}" fill="url(#bg)"/>`;
  // window glow (soft, blurred) — the light source
  body += `<g filter="url(#sbBig)"><rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" rx="10" fill="url(#win)"/></g>`;
  body += `<rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" rx="8" fill="url(#win)" opacity="0.85"/>`;
  // muntins (window bars) reading as crisp dark lines over the light
  const barc = mix(INK_SOFT, STONE, 0.25);
  body += `<line x1="${winX + winW * 0.5}" y1="${winY}" x2="${winX + winW * 0.5}" y2="${winY + winH}" stroke="${barc}" stroke-width="6" opacity="0.55"/>`;
  for (let i = 1; i < 3; i++) body += `<line x1="${winX}" y1="${winY + winH * (i / 3)}" x2="${winX + winW}" y2="${winY + winH * (i / 3)}" stroke="${barc}" stroke-width="6" opacity="0.55"/>`;
  body += `<rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" rx="8" fill="none" stroke="${barc}" stroke-width="7" opacity="0.6"/>`;
  // light streaming across the table (a soft parallelogram of glow)
  body += `<g filter="url(#sbBig)" opacity="0.5"><path d="M ${winX + winW * 0.1} ${tableY} L ${winX + winW} ${tableY} L ${winX + winW * 1.5} ${h} L ${winX - winW * 0.1} ${h} Z" fill="${CHAMPAGNE}"/></g>`;
  // table
  body += `<rect x="0" y="${tableY}" width="${w}" height="${h - tableY}" fill="url(#table)"/>`;
  body += `<line x1="0" y1="${tableY}" x2="${w}" y2="${tableY}" stroke="${mix(CHAMPAGNE, INK, 0.3)}" stroke-width="1.5" opacity="0.5"/>`;
  // long cast shadow of the vase & bouquet stretching right (away from window)
  body += `<g filter="url(#sbBig)"><ellipse cx="${w * 0.72}" cy="${tableY + h * 0.06}" rx="${w * 0.3}" ry="${h * 0.035}" fill="${INK}" opacity="0.6"/></g>`;
  // the vase — dark silhouette catching a lit rim on the window side
  const vx = w * 0.5, vw = w * 0.14, vh = h * 0.2, vy = tableY - vh + h * 0.02;
  body += `<path d="M ${vx - vw / 2} ${vy} Q ${vx - vw * 0.62} ${vy + vh * 0.5} ${vx - vw * 0.4} ${vy + vh} L ${vx + vw * 0.4} ${vy + vh} Q ${vx + vw * 0.62} ${vy + vh * 0.5} ${vx + vw / 2} ${vy} Z" fill="url(#vase)"/>`;
  body += `<ellipse cx="${vx}" cy="${vy}" rx="${vw / 2}" ry="${vw * 0.12}" fill="${INK}" opacity="0.9"/>`;
  body += `<path d="M ${vx - vw / 2} ${vy} Q ${vx - vw * 0.62} ${vy + vh * 0.5} ${vx - vw * 0.4} ${vy + vh}" stroke="${mix(CHAMPAGNE, STONE, 0.3)}" stroke-width="2.5" fill="none" opacity="0.5"/>`;
  // the bouquet — layered rosettes lit from the window (upper-left), with a
  // clearly vivid vine-fuchsia whisper (photography's signature hue)
  body += bouquet(rng, vx, vy + vh * 0.1, {
    stems: 9, spread: 52, minLen: h * 0.16, maxLen: h * 0.34, stemColor: mix(CHAMPAGNE, INK, 0.35),
    bloomColors: [mix(CLAY, CREAM, 0.2), mix(SAGE, CLAY, 0.4), STONE, mix(CLAY, CREAM, 0.35)],
    lightAngle: -125, bloomScale: 1.15, whisperHue: VINE.fuchsia, whisperChance: 0.4, whisperMix: 0.75,
  });
  // a couple of fallen petals & a stray leaf on the lit table
  body += scatter(rng, w, h, 6, [mix(CLAY, CREAM, 0.2), STONE, VINE.fuchsia], { yMin: 0.72, yMax: 0.9, size: 15, op: 0.6 });
  body += `<rect width="${w}" height="${h}" fill="url(#pool)"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.06"/>`;
  body += metaText(w * 0.06, h * 0.055, label, { size: 14, color: CHAMPAGNE, tracking: 3 });
  if (index) body += metaText(w * 0.94, h * 0.055, index, { size: 13, color: STONE, tracking: 2, anchor: 'end' });
  return page(w, h, body, defs);
}

// --- Outlet covers -----------------------------------------------------------
function sceneOutletCover(rng, w, h, { ground = 'cream', hue = 'iris', style = 'floral' }) {
  const dark = ground === 'dark';
  const bg = dark ? INK : CREAM;
  const line = dark ? CHAMPAGNE : mix(STONE, INK, 0.1);
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.9) + blurFilter('sb', 4) + blurFilter('sbBig', 22)
    + groundShade('gs', w, h, dark ? INK : mix(CREAM_DEEP, INK, 0.25), dark ? 0.4 : 0.22);
  let body = `<rect width="${w}" height="${h}" fill="${bg}"/>`;
  if (dark) {
    defs += directionalLight('wl', w, h, w * 0.44, h * 0.34, '70%', CHAMPAGNE, 0.4);
    body += `<rect width="${w}" height="${h}" fill="url(#wl)"/>`;
  } else {
    // soft off-center paper glow (directional, not a centred vignette)
    defs += directionalLight('wl', w, h, w * 0.36, h * 0.30, '80%', CREAM, 0.5);
    body += `<rect width="${w}" height="${h}" fill="${mix(CREAM, CREAM_DEEP, 0.5)}"/>`;
    body += `<rect width="${w}" height="${h}" fill="url(#wl)"/>`;
  }
  // fine-line frame
  body += `<rect x="${w * 0.055}" y="${h * 0.04}" width="${w * 0.89}" height="${h * 0.92}" fill="none" stroke="${line}" stroke-width="1" opacity="0.3"/>`;

  if (style === 'floral') {
    // dense arrangement of layered botanicals + an open journal with a pressed bloom
    const petalCols = [CLAY, mix(SAGE, CLAY, 0.4), STONE, mix(CLAY, CREAM, 0.2)];
    // background botanical spray (softly behind the main arrangement — gentle blur)
    body += `<g filter="url(#sb)" opacity="0.5">`
      + bouquet(rng, w * 0.5, h * 0.5, { stems: 7, spread: 42, minLen: h * 0.13, maxLen: h * 0.24, stemColor: mix(STONE, CREAM, 0.2), bloomColors: petalCols, lightAngle: -120, bloomScale: 0.7, bloomEvery: 0.62 })
      + `</g>`;
    // foreground arrangement rising toward upper third
    body += bouquet(rng, w * 0.5, h * 0.47, {
      stems: 10, spread: 52, minLen: h * 0.15, maxLen: h * 0.32, stemColor: mix(STONE, INK, 0.2),
      bloomColors: petalCols, lightAngle: -120, bloomScale: 1.2,
      whisperHue: VINE[hue], whisperChance: 0.55, whisperMix: 0.82,
    });
    // a clearly colored signature bloom (not a whisper) near the arrangement's apex
    body += rosette(rng, w * 0.5, h * 0.2, h * 0.042, { baseColor: mix(VINE[hue], CREAM, 0.06), coreColor: CHAMPAGNE, rings: 4, basePetals: 14, lightAngle: -120, lightStrength: 0.4 });
    // open journal, page curvature via gradient
    const jw = w * 0.7, jh = h * 0.26, jx = (w - jw) / 2, jy = h * 0.62;
    defs += `<linearGradient id="pageL" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${CREAM_DEEP}"/><stop offset="88%" stop-color="${CREAM}"/><stop offset="100%" stop-color="${mix(CREAM_DEEP, INK, 0.12)}"/></linearGradient>`;
    defs += `<linearGradient id="pageR" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${mix(CREAM_DEEP, INK, 0.12)}"/><stop offset="12%" stop-color="${CREAM}"/><stop offset="100%" stop-color="${CREAM_DEEP}"/></linearGradient>`;
    body += `<g filter="url(#sbBig)"><ellipse cx="${jx + jw / 2}" cy="${jy + jh + 14}" rx="${jw * 0.56}" ry="${h * 0.02}" fill="${INK}" opacity="0.24"/></g>`;
    // curved page tops (spine dips in the middle)
    body += `<path d="M ${jx} ${jy + 10} Q ${jx + jw * 0.25} ${jy - 8} ${jx + jw / 2} ${jy + 6} L ${jx + jw / 2} ${jy + jh} Q ${jx + jw * 0.25} ${jy + jh + 8} ${jx} ${jy + jh - 4} Z" fill="url(#pageL)" stroke="${STONE}" stroke-width="1" opacity="0.98"/>`;
    body += `<path d="M ${jx + jw / 2} ${jy + 6} Q ${jx + jw * 0.75} ${jy - 8} ${jx + jw} ${jy + 10} L ${jx + jw} ${jy + jh - 4} Q ${jx + jw * 0.75} ${jy + jh + 8} ${jx + jw / 2} ${jy + jh} Z" fill="url(#pageR)" stroke="${STONE}" stroke-width="1" opacity="0.98"/>`;
    body += `<line x1="${jx + jw / 2}" y1="${jy + 6}" x2="${jx + jw / 2}" y2="${jy + jh}" stroke="${mix(STONE, INK, 0.2)}" stroke-width="1.5" opacity="0.4"/>`;
    // handwriting on the left page
    body += scriptLines(rng, jx + jw * 0.07, jy + jh * 0.3, jw * 0.36, 5, jh * 0.14, mix(STONE, INK, 0.15), 0.5);
    // pressed flower on the right page + a date line
    body += pressedFlower(rng, jx + jw * 0.74, jy + jh * 0.42, jw * 0.05, mix(CLAY, VINE[hue], 0.6));
    body += metaText(jx + jw * 0.6, jy + jh * 0.86, 'Marginalia — No. 4', { size: 11, color: STONE, tracking: 2 });
    body += scatter(rng, w, h, 7, [...petalCols, VINE[hue]], { yMin: 0.5, yMax: 0.62, size: 13, op: 0.5 });
  } else if (style === 'stillLife') {
    // vase with a generous bouquet emerging from its mouth, cast shadow, light pool
    defs += `<linearGradient id="vase2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${mix(STONE, INK, 0.4)}"/><stop offset="45%" stop-color="${INK_SOFT}"/><stop offset="100%" stop-color="${INK}"/></linearGradient>`;
    const vx = w * 0.5, vw = w * 0.17, vh = h * 0.2, vy = h * 0.66;
    // light pool on the ground (only meaningful on a dark ground)
    if (dark) body += `<g filter="url(#sbBig)"><ellipse cx="${vx}" cy="${vy + vh * 0.9}" rx="${w * 0.26}" ry="${h * 0.05}" fill="${CHAMPAGNE}" opacity="0.12"/></g>`;
    // cast shadow
    body += `<g filter="url(#sbBig)"><ellipse cx="${vx + w * 0.09}" cy="${vy + vh * 0.98}" rx="${w * 0.2}" ry="${h * 0.028}" fill="${INK}" opacity="0.6"/></g>`;
    // bouquet BEHIND rim (drawn first), rising from the vase mouth — a strong
    // vivid vine whisper (photography's signature hue is fuchsia)
    body += bouquet(rng, vx, vy + vh * 0.06, {
      stems: 11, spread: 55, minLen: h * 0.16, maxLen: h * 0.34, stemColor: mix(CHAMPAGNE, INK, 0.4),
      bloomColors: [mix(CLAY, CREAM, 0.2), mix(SAGE, CLAY, 0.4), STONE, CLAY], lightAngle: -115, bloomScale: 1.2,
      whisperHue: VINE[hue], whisperChance: 0.55, whisperMix: 0.82,
    });
    // a clearly colored signature bloom (not a whisper) near the top of the arrangement
    body += rosette(rng, vx, vy - vh * 1.55, h * 0.045, { baseColor: mix(VINE[hue], CREAM, 0.06), coreColor: CHAMPAGNE, rings: 4, basePetals: 14, lightAngle: -115, lightStrength: 0.4 });
    // vase over the stem bases
    body += `<path d="M ${vx - vw / 2} ${vy} Q ${vx - vw * 0.6} ${vy + vh * 0.55} ${vx - vw * 0.34} ${vy + vh} L ${vx + vw * 0.34} ${vy + vh} Q ${vx + vw * 0.6} ${vy + vh * 0.55} ${vx + vw / 2} ${vy} Z" fill="url(#vase2)"/>`;
    body += `<ellipse cx="${vx}" cy="${vy}" rx="${vw / 2}" ry="${vw * 0.11}" fill="${INK}" opacity="0.85"/>`;
    body += `<path d="M ${vx - vw / 2} ${vy} Q ${vx - vw * 0.6} ${vy + vh * 0.55} ${vx - vw * 0.34} ${vy + vh}" stroke="${mix(CHAMPAGNE, STONE, 0.4)}" stroke-width="2.5" fill="none" opacity="0.45"/>`;
    body += scatter(rng, w, h, 6, [mix(CLAY, CREAM, 0.2), STONE, VINE[hue]], { yMin: 0.82, yMax: 0.92, size: 14, op: 0.55 });
  } else if (style === 'blueprint') {
    body += sceneBlueprintBody(rng, w, h, { title: 'Field Notes', numeral: 'L', dense: true, hue: VINE[hue] });
  }
  body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.05"/>`;
  body += metaText(w * 0.09, h * 0.075, 'Hope On Studio', { size: 13, color: line, tracking: 3 });
  return page(w, h, body, defs);
}

// --- Publishing hero: stacked cloth books, one open on top, botanicals -------
function sceneBookStack(rng, w, h) {
  let defs = grainFilter('grain', 12, 0.9) + clothDef() + blurFilter('sb', 3.5) + blurFilter('sbBig', 22)
    + groundShade('gs', w, h, mix(CREAM_DEEP, INK, 0.3), 0.22)
    + directionalLight('spot', w, h, w * 0.4, h * 0.28, '75%', CREAM, 0.45);
  defs += `<linearGradient id="pageOpen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${CREAM}"/><stop offset="100%" stop-color="${CREAM_DEEP}"/></linearGradient>`;
  let body = `<rect width="${w}" height="${h}" fill="${mix(CREAM, CREAM_DEEP, 0.4)}"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#spot)"/>`;
  // a tall botanical spray rising behind the stack (readable, gently soft)
  body += `<g filter="url(#sb)" opacity="0.6">`
    + bouquet(rng, w * 0.68, h * 0.72, { stems: 8, spread: 40, minLen: h * 0.28, maxLen: h * 0.5, stemColor: mix(SAGE, STONE, 0.4), bloomColors: [SAGE, CLAY, STONE, mix(CLAY, CREAM, 0.2)], lightAngle: -120, bloomScale: 0.85, whisperHue: VINE.violet, whisperChance: 0.3, whisperMix: 0.6 })
    + `</g>`;
  body += `<g filter="url(#sb)" opacity="0.4">`
    + bouquet(rng, w * 0.26, h * 0.74, { stems: 5, spread: 34, minLen: h * 0.2, maxLen: h * 0.36, stemColor: mix(SAGE, STONE, 0.4), bloomColors: [SAGE, STONE], lightAngle: -120, bloomScale: 0.7, bloomEvery: 0.6 })
    + `</g>`;
  // ground shadow under the stack
  body += `<g filter="url(#sbBig)"><ellipse cx="${w * 0.46}" cy="${h * 0.8}" rx="${w * 0.4}" ry="${h * 0.05}" fill="${INK}" opacity="0.2"/></g>`;
  // stack of 4 horizontal cloth books, slightly offset (perspective spine slabs)
  const titles = ['Marginalia', 'Field Notes', 'Hope On', ''];
  const fills = [SAGE, CLAY, CHAMPAGNE, mix(CLAY, INK, 0.15)];
  const bw = w * 0.5, bh = h * 0.075;
  let sy = h * 0.76;
  for (let i = 0; i < 4; i++) {
    const bx = w * 0.24 + rf(rng, -1, 1) * w * 0.02 + i * w * 0.006;
    const fill = fills[i];
    const shade = mix(fill, INK, 0.25);
    body += `<g transform="translate(${bx} ${sy})">`;
    body += `<rect x="6" y="5" width="${bw}" height="${bh}" rx="4" fill="${INK}" opacity="0.18"/>`;
    body += `<rect x="0" y="0" width="${bw}" height="${bh}" rx="4" fill="${fill}"/>`;
    body += `<rect x="0" y="0" width="${bw}" height="${bh}" rx="4" fill="url(#cloth)" opacity="0.5"/>`;
    body += `<rect x="0" y="${bh * 0.34}" width="${bw}" height="${bh * 0.32}" fill="${mix(CREAM, fill, 0.3)}" opacity="0.5"/>`; // pages edge
    body += `<rect x="${bw * 0.06}" y="${bh * 0.42}" width="${bw * 0.4}" height="1.4" fill="${CHAMPAGNE}" opacity="0.7"/>`;
    body += `<rect x="0" y="0" width="${bw}" height="2" fill="${mix(fill, CREAM, 0.25)}" opacity="0.5"/>`;
    body += `<rect x="0" y="0" width="4" height="${bh}" fill="${shade}"/>`;
    body += `</g>`;
    sy -= bh * 0.94;
  }
  // open book resting on top of the stack
  const ow = w * 0.46, oh = h * 0.14, ox = w * 0.27, oy = sy - oh * 0.7;
  body += `<g filter="url(#sb)"><ellipse cx="${ox + ow / 2}" cy="${oy + oh + 6}" rx="${ow * 0.55}" ry="${h * 0.014}" fill="${INK}" opacity="0.18"/></g>`;
  body += `<path d="M ${ox} ${oy + 8} Q ${ox + ow * 0.25} ${oy - 6} ${ox + ow / 2} ${oy + 6} L ${ox + ow / 2} ${oy + oh} Q ${ox + ow * 0.25} ${oy + oh + 6} ${ox} ${oy + oh - 2} Z" fill="url(#pageOpen)" stroke="${STONE}" stroke-width="1" opacity="0.98"/>`;
  body += `<path d="M ${ox + ow / 2} ${oy + 6} Q ${ox + ow * 0.75} ${oy - 6} ${ox + ow} ${oy + 8} L ${ox + ow} ${oy + oh - 2} Q ${ox + ow * 0.75} ${oy + oh + 6} ${ox + ow / 2} ${oy + oh} Z" fill="url(#pageOpen)" stroke="${STONE}" stroke-width="1" opacity="0.98"/>`;
  body += `<line x1="${ox + ow / 2}" y1="${oy + 6}" x2="${ox + ow / 2}" y2="${oy + oh}" stroke="${mix(STONE, INK, 0.2)}" stroke-width="1.5" opacity="0.4"/>`;
  body += scriptLines(rng, ox + ow * 0.07, oy + oh * 0.32, ow * 0.34, 3, oh * 0.2, mix(STONE, INK, 0.15), 0.5);
  body += pressedFlower(rng, ox + ow * 0.74, oy + oh * 0.44, ow * 0.045, mix(CLAY, VINE.violet, 0.45));
  body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.04"/>`;
  body += metaText(w * 0.06, h * 0.08, 'Publishing', { size: 14, color: mix(STONE, INK, 0.2), tracking: 3 });
  return page(w, h, body, defs);
}

// --- Publishing page spreads -------------------------------------------------
function scenePageSpread(rng, w, h, { variant = 'floral' } = {}) {
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.85) + clothDef() + blurFilter('sb', 4) + blurFilter('sbBig', 22)
    + groundShade('gs', w, h, mix(CREAM_DEEP, INK, 0.3), 0.2)
    + directionalLight('glow', w, h, w * 0.34, h * 0.28, '82%', CREAM, 0.42);
  let body = `<rect width="${w}" height="${h}" fill="${mix(CREAM, CREAM_DEEP, 0.4)}"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#glow)"/>`;

  if (variant === 'foilcover') {
    // lifted a touch from pure INK_SOFT so the backdrop doesn't read as a black hole
    body = `<rect width="${w}" height="${h}" fill="${mix(INK_SOFT, STONE, 0.16)}"/>`;
    defs += directionalLight('spot', w, h, w * 0.42, h * 0.3, '70%', CHAMPAGNE, 0.32);
    body += `<rect width="${w}" height="${h}" fill="url(#spot)"/>`;
    body += `<g filter="url(#sb)" opacity="0.4">`
      + bouquet(rng, w * 0.5, h * 0.58, { stems: 7, spread: 46, minLen: h * 0.16, maxLen: h * 0.32, stemColor: mix(CHAMPAGNE, INK, 0.3), bloomColors: [SAGE, CLAY], lightAngle: -110, bloomScale: 0.9, whisperHue: VINE.violet, whisperChance: 0.3, whisperMix: 0.55 })
      + `</g>`;
    const bw = w * 0.6, bh = h * 0.74, bx = (w - bw) / 2, by = (h - bh) / 2;
    body += bookMockup(rng, { x: bx, y: by, w: bw, h: bh, fill: CLAY, foil: CHAMPAGNE, rot: 0, title: 'Hope On' });
    body += metaText(w * 0.5, h * 0.95, 'Linen Cloth · Foil Stamp', { size: 13, color: STONE, tracking: 3, anchor: 'middle' });
    body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
    body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.05"/>`;
    return page(w, h, body, defs);
  }

  // paper spread with a center fold
  body += `<rect x="${w / 2 - 4}" y="0" width="8" height="${h}" fill="${INK}" opacity="0.05"/>`;
  body += `<line x1="${w / 2}" y1="0" x2="${w / 2}" y2="${h}" stroke="${STONE}" stroke-width="1" opacity="0.28"/>`;
  const petalCols = [CLAY, mix(SAGE, CLAY, 0.4), STONE, mix(CLAY, CREAM, 0.2)];

  if (variant === 'floral') {
    body += `<g filter="url(#sb)" opacity="0.6">`
      + bouquet(rng, w * 0.28, h * 0.56, { stems: 6, spread: 44, minLen: h * 0.12, maxLen: h * 0.26, stemColor: mix(STONE, CREAM, 0.15), bloomColors: petalCols, lightAngle: -120, bloomScale: 0.8 })
      + `</g>`;
    body += bouquet(rng, w * 0.28, h * 0.52, { stems: 7, spread: 44, minLen: h * 0.14, maxLen: h * 0.3, stemColor: mix(STONE, INK, 0.15), bloomColors: petalCols, lightAngle: -120, bloomScale: 1.05, whisperHue: VINE.violet, whisperChance: 0.35, whisperMix: 0.65 });
    body += metaText(w * 0.6, h * 0.2, 'A Field Journal', { size: 15, color: CLAY, tracking: 3 });
    body += scriptLines(rng, w * 0.6, h * 0.28, w * 0.32, 9, h * 0.05, mix(STONE, INK, 0.15), 0.45);
    body += pressedFlower(rng, w * 0.82, h * 0.74, w * 0.045, mix(CLAY, VINE.fuchsia, 0.45));
  } else if (variant === 'dropcap') {
    body += `<text x="${w * 0.1}" y="${h * 0.6}" font-family="Fraunces" font-size="${h * 0.4}" fill="${INK}" opacity="0.92">H</text>`;
    body += scriptLines(rng, w * 0.42, h * 0.2, w * 0.46, 11, h * 0.05, mix(STONE, INK, 0.15), 0.45);
    body += scriptLines(rng, w * 0.1, h * 0.76, w * 0.76, 4, h * 0.045, mix(STONE, INK, 0.15), 0.4);
    body += bouquet(rng, w * 0.2, h * 0.86, { stems: 4, spread: 40, minLen: h * 0.08, maxLen: h * 0.16, stemColor: mix(STONE, INK, 0.1), bloomColors: petalCols, lightAngle: -110, bloomScale: 0.7 });
    body += `<text x="${w * 0.5}" y="${h * 0.94}" font-family="Cormorant Garamond" font-style="italic" font-size="${h * 0.045}" fill="${CLAY}" text-anchor="middle">hope on studio</text>`;
  } else if (variant === 'prompts') {
    body += metaText(w * 0.12, h * 0.13, 'Journal Prompt No. 4', { size: 14, color: CLAY, tracking: 3 });
    body += `<text x="${w * 0.12}" y="${h * 0.22}" font-family="Fraunces" font-style="italic" font-size="${h * 0.042}" fill="${INK}" opacity="0.85">What did you notice today?</text>`;
    body += scriptLines(rng, w * 0.12, h * 0.3, w * 0.76, 13, h * 0.042, mix(STONE, INK, 0.15), 0.42);
    body += bouquet(rng, w * 0.86, h * 0.9, { stems: 5, spread: 42, minLen: h * 0.1, maxLen: h * 0.2, stemColor: mix(STONE, INK, 0.1), bloomColors: petalCols, lightAngle: -110, bloomScale: 0.8, whisperHue: VINE.marigold, whisperChance: 0.35, whisperMix: 0.65 });
  }
  body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.045"/>`;
  return page(w, h, body, defs);
}

// --- Learning Design blueprint (dense engineering-drawing on cream) ----------
// The body is factored out so outlet-learning can embed it too.
function sceneBlueprintBody(rng, w, h, { title = 'Course Map', numeral = '01', dense = true, hue = VINE.marigold } = {}) {
  let body = '';
  const line = mix(STONE, INK, 0.12);
  const faint = mix(STONE, CREAM, 0.35);
  // faint grid graticule (drafting paper)
  for (let gx = 0; gx <= w; gx += w * 0.055) body += `<line x1="${gx}" y1="${h * 0.06}" x2="${gx}" y2="${h * 0.94}" stroke="${faint}" stroke-width="0.6" opacity="0.35"/>`;
  for (let gy = h * 0.06; gy <= h * 0.94; gy += w * 0.055) body += `<line x1="${w * 0.04}" y1="${gy}" x2="${w * 0.96}" y2="${gy}" stroke="${faint}" stroke-width="0.6" opacity="0.35"/>`;

  // node-and-path journey map with varied line weights
  const nodeCount = 7;
  const nodes = [];
  let px = w * 0.1, py = h * (dense ? 0.62 : 0.68);
  for (let i = 0; i < nodeCount; i++) {
    px = w * (0.1 + (i / (nodeCount - 1)) * 0.8);
    py = h * (0.5 + Math.sin(i * 1.1 + 0.5) * 0.16) + rf(rng, -h * 0.03, h * 0.03);
    nodes.push([px, py]);
  }
  // draw connecting path (thick spine)
  let d = `M ${nodes[0][0]} ${nodes[0][1]}`;
  for (let i = 1; i < nodes.length; i++) {
    const [x0, y0] = nodes[i - 1], [x1, y1] = nodes[i];
    const mx = (x0 + x1) / 2;
    d += ` C ${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
  }
  body += `<path d="${d}" stroke="${mix(CLAY, INK, 0.15)}" stroke-width="2.4" fill="none" opacity="0.75"/>`;
  body += `<path d="${d}" stroke="${CLAY}" stroke-width="6" fill="none" opacity="0.12"/>`; // soft under-glow
  // nodes with dashed callouts + numerals + small diagram vignettes
  nodes.forEach(([nx, ny], i) => {
    const up = i % 2 === 0;
    const cy = up ? ny - h * 0.14 : ny + h * 0.14;
    body += dashedGuide(nx, ny, nx, cy, line, 0.5);
    body += `<circle cx="${nx}" cy="${ny}" r="6" fill="${CREAM}" stroke="${mix(CLAY, INK, 0.1)}" stroke-width="2"/>`;
    body += `<circle cx="${nx}" cy="${ny}" r="2.4" fill="${i === 3 ? hue : CLAY}"/>`;
    body += metaText(nx, cy + (up ? -8 : 20), `0${i + 1}`, { size: 12, color: line, anchor: 'middle', tracking: 2 });
    // a tiny diagram vignette by each node
    const vignettes = ['ring', 'bars', 'wave', 'grid'];
    const kind = vignettes[i % vignettes.length];
    const bx = nx + (up ? 22 : 22), byy = cy + (up ? -26 : 26);
    if (kind === 'ring') {
      body += `<circle cx="${bx}" cy="${byy}" r="12" fill="none" stroke="${line}" stroke-width="1.2" opacity="0.6"/><circle cx="${bx}" cy="${byy}" r="5" fill="none" stroke="${line}" stroke-width="1" opacity="0.5"/>`;
    } else if (kind === 'bars') {
      for (let b = 0; b < 4; b++) body += `<rect x="${bx - 12 + b * 7}" y="${byy - 4 - b * 3}" width="4" height="${8 + b * 3}" fill="${CLAY}" opacity="${0.4 + b * 0.12}"/>`;
    } else if (kind === 'wave') {
      body += `<path d="M ${bx - 14} ${byy} q 7 -10 14 0 t 14 0" stroke="${line}" stroke-width="1.3" fill="none" opacity="0.6"/>`;
    } else {
      for (let gg = 0; gg < 3; gg++) { body += `<line x1="${bx - 12}" y1="${byy - 8 + gg * 8}" x2="${bx + 12}" y2="${byy - 8 + gg * 8}" stroke="${line}" stroke-width="0.8" opacity="0.5"/>`; body += `<line x1="${bx - 12 + gg * 12}" y1="${byy - 8}" x2="${bx - 12 + gg * 12}" y2="${byy + 8}" stroke="${line}" stroke-width="0.8" opacity="0.5"/>`; }
    }
  });
  // annotation clusters (measurement ticks + dimension lines) filling the field
  const clusters = dense ? 5 : 3;
  for (let c = 0; c < clusters; c++) {
    const cx = rf(rng, w * 0.1, w * 0.88), cyy = rf(rng, h * 0.14, h * 0.86);
    const cn = ri(rng, 4, 8);
    for (let i = 0; i < cn; i++) body += tickAnnotation(rng, cx + rf(rng, -40, 40), cyy + rf(rng, -30, 30), rf(rng, 8, 16), line, mix(CLAY, hue, 0.6));
    // a dimension line
    const dl = rf(rng, w * 0.06, w * 0.14);
    body += `<line x1="${cx}" y1="${cyy + 34}" x2="${cx + dl}" y2="${cyy + 34}" stroke="${line}" stroke-width="1" opacity="0.6"/>`;
    body += `<line x1="${cx}" y1="${cyy + 30}" x2="${cx}" y2="${cyy + 38}" stroke="${line}" stroke-width="1" opacity="0.6"/>`;
    body += `<line x1="${cx + dl}" y1="${cyy + 30}" x2="${cx + dl}" y2="${cyy + 38}" stroke="${line}" stroke-width="1" opacity="0.6"/>`;
  }
  // measurement ruler down the left margin
  body += `<line x1="${w * 0.065}" y1="${h * 0.14}" x2="${w * 0.065}" y2="${h * 0.86}" stroke="${line}" stroke-width="1" opacity="0.5"/>`;
  for (let t = 0; t <= 24; t++) {
    const ty = h * 0.14 + (h * 0.72) * (t / 24);
    const long = t % 4 === 0;
    body += `<line x1="${w * 0.065}" y1="${ty}" x2="${w * 0.065 + (long ? 14 : 7)}" y2="${ty}" stroke="${line}" stroke-width="${long ? 1.2 : 0.8}" opacity="0.55"/>`;
  }
  // big serif numeral + titles
  body += `<text x="${w * 0.1}" y="${h * 0.26}" font-family="Fraunces" font-size="${h * (dense ? 0.2 : 0.22)}" fill="${INK}" opacity="0.9">${numeral}</text>`;
  body += metaText(w * 0.1, h * 0.32, title, { size: 15, color: CLAY, tracking: 3 });
  // one clearly-colored vine accent ring on a single node marker
  body += `<circle cx="${nodes[3][0]}" cy="${nodes[3][1]}" r="9" fill="none" stroke="${hue}" stroke-width="2" opacity="0.75"/>`;
  return body;
}

function sceneBlueprint(rng, w, h, { title = 'Course Map', numeral = '01' } = {}) {
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.8)
    + groundShade('gs', w, h, mix(CREAM_DEEP, INK, 0.3), 0.16)
    + directionalLight('glow', w, h, w * 0.4, h * 0.32, '85%', CREAM, 0.4);
  let body = `<rect width="${w}" height="${h}" fill="${mix(CREAM, CREAM_DEEP, 0.45)}"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#glow)"/>`;
  body += sceneBlueprintBody(rng, w, h, { title, numeral, dense: true });
  body += metaText(w * 0.1, h * 0.93, 'Learning Design — Curriculum', { size: 12, color: mix(STONE, INK, 0.15), tracking: 2 });
  body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.04"/>`;
  return page(w, h, body, defs);
}

// --- Learning storyboard -----------------------------------------------------
function sceneStoryboard(rng, w, h) {
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.85) + blurFilter('sb', 6)
    + groundShade('gs', w, h, mix(CREAM_DEEP, INK, 0.3), 0.16)
    + directionalLight('glow', w, h, w * 0.4, h * 0.3, '85%', CREAM, 0.4);
  let body = `<rect width="${w}" height="${h}" fill="${mix(CREAM, CREAM_DEEP, 0.45)}"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#glow)"/>`;
  const line = mix(STONE, INK, 0.12);
  const cols = 3, gap = w * 0.03, pad = w * 0.06;
  const cw = (w - pad * 2 - gap * (cols - 1)) / cols;
  const ch = h * 0.6;
  for (let i = 0; i < cols; i++) {
    const x = pad + i * (cw + gap), y = h * 0.18;
    body += `<rect x="${x + 5}" y="${y + 6}" width="${cw}" height="${ch}" rx="6" fill="${INK}" opacity="0.08"/>`;
    body += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="6" fill="${CREAM}" stroke="${line}" stroke-width="1"/>`;
    const hz = y + ch * 0.62;
    body += `<line x1="${x + 12}" y1="${hz}" x2="${x + cw - 12}" y2="${hz}" stroke="${line}" stroke-width="1" opacity="0.5"/>`;
    const cx = x + cw * 0.5, cy = y + ch * 0.34;
    if (i === 0) {
      body += `<circle cx="${cx}" cy="${cy}" r="${cw * 0.17}" fill="none" stroke="${CLAY}" stroke-width="1.6" opacity="0.75"/>`;
      body += `<circle cx="${cx}" cy="${cy}" r="${cw * 0.1}" fill="none" stroke="${CLAY}" stroke-width="1.1" opacity="0.55"/>`;
      body += `<circle cx="${cx}" cy="${cy}" r="${cw * 0.028}" fill="${CLAY}"/>`;
      for (let s = 0; s < 6; s++) { const a = s * 60 * Math.PI / 180; body += `<line x1="${cx + Math.cos(a) * cw * 0.17}" y1="${cy + Math.sin(a) * cw * 0.17}" x2="${cx + Math.cos(a) * cw * 0.1}" y2="${cy + Math.sin(a) * cw * 0.1}" stroke="${CLAY}" stroke-width="1" opacity="0.6"/>`; }
    } else if (i === 1) {
      body += rosette(rng, cx, cy + cw * 0.08, cw * 0.16, { baseColor: mix(SAGE, CLAY, 0.4), coreColor: CHAMPAGNE, rings: 4, basePetals: 13, lightStrength: 0.35, opacity: 0.9 });
      body += branch(rng, cx, hz, cw * 0.22, -90, { color: mix(SAGE, INK, 0.2), width: 1.6, leaves: 3, opacity: 0.6 }).g;
    } else {
      const bars = 4;
      for (let b = 0; b < bars; b++) { const bh2 = ch * rf(rng, 0.14, 0.28); body += `<rect x="${cx - cw * 0.2 + b * (cw * 0.13)}" y="${cy + ch * 0.16 - bh2}" width="${cw * 0.08}" height="${bh2}" fill="${CLAY}" opacity="${0.42 + b * 0.12}"/>`; }
      body += `<line x1="${cx - cw * 0.22}" y1="${cy + ch * 0.16}" x2="${cx + cw * 0.28}" y2="${cy + ch * 0.16}" stroke="${line}" stroke-width="1" opacity="0.6"/>`;
    }
    for (let t = 0; t < 5; t++) body += tickAnnotation(rng, rf(rng, x + 14, x + cw - 14), rf(rng, y + 14, hz - 14), 9, line);
    body += scriptLines(rng, x + 12, hz + ch * 0.1, cw - 24, 3, ch * 0.09, line, 0.4);
    body += metaText(x + cw / 2, y + ch + 26, `Scene ${i + 1}`, { size: 12, color: line, anchor: 'middle', tracking: 2 });
  }
  body += metaText(w * 0.06, h * 0.1, 'Lesson Storyboard', { size: 14, color: CLAY, tracking: 3 });
  body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.04"/>`;
  return page(w, h, body, defs);
}

// --- Generic moody still (used by photo develop/frame variants) --------------
function sceneMoodyStill(rng, w, h, { subject = 'stillLife', lightX = 0.4, lightY = 0.28 } = {}) {
  if (subject === 'stillLife' || subject === 'portrait') {
    // route portraits/still-lifes through the strong window still-life
    return sceneWindowStill(rng, w, h, { label: 'Photography' });
  }
  const floor = mix(INK, STONE, 0.14); // lifted from pure INK so the floor isn't a black hole
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.75) + blurFilter('sbBig', 22) + blurFilter('sb', 9)
    + groundShade('gs', w, h, floor, 0.32)
    + directionalLight('wl', w, h, w * lightX, h * lightY, '75%', CHAMPAGNE, 0.5);
  let body = `<rect width="${w}" height="${h}" fill="${floor}"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#wl)"/>`;
  if (subject === 'handsBook') {
    defs += `<linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${CREAM}"/><stop offset="100%" stop-color="${CREAM_DEEP}"/></linearGradient>`;
    const bw = w * 0.5, bh = h * 0.24, bx = (w - bw) / 2, by = h * 0.48;
    body += `<g filter="url(#sbBig)"><ellipse cx="${w * 0.5}" cy="${by + bh + h * 0.02}" rx="${bw * 0.62}" ry="${h * 0.03}" fill="#000" opacity="0.4"/></g>`;
    body += `<path d="M ${bx} ${by + 6} Q ${w * 0.5} ${by - 12} ${bx + bw} ${by + 6} L ${bx + bw} ${by + bh} Q ${w * 0.5} ${by + bh + 16} ${bx} ${by + bh} Z" fill="url(#pg)" stroke="${STONE}" stroke-width="1" opacity="0.96"/>`;
    body += `<line x1="${w / 2}" y1="${by - 6}" x2="${w / 2}" y2="${by + bh + 8}" stroke="${STONE}" stroke-width="1" opacity="0.4"/>`;
    body += scriptLines(rng, bx + bw * 0.08, by + bh * 0.28, bw * 0.34, 4, bh * 0.16, mix(STONE, INK, 0.15), 0.5);
    body += pressedFlower(rng, bx + bw * 0.74, by + bh * 0.4, bw * 0.04, mix(CLAY, VINE.violet, 0.45));
    body += `<g filter="url(#sb)" opacity="0.92"><path d="M ${w * 0.06} ${h} Q ${w * 0.14} ${h * 0.78} ${w * 0.3} ${by + bh * 0.7} Q ${w * 0.34} ${by + bh + 20} ${w * 0.24} ${h * 0.92} Q ${w * 0.14} ${h} ${w * 0.06} ${h} Z" fill="${INK_SOFT}"/>`;
    body += `<path d="M ${w * 0.94} ${h} Q ${w * 0.86} ${h * 0.78} ${w * 0.7} ${by + bh * 0.7} Q ${w * 0.66} ${by + bh + 20} ${w * 0.76} ${h * 0.92} Q ${w * 0.86} ${h} ${w * 0.94} ${h} Z" fill="${INK_SOFT}"/></g>`;
  } else if (subject === 'interior') {
    body += `<rect x="${w * 0.56}" y="${h * 0.12}" width="${w * 0.34}" height="${h * 0.42}" fill="${CHAMPAGNE}" opacity="0.2"/>`;
    body += `<rect x="${w * 0.56}" y="${h * 0.12}" width="${w * 0.34}" height="${h * 0.42}" fill="none" stroke="${mix(INK_SOFT, STONE, 0.3)}" stroke-width="6" opacity="0.6"/>`;
    body += `<line x1="${w * 0.73}" y1="${h * 0.12}" x2="${w * 0.73}" y2="${h * 0.54}" stroke="${mix(INK_SOFT, STONE, 0.3)}" stroke-width="6" opacity="0.6"/>`;
    body += `<line x1="${w * 0.56}" y1="${h * 0.33}" x2="${w * 0.9}" y2="${h * 0.33}" stroke="${mix(INK_SOFT, STONE, 0.3)}" stroke-width="6" opacity="0.6"/>`;
    // a chair silhouette + a plant catching light
    body += `<g filter="url(#sb)"><rect x="${w * 0.34}" y="${h * 0.6}" width="${w * 0.12}" height="${h * 0.03}" rx="6" fill="${INK_SOFT}"/><rect x="${w * 0.34}" y="${h * 0.48}" width="${w * 0.03}" height="${h * 0.15}" rx="4" fill="${INK_SOFT}"/><rect x="${w * 0.35}" y="${h * 0.62}" width="${w * 0.012}" height="${h * 0.14}" fill="${INK_SOFT}"/><rect x="${w * 0.44}" y="${h * 0.62}" width="${w * 0.012}" height="${h * 0.14}" fill="${INK_SOFT}"/></g>`;
    body += bouquet(rng, w * 0.78, h * 0.72, { stems: 5, spread: 40, minLen: h * 0.12, maxLen: h * 0.22, stemColor: mix(CHAMPAGNE, INK, 0.4), bloomColors: [SAGE, CLAY], lightAngle: -120, bloomScale: 0.85, whisperHue: VINE.fuchsia, whisperChance: 0.4, whisperMix: 0.7 });
  }
  body += scatter(rng, w, h, 4, [mix(CLAY, CREAM, 0.2), STONE], { yMin: 0.2, yMax: 0.6, size: 12, op: 0.4, blurId: 'sb' });
  body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.06"/>`;
  body += metaText(w * 0.06, h * 0.055, 'Photography', { size: 12, color: STONE, tracking: 3 });
  return page(w, h, body, defs);
}

// --- Contact sheet (film strip of mini tonal compositions) -------------------
function sceneContactSheet(rng, w, h) {
  const floor = mix(INK, STONE, 0.09); // filmstrip stays dark (it's an object, not a page ground) but not pure black
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.8) + blurFilter('sb', 5) + groundShade('gs', w, h, floor, 0.22);
  let body = `<rect width="${w}" height="${h}" fill="${floor}"/>`;
  const holeGap = w / 26;
  for (let i = 0; i < 26; i++) {
    body += `<rect x="${i * holeGap + holeGap * 0.3}" y="${h * 0.03}" width="${holeGap * 0.4}" height="${h * 0.025}" rx="2" fill="${CREAM}" opacity="0.5"/>`;
    body += `<rect x="${i * holeGap + holeGap * 0.3}" y="${h * 0.95}" width="${holeGap * 0.4}" height="${h * 0.025}" rx="2" fill="${CREAM}" opacity="0.5"/>`;
  }
  const cols = 5, rows = 2, pad = w * 0.03, gap = w * 0.012;
  const cw = (w - pad * 2 - gap * (cols - 1)) / cols;
  const ch = (h * 0.78 - gap * (rows - 1)) / rows;
  // each frame gets a distinct mini tonal composition (a lit subject vs shadow)
  const kinds = ['still', 'portrait', 'window', 'branch', 'petalfall', 'horizon', 'ring', 'still', 'window', 'branch'];
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = pad + c * (cw + gap), y = h * 0.11 + r * (ch + gap);
      const kind = kinds[n % kinds.length];
      const dark = mix(INK, pick(rng, [SAGE, CLAY, STONE, CHAMPAGNE, VINE.teal]), rf(rng, 0.12, 0.3));
      const light = mix(dark, CREAM, 0.7);
      const gid = `cell${n}`;
      defs += `<linearGradient id="${gid}" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0%" stop-color="${light}"/><stop offset="100%" stop-color="${dark}"/></linearGradient>`;
      body += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="url(#${gid})"/>`;
      body += `<clipPath id="clip${n}"><rect x="${x}" y="${y}" width="${cw}" height="${ch}"/></clipPath>`;
      let cell = `<g clip-path="url(#clip${n})">`;
      const mcx = x + cw * 0.5, mcy = y + ch * 0.5;
      if (kind === 'still' || kind === 'window') {
        cell += `<rect x="${x + cw * 0.12}" y="${y + ch * 0.1}" width="${cw * 0.4}" height="${ch * 0.5}" fill="${mix(light, CREAM, 0.4)}" opacity="0.7"/>`;
        cell += `<rect x="${x + cw * 0.55}" y="${y + ch * 0.55}" width="${cw * 0.3}" height="${ch * 0.35}" fill="${mix(dark, INK, 0.4)}"/>`;
        cell += bouquet(rng, x + cw * 0.68, y + ch * 0.6, { stems: 4, spread: 40, minLen: ch * 0.22, maxLen: ch * 0.4, stemColor: mix(dark, INK, 0.3), bloomColors: [mix(dark, INK, 0.3)], lightAngle: -120, bloomScale: 0.5, bloomEvery: 0.6 });
      } else if (kind === 'portrait') {
        cell += `<ellipse cx="${mcx}" cy="${y + ch * 0.38}" rx="${cw * 0.16}" ry="${ch * 0.14}" fill="${mix(dark, INK, 0.3)}"/>`;
        cell += `<path d="M ${x + cw * 0.28} ${y + ch} Q ${mcx} ${y + ch * 0.5} ${x + cw * 0.72} ${y + ch} Z" fill="${mix(dark, INK, 0.3)}"/>`;
        cell += `<ellipse cx="${x + cw * 0.7}" cy="${y + ch * 0.28}" rx="${cw * 0.14}" ry="${cw * 0.14}" fill="${mix(light, CREAM, 0.5)}" opacity="0.5" filter="url(#sb)"/>`;
      } else if (kind === 'branch') {
        cell += bouquet(rng, mcx, y + ch * 0.95, { stems: 5, spread: 46, minLen: ch * 0.4, maxLen: ch * 0.7, stemColor: mix(dark, INK, 0.3), bloomColors: [mix(dark, INK, 0.2)], lightAngle: -110, bloomScale: 0.4, bloomEvery: 0.5 });
      } else if (kind === 'petalfall') {
        cell += scatter(rng, cw, ch, 14, [mix(dark, INK, 0.3), mix(light, CREAM, 0.3)], { yMin: 0.05, yMax: 0.95, size: cw * 0.05, op: 0.6 }).replace(/translate\(([\d.]+) ([\d.]+)\)/g, (m, a, b) => `translate(${x + parseFloat(a)} ${y + parseFloat(b)})`);
      } else if (kind === 'horizon') {
        cell += `<rect x="${x}" y="${y + ch * 0.6}" width="${cw}" height="${ch * 0.4}" fill="${mix(dark, INK, 0.4)}"/>`;
        cell += `<ellipse cx="${x + cw * 0.7}" cy="${y + ch * 0.35}" rx="${cw * 0.1}" ry="${cw * 0.1}" fill="${mix(light, CREAM, 0.5)}" opacity="0.7"/>`;
      } else if (kind === 'ring') {
        cell += `<circle cx="${mcx}" cy="${mcy}" r="${cw * 0.22}" fill="none" stroke="${mix(dark, INK, 0.3)}" stroke-width="3"/><circle cx="${mcx}" cy="${mcy}" r="${cw * 0.1}" fill="none" stroke="${mix(dark, INK, 0.3)}" stroke-width="2"/>`;
      }
      cell += `</g>`;
      body += cell;
      body += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="none" stroke="${INK}" stroke-width="1" opacity="0.4"/>`;
      body += metaText(x + 6, y + ch - 8, `${String(++n).padStart(2, '0')}`, { size: 10, color: CREAM, tracking: 1 });
    }
  }
  body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.05"/>`;
  body += metaText(w * 0.06, h * 0.085, 'Contact Sheet — Roll 04', { size: 13, color: CHAMPAGNE, tracking: 3 });
  return page(w, h, body, defs);
}

// --- Shadow-on-paper study ---------------------------------------------------
function sceneShadowOnPaper(rng, w, h) {
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.9) + blurFilter('shadowBlur', 9)
    + groundShade('gs', w, h, mix(CREAM_DEEP, INK, 0.3), 0.2)
    + directionalLight('glow', w, h, w * 0.32, h * 0.28, '85%', CREAM, 0.45);
  let body = `<rect width="${w}" height="${h}" fill="${mix(CREAM, CREAM_DEEP, 0.45)}"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#glow)"/>`;
  // a strong window light source (light mass) upper-left
  body += `<rect x="${w * 0.06}" y="${h * 0.05}" width="${w * 0.34}" height="${h * 0.28}" fill="${mix(CREAM, CHAMPAGNE, 0.15)}" opacity="0.6"/>`;
  // long, raking botanical shadow cast toward lower-right (offset & skewed)
  body += `<g filter="url(#shadowBlur)" opacity="0.42" transform="translate(${w * 0.14} ${h * 0.06}) skewX(-18)">`
    + bouquet(rng, w * 0.42, h * 0.7, { stems: 7, spread: 46, minLen: h * 0.22, maxLen: h * 0.42, stemColor: INK, bloomColors: [INK], lightAngle: -90, bloomScale: 1.1, bloomEvery: 0.8 })
    + `</g>`;
  // a fainter second cast for depth
  body += `<g filter="url(#shadowBlur)" opacity="0.2" transform="translate(${w * 0.2} ${h * 0.1}) skewX(-24)">`
    + bouquet(rng, w * 0.42, h * 0.7, { stems: 5, spread: 40, minLen: h * 0.18, maxLen: h * 0.34, stemColor: INK, bloomColors: [INK], lightAngle: -90, bloomScale: 0.9, bloomEvery: 0.8 })
    + `</g>`;
  body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.05"/>`;
  body += metaText(w * 0.08, h * 0.94, 'Shadow Study — Botanical', { size: 12, color: mix(STONE, INK, 0.15), tracking: 2 });
  return page(w, h, body, defs);
}

// --- Dusk landscape ----------------------------------------------------------
function sceneDuskLandscape(rng, w, h) {
  const warmGlow = mix(CHAMPAGNE, VINE.marigold, 0.45); // richer, more vivid sun color
  let defs = grainFilter('grain', ri(rng, 1, 999), 0.75) + fieldBlurDefs(3) + blurFilter('sb', 8)
    + groundShade('gs', w, h, mix(INK, STONE, 0.1), 0.28)
    + directionalLight('sun', w, h, w * 0.7, h * 0.62, '58%', warmGlow, 0.42);
  defs += `<linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${mix(INK, STONE, 0.18)}"/>
    <stop offset="48%" stop-color="${mix(INK_SOFT, STONE, 0.12)}"/>
    <stop offset="74%" stop-color="${mix(CLAY, INK, 0.32)}"/>
    <stop offset="100%" stop-color="${mix(CHAMPAGNE, CLAY, 0.45)}"/>
  </linearGradient>`;
  let body = `<rect width="${w}" height="${h}" fill="url(#dusk)"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#sun)"/>`;
  body += `<ellipse cx="${w * 0.7}" cy="${h * 0.6}" rx="${w * 0.04}" ry="${w * 0.04}" fill="${mix(warmGlow, CREAM, 0.4)}" opacity="0.65" filter="url(#sb)"/>`;
  // layered ridgelines
  for (let r = 0; r < 3; r++) {
    let ridge = `M 0 ${h * (0.62 + r * 0.06)}`;
    for (let x = 0; x <= w; x += w / 18) ridge += ` L ${x} ${h * (0.62 + r * 0.06 + Math.sin(x / 80 + r) * 0.02)}`;
    ridge += ` L ${w} ${h} L 0 ${h} Z`;
    body += `<path d="${ridge}" fill="${mix(INK, INK_SOFT, r * 0.3)}" opacity="${0.7 + r * 0.1}"/>`;
  }
  // botanical silhouettes along the near ridge, with a rare vivid teal/violet whisper
  body += botanicalField(rng, w, h, {
    baseY: h * 0.82, bands: 2, perBand: 9, stemColor: INK, bloomColors: [INK, mix(INK, CLAY, 0.3)],
    whisperHue: [VINE.teal, VINE.violet], whisperChance: 0.2, whisperMix: 0.45,
  });
  body += scatter(rng, w, h, 8, [mix(INK, CHAMPAGNE, 0.3)], { yMin: 0.3, yMax: 0.6, size: 10, op: 0.3, blurId: 'sb' });
  body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.05"/>`;
  body += metaText(w * 0.06, h * 0.09, 'Dusk — Field Study', { size: 13, color: CHAMPAGNE, tracking: 3 });
  return page(w, h, body, defs);
}

// ---------------------------------------------------------------------------
// Scene table — maps every referenced asset to a builder call.
// ---------------------------------------------------------------------------
const SCENES = {
  'hero-bloom-field': { w: 1600, h: 1100, build: (rng) => sceneHeroBloomField(rng, 1600, 1100) },

  // v2: all three outlet covers brighten to light-sage/cream grounds; each keeps
  // its signature accent but switches to a vivid vine hue (DESIGN.md top banner).
  'outlet-publishing': { w: 1600, h: 2000, build: (rng) => sceneOutletCover(rng, 1600, 2000, { ground: 'cream', hue: 'violet', style: 'floral' }) },
  'outlet-photography': { w: 1600, h: 2000, build: (rng) => sceneOutletCover(rng, 1600, 2000, { ground: 'cream', hue: 'fuchsia', style: 'stillLife' }) },
  'outlet-learning': { w: 1600, h: 2000, build: (rng) => sceneOutletCover(rng, 1600, 2000, { ground: 'cream', hue: 'marigold', style: 'blueprint' }) },

  'gallery-01': { w: 1600, h: 1100, build: (rng) => scenePageSpread(rng, 1600, 1100, { variant: 'floral' }) },
  'gallery-02': { w: 1600, h: 2000, build: (rng) => sceneWindowStill(rng, 1600, 2000, { label: 'Photography', index: 'Still · 02' }) },
  'gallery-03': { w: 1600, h: 1100, build: (rng) => sceneStoryboard(rng, 1600, 1100) },
  'gallery-04': { w: 1600, h: 2000, build: (rng) => scenePageSpread(rng, 1600, 2000, { variant: 'foilcover' }) },
  'gallery-05': { w: 1600, h: 1100, build: (rng) => sceneContactSheet(rng, 1600, 1100) },

  'learning-hero': { w: 1600, h: 1100, build: (rng) => sceneBlueprint(rng, 1600, 1100, { title: 'Fine-Line Blueprint', numeral: 'A' }) },
  'ld-artifact-01': { w: 1600, h: 1100, build: (rng) => sceneBlueprint(rng, 1600, 1100, { title: 'Course Journey Map', numeral: '02' }) },
  'ld-artifact-02': { w: 1600, h: 1100, build: (rng) => sceneStoryboard(rng, 1600, 1100) },
  'ld-artifact-03': { w: 1600, h: 1100, build: (rng) => scenePageSpread(rng, 1600, 1100, { variant: 'prompts' }) },

  'photography-hero': { w: 1600, h: 2000, build: (rng) => sceneWindowStill(rng, 1600, 2000, { label: 'Photography', index: '03 / 04' }) },
  'photo-develop-01': { w: 1600, h: 2000, build: (rng) => sceneWindowStill(rng, 1600, 2000, { label: 'Develop · No. 1' }) },
  'photo-develop-02': { w: 1600, h: 2000, build: (rng) => sceneMoodyStill(rng, 1600, 2000, { subject: 'interior', lightX: 0.62, lightY: 0.3 }) },
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

// v2 rework (DESIGN.md top banner + item 3): the social share card moves to the
// same light-sage world as the rest of the site — near-white ground, an ink
// wordmark, and a vivid vine flourish tucked into a corner (a "magic moment"
// accent, not a full-bleed effect).
function buildOgCard() {
  const w = 1200, h = 630;
  const rng = makeRng('og-card');
  let defs = grainFilter('grain', 5, 0.85) + blurFilter('sb', 7)
    + directionalLight('glow', w, h, w * 0.5, h * 0.3, '75%', CREAM, 0.55)
    + groundShade('gs', w, h, SAGE_TINT_DEEP, 0.16);
  defs += `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${CREAM}"/>
    <stop offset="100%" stop-color="${mix(CREAM, SAGE_TINT, 0.55)}"/>
  </linearGradient>`;
  let body = `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
  body += `<rect width="${w}" height="${h}" fill="url(#glow)"/>`;
  // a vivid vine flourish tucked into the lower-right corner
  body += branch(rng, w * 0.98, h * 1.04, w * 0.22, -142, { color: mix(SAGE, INK, 0.2), width: 3, leaves: 6, leafColor: VINE.leaf, opacity: 0.9, bow: 1.2 }).g;
  body += rosette(rng, w * 0.865, h * 0.85, 46, { baseColor: VINE.fuchsia, coreColor: CREAM, rings: 3, basePetals: 12, lightAngle: -120 });
  body += rosette(rng, w * 0.945, h * 0.7, 30, { baseColor: VINE.marigold, coreColor: CREAM, rings: 3, basePetals: 10 });
  body += bud(rng, w * 0.79, h * 0.665, 20, VINE.violet);
  body += scatter(rng, w, h, 5, [VINE.teal, VINE.leaf], { yMin: 0.55, yMax: 0.94, size: 9, op: 0.5 });
  body += metaText(w * 0.5, h * 0.32, 'Publishing · Photography · Learning Design', { size: 14, color: mix(STONE, INK, 0.2), tracking: 3, anchor: 'middle' });
  body += `<text x="${w / 2}" y="${h * 0.54}" font-family="Fraunces" font-size="86" fill="${INK}" text-anchor="middle" letter-spacing="4" opacity="0.94">HOPE ON STUDIO</text>`;
  body += `<line x1="${w * 0.38}" y1="${h * 0.6}" x2="${w * 0.62}" y2="${h * 0.6}" stroke="${mix(CLAY, INK, 0.1)}" stroke-width="1" opacity="0.55"/>`;
  body += `<text x="${w / 2}" y="${h * 0.66}" font-family="Cormorant Garamond" font-style="italic" font-size="24" fill="${mix(CLAY, INK, 0.15)}" text-anchor="middle" opacity="0.85">a gift, made with hope</text>`;
  body += `<rect width="${w}" height="${h}" fill="url(#gs)"/>`;
  body += `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.045"/>`;
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
