/**
 * Curated, self-hosted font catalog for the theme system. Only the families
 * the theme actually selects are loaded (dynamic import → separate chunks).
 * The three defaults are imported statically by boot.ts and always present.
 */
import type { FontKey } from '@shared/types';

export interface FontDef {
  label: string;
  /** CSS font-family stack to assign to the token */
  family: string;
  /** Loads the @fontsource css (no-op for statically imported defaults) */
  load: () => Promise<unknown>;
  /** Which token slots this face suits */
  roles: ('display' | 'italic' | 'ui')[];
}

const done = () => Promise.resolve();

export const FONTS: Record<FontKey, FontDef> = {
  fraunces: {
    label: 'Fraunces',
    family: "'Fraunces Variable', 'Fraunces', Georgia, serif",
    load: done, // static in boot.ts
    roles: ['display'],
  },
  playfair: {
    label: 'Playfair Display',
    family: "'Playfair Display Variable', 'Playfair Display', Georgia, serif",
    load: () => import('@fontsource-variable/playfair-display/index.css'),
    roles: ['display'],
  },
  'eb-garamond': {
    label: 'EB Garamond',
    family: "'EB Garamond', Georgia, serif",
    load: () =>
      Promise.all([
        import('@fontsource/eb-garamond/400.css'),
        import('@fontsource/eb-garamond/500.css'),
        import('@fontsource/eb-garamond/400-italic.css'),
      ]),
    roles: ['display', 'italic'],
  },
  cormorant: {
    label: 'Cormorant Garamond',
    family: "'Cormorant Garamond', Georgia, serif",
    load: done, // static in boot.ts
    roles: ['italic', 'display'],
  },
  figtree: {
    label: 'Figtree',
    family: "'Figtree Variable', 'Figtree', system-ui, sans-serif",
    load: done, // static in boot.ts
    roles: ['ui'],
  },
  inter: {
    label: 'Inter',
    family: "'Inter Variable', 'Inter', system-ui, sans-serif",
    load: () => import('@fontsource-variable/inter/index.css'),
    roles: ['ui'],
  },
  karla: {
    label: 'Karla',
    family: "'Karla', system-ui, sans-serif",
    load: () =>
      Promise.all([import('@fontsource/karla/400.css'), import('@fontsource/karla/600.css')]),
    roles: ['ui'],
  },
};

/** Load a font family (idempotent — vite caches the chunk) and return its stack. */
export async function ensureFont(key: FontKey): Promise<string> {
  const def = FONTS[key] ?? FONTS.fraunces;
  try {
    await def.load();
  } catch {
    /* offline chunk failure — fall back silently, stack still applies */
  }
  return def.family;
}
