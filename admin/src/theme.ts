/**
 * Editor-side theme client. Owns the sitewide Theme model helpers:
 *  - DEFAULT_THEME (from shared/theme-default.json)
 *  - applyTheme(theme, root): live-preview the theme as CSS custom properties
 *
 * We prefer the site's own runtime (site/src/theme.ts) when it is present, so
 * the editor and production stay byte-identical. That module is built by a
 * parallel agent against the WAVE T contract and may not exist yet — so the
 * dynamic import is guarded and, if it fails, we apply the exact same
 * contract mapping ourselves. Either way the canvas updates instantly.
 */
import type { FontKey, Theme } from '@shared/types';
import defaultTheme from '@shared/theme-default.json';
import { ensureFont } from '../../site/src/fonts';

export const DEFAULT_THEME: Theme = defaultTheme as Theme;

/** A strict 3- or 6-digit hex color. */
export function isHexColor(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

/** Normalize any accepted hex to lowercase #rrggbb (color inputs need 6 digits). */
export function normalizeHex(v: string): string {
  let s = v.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) {
    s = '#' + s.slice(1).split('').map((c) => c + c).join('');
  }
  return s;
}

/** Darken a hex color by a fraction (0..1) of its channel range. */
function darken(hex: string, amount: number): string {
  const s = normalizeHex(hex);
  if (!/^#[0-9a-f]{6}$/.test(s)) return hex;
  const n = parseInt(s.slice(1), 16);
  const f = Math.max(0, 1 - amount);
  const r = Math.round(((n >> 16) & 0xff) * f);
  const g = Math.round(((n >> 8) & 0xff) * f);
  const b = Math.round((n & 0xff) * f);
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/** Apply the contract's color→CSS-var mapping directly (used when the site
 *  runtime module isn't available in this bundle). */
async function applyThemeFallback(theme: Theme, root: HTMLElement): Promise<void> {
  const c = theme.colors;
  const set = (name: string, value: string) => root.style.setProperty(name, value);

  set('--cream', c.cream);
  set('--bg', c.cream);
  set('--cream-deep', darken(c.cream, 0.04));
  set('--sage-tint', c.sageTint);
  set('--sage-tint-deep', darken(c.sageTint, 0.04));
  set('--ink', c.ink);
  set('--fg', c.ink);
  set('--champagne', c.champagne);
  set('--vine-fuchsia', c.vineFuchsia);
  set('--vine-violet', c.vineViolet);
  set('--vine-teal', c.vineTeal);
  set('--vine-marigold', c.vineMarigold);
  set('--vine-leaf', c.vineLeaf);

  const scale = Math.min(1.1, Math.max(0.9, theme.typeScale || 1));
  root.style.fontSize = `calc(100% * ${scale})`;

  const slots: [FontKey, string][] = [
    [theme.fonts.display, '--font-display'],
    [theme.fonts.italic, '--font-italic'],
    [theme.fonts.ui, '--font-ui'],
  ];
  await Promise.all(
    slots.map(async ([key, cssVar]) => {
      const family = await ensureFont(key);
      root.style.setProperty(cssVar, family);
    }),
  );
}

let siteRuntime: { applyTheme?: (t: Theme, r?: HTMLElement) => Promise<void> } | null | undefined;

/** Best-effort load of the site's own theme runtime, resolved at most once.
 *  Guarded with @vite-ignore so a not-yet-built module never breaks the build. */
async function loadSiteRuntime(): Promise<typeof siteRuntime> {
  if (siteRuntime !== undefined) return siteRuntime;
  try {
    const spec = ['@site', 'theme'].join('/');
    siteRuntime = (await import(/* @vite-ignore */ spec)) as typeof siteRuntime;
  } catch {
    siteRuntime = null;
  }
  return siteRuntime;
}

/** Live-apply a theme to `root` (default: the document element, so the whole
 *  editor — chrome and canvas — inherits it, matching production). */
export async function applyTheme(
  theme: Theme,
  root: HTMLElement = document.documentElement,
): Promise<void> {
  const runtime = await loadSiteRuntime();
  if (runtime?.applyTheme) {
    try {
      await runtime.applyTheme(theme, root);
      return;
    } catch {
      /* fall through to our own mapping */
    }
  }
  await applyThemeFallback(theme, root);
}
