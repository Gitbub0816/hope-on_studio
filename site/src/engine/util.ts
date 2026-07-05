/* ============================================================
   Hope On Studio — engine shared utilities
   Canvas particle/bloom helpers: DPR, sampling, easing, color.
   No dependencies beyond the DOM. Keep pure + allocation-light.
   ============================================================ */

export const DPR_CAP = 2;

export function dpr(): number {
  return Math.min(DPR_CAP, Math.max(1, window.devicePixelRatio || 1));
}

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function clamp(v: number, lo = 0, hi = 1): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smoothstep 0..1 (3t² − 2t³). */
export function smooth(t: number): number {
  t = clamp(t);
  return t * t * (3 - 2 * t);
}

/** Deterministic RNG (mulberry32) so fields rebuild identically. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A full-bleed <canvas> positioned inside a host, DPR-scaled. */
export interface Surface {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** CSS px */
  w: number;
  h: number;
  ratio: number;
  /** Re-read host size + rescale backing store. Returns true if size changed. */
  resize(): boolean;
  destroy(): void;
}

export function makeSurface(host: HTMLElement, opts: { className: string }): Surface {
  const canvas = document.createElement('canvas');
  canvas.className = opts.className;
  const s = canvas.style;
  s.position = 'absolute';
  s.inset = '0';
  s.width = '100%';
  s.height = '100%';
  s.display = 'block';
  s.pointerEvents = 'none';
  // Host must contain the absolute canvas.
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) throw new Error('engine: 2D canvas unavailable');

  const surface: Surface = {
    canvas,
    ctx,
    w: 0,
    h: 0,
    ratio: dpr(),
    resize() {
      const r = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      const ratio = dpr();
      if (w === this.w && h === this.h && ratio === this.ratio) return false;
      this.w = w;
      this.h = h;
      this.ratio = ratio;
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      return true;
    },
    destroy() {
      canvas.remove();
    },
  };
  surface.resize();
  return surface;
}

/** Load an image (data URL or path). Resolves decoded + ready to sample. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`engine: failed to load ${src}`));
    img.src = src;
  });
}

/** object-fit: cover mapping — source crop rect for drawing into dst w×h. */
export function coverCrop(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const srcA = srcW / srcH;
  const dstA = dstW / dstH;
  if (srcA > dstA) {
    // source wider — crop sides
    const sh = srcH;
    const sw = sh * dstA;
    return { sx: (srcW - sw) / 2, sy: 0, sw, sh };
  }
  const sw = srcW;
  const sh = sw / dstA;
  return { sx: 0, sy: (srcH - sh) / 2, sw, sh };
}

/** Per-cell luminance grid (0..1), sampled cover-fit into cols×rows. */
export function sampleLuminance(
  img: HTMLImageElement,
  cols: number,
  rows: number,
): Float32Array {
  const off = document.createElement('canvas');
  off.width = cols;
  off.height = rows;
  const octx = off.getContext('2d', { willReadFrequently: true });
  if (!octx) throw new Error('engine: sampling context unavailable');
  const { sx, sy, sw, sh } = coverCrop(img.naturalWidth, img.naturalHeight, cols, rows);
  octx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
  const data = octx.getImageData(0, 0, cols, rows).data;
  const out = new Float32Array(cols * rows);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    // Rec.709 luma, gamma-ish left linear for a punchier field.
    out[i] = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
  }
  return out;
}

/* ---- color -------------------------------------------------- */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const h = hex.trim().replace('#', '');
  const n =
    h.length === 3
      ? parseInt(
          h
            .split('')
            .map((c) => c + c)
            .join(''),
          16,
        )
      : parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbMix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

export function rgba({ r, g, b }: RGB, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

/** Read a CSS custom property off :root, with hard fallback. */
export function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** WCAG relative luminance (0..1) of an sRGB color. */
function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Parse an rgb()/rgba() computed-style string; null if transparent/unparseable. */
function parseComputedRgb(color: string): RGB | null {
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
  const [r, g, b, a = 1] = parts;
  if ([r, g, b].some((n) => Number.isNaN(n)) || a === 0) return null;
  return { r, g, b };
}

/**
 * Nearest [data-ground] polarity for a host, resolved by ACTUAL luminance of
 * the effective background — not by the data-ground attribute's name. Under
 * "Light Sage World" both `ink` and `cream` grounds are light, so a naive
 * name-based check would wrongly call the `ink` ground "dark". We sample the
 * nearest [data-ground] ancestor's computed background-color (falling back
 * to <body>, since sections themselves are usually transparent and the
 * cross-faded color lives on body), and classify it by relative luminance.
 * Return value keeps its historical meaning for callers: 'ink' = dark
 * background (light glyphs read best), 'cream' = light background (dark
 * glyphs read best).
 */
export function groundOf(host: HTMLElement): 'ink' | 'cream' {
  const section = host.closest<HTMLElement>('[data-ground]');
  const candidates = [section, document.body].filter(Boolean) as HTMLElement[];

  for (const el of candidates) {
    const rgb = parseComputedRgb(getComputedStyle(el).backgroundColor);
    if (rgb) return relativeLuminance(rgb.r, rgb.g, rgb.b) < 0.5 ? 'ink' : 'cream';
  }

  // No paintable background found anywhere — both grounds are light now,
  // so default to the light-background behavior (dark glyphs).
  return 'cream';
}
