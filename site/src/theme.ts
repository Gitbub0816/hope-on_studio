/**
 * Theme runtime — WAVE T contract (context/BUILD-CONTRACTS.md § WAVE T).
 * Fetches the sitewide Theme document (worker: GET /api/settings/theme) and
 * applies it as CSS custom properties on :root (or a passed root) so the site
 * and the admin editor share one source of truth for colors/fonts/type-scale.
 */
import type { Theme } from '@shared/types';
import defaultThemeJson from '@shared/theme-default.json';
import { ensureFont } from './fonts';

export const DEFAULT_THEME: Theme = defaultThemeJson as Theme;

const THEME_ENDPOINT = '/api/settings/theme';
const FETCH_TIMEOUT_MS = 2500;

/**
 * Fetch the stored theme document. Falls back to DEFAULT_THEME on any
 * network failure, timeout, or non-OK response — the site must always be
 * able to boot even if the worker/API is unreachable.
 */
export async function fetchTheme(): Promise<Theme> {
  try {
    const res = await fetch(THEME_ENDPOINT, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.ok) return (await res.json()) as Theme;
  } catch {
    /* offline / worker unavailable — DEFAULT_THEME is the source */
  }
  return DEFAULT_THEME;
}

/* ------------------------------- merge ------------------------------- */

/**
 * Deep-merge `patch` over `base`, keeping `base`'s value for any key that's
 * missing, wrong-typed, or otherwise malformed in `patch`. This is what makes
 * applyTheme tolerant of partial/malformed theme docs (e.g. a hand-edited
 * settings row, or an older client PUTting a theme missing new fields).
 */
function deepMerge<T>(base: T, patch: unknown): T {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch) || Array.isArray(base)) {
    return base;
  }
  const result = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(result)) {
    const baseVal = result[key];
    const patchVal = (patch as Record<string, unknown>)[key];
    if (patchVal === undefined) continue;
    if (baseVal !== null && typeof baseVal === 'object' && !Array.isArray(baseVal)) {
      result[key] = deepMerge(baseVal, patchVal);
    } else if (typeof patchVal === typeof baseVal) {
      result[key] = patchVal;
    }
  }
  return result as T;
}

/* ---------------------------- color math ---------------------------- */

/** '#rrggbb' | '#rgb' -> [h(0-360), s(0-1), l(0-1)]. */
function hexToHsl(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0').slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      break;
    case g:
      h = ((b - r) / d + 2) * 60;
      break;
    default:
      h = ((r - g) / d + 4) * 60;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Darken a hex color by reducing its HSL lightness by `amount` (fraction, 0..1). */
function darken(hex: string, amount = 0.04): string {
  try {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(h, s, Math.max(0, l - amount));
  } catch {
    return hex;
  }
}

function clampTypeScale(scale: number): number {
  if (typeof scale !== 'number' || Number.isNaN(scale)) return 1;
  return Math.min(1.1, Math.max(0.9, scale));
}

/* -------------------------------- apply -------------------------------- */

/**
 * Apply a Theme document as CSS custom properties on `root` (default
 * document.documentElement). Deep-merges over DEFAULT_THEME first so partial
 * or malformed docs never blank out a color/font. Loads the three theme
 * fonts via ensureFont before resolving.
 */
export async function applyTheme(t: Theme, root: HTMLElement = document.documentElement): Promise<void> {
  const theme = deepMerge(DEFAULT_THEME, t);
  const { colors, fonts, typeScale } = theme;
  const set = (name: string, value: string) => root.style.setProperty(name, value);

  set('--cream', colors.cream);
  set('--bg', colors.cream); // cream is the base ground
  set('--sage-tint', colors.sageTint);
  set('--ink', colors.ink);
  set('--fg', colors.ink);
  set('--champagne', colors.champagne);
  set('--vine-fuchsia', colors.vineFuchsia);
  set('--vine-violet', colors.vineViolet);
  set('--vine-teal', colors.vineTeal);
  set('--vine-marigold', colors.vineMarigold);
  set('--vine-leaf', colors.vineLeaf);

  // Preloader stays pinned dark — --preloader-ink is never touched here.
  set('--cream-deep', darken(colors.cream));
  set('--sage-tint-deep', darken(colors.sageTint));

  root.style.fontSize = `calc(100% * ${clampTypeScale(typeScale)})`;

  const [display, italic, ui] = await Promise.all([
    ensureFont(fonts.display),
    ensureFont(fonts.italic),
    ensureFont(fonts.ui),
  ]);
  set('--font-display', display);
  set('--font-italic', italic);
  set('--font-ui', ui);
}
