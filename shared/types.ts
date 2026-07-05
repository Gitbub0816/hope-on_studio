/**
 * Shared contracts between the public site, the admin editor, and the worker.
 * The whole system speaks "blocks": a page is an ordered list of typed blocks.
 */

export type OutletKey = 'publishing' | 'photography' | 'learning-design';

/**
 * Per-block style overrides (element-focused styling, edited in the admin
 * "Style" tab). All fields optional — absent means "inherit the theme".
 * Applied by boot.renderPage as CSS custom properties / data attrs on the
 * block's root section, so every token-driven rule inside just follows.
 */
export interface BlockStyle {
  ground?: 'ink' | 'cream'; // section polarity choice (both are light tints)
  bgColor?: string; // explicit section background (painted over the ground)
  textColor?: string; // overrides --fg within the block
  accentColor?: string; // overrides --champagne ornaments within the block
  fontDisplay?: FontKey; // display face for headings inside this block
  padScale?: number; // 0.5..1.5 multiplier on section padding
}

/** One content block instance on a page. `props` shape depends on `type`. */
export interface Block<P = Record<string, unknown>> {
  id: string; // stable uuid — the editor keys off this
  type: string; // must exist in the block registry
  props: P;
  style?: BlockStyle; // optional per-block style overrides
}

/* ------------------------------ Theme ------------------------------ */

export type FontKey =
  | 'fraunces'
  | 'playfair'
  | 'eb-garamond'
  | 'cormorant'
  | 'figtree'
  | 'inter'
  | 'karla';

/** Sitewide theme document — stored in D1 `settings` under key 'theme',
 *  edited in the admin Theme panel, applied as CSS vars at boot. */
export interface Theme {
  colors: {
    cream: string; // base ground
    sageTint: string; // alternate ground
    ink: string; // text
    champagne: string; // ornaments/numerals
    vineFuchsia: string;
    vineViolet: string;
    vineTeal: string;
    vineMarigold: string;
    vineLeaf: string;
  };
  fonts: {
    display: FontKey; // serif display face
    italic: FontKey; // whisper/italic face
    ui: FontKey; // sans UI face
  };
  /** Root type scale multiplier, 0.9–1.1 */
  typeScale: number;
}

export interface PageContent {
  slug: string; // '' (landing) | outlet keys | '404'
  title: string; // document title
  description: string; // meta description
  ground: 'ink' | 'cream'; // initial background polarity
  blocks: Block[];
}

/** Media reference — resolves to /assets/* locally or an R2-backed URL in prod. */
export interface MediaRef {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

/* ---------------------------------------------------------------- *
 * Block prop shapes (the initial vocabulary — see context/PLAN.md) *
 * ---------------------------------------------------------------- */

export interface HeroProps {
  kicker: string; // small-caps line above the title
  title: string; // huge display line, may contain \n
  subtitle: string;
  image: MediaRef; // particle-rendered
  meta: { left: string; right: string }; // corner stamps
}

export interface ManifestoProps {
  kicker: string;
  heading: string; // gets the ghost-duplicate treatment
  body: string; // paragraphs split on \n\n
  accent?: 'none' | 'rule';
}

export interface TriptychPanel {
  outlet: OutletKey;
  title: string;
  tagline: string;
  image: MediaRef;
  bloom: 'iris' | 'coral' | 'gold'; // hover bloom hue (DESIGN.md § 3)
}
export interface TriptychProps {
  kicker: string;
  panels: [TriptychPanel, TriptychPanel, TriptychPanel];
}

export interface ParticleImageProps {
  image: MediaRef;
  caption?: string;
  variant: 'assemble' | 'slats'; // assembly style
  height?: 'half' | 'full';
}

export interface ScatterWordsProps {
  sentence: string; // words explode across viewport, assemble on scroll
  emphasis: string[]; // words set larger / in italic serif
}

export interface GalleryFlowItem {
  image: MediaRef;
  size: 'sm' | 'md' | 'lg';
  treatment: 'photo' | 'halftone';
  rotation?: number; // degrees, -4..4
}
export interface GalleryFlowProps {
  kicker: string;
  items: GalleryFlowItem[];
}

export interface StatItem {
  value: string; // huge serif numeral, e.g. "12"
  suffix?: string; // e.g. "titles"
  label: string;
}
export interface StatsEditorialProps {
  kicker: string;
  heading: string;
  stats: StatItem[];
}

export interface MarqueeProps {
  phrases: string[]; // looped, separated by ornaments
}

export interface FaqItem {
  q: string;
  a: string;
}
export interface FaqScatterProps {
  kicker: string;
  items: FaqItem[];
}

export interface QuoteBloomProps {
  quote: string; // THE magic moment — floral bloom behind this
  attribution?: string;
}

export interface ProcessStep {
  n: string; // "01"
  title: string;
  body: string;
}
export interface ProcessStepsProps {
  kicker: string;
  heading: string;
  steps: ProcessStep[];
}

export interface ContactProps {
  kicker: string;
  heading: string;
  email: string;
  socials: { label: string; href: string }[];
}

export interface FooterProps {
  line: string; // closing whisper line
  meta: string; // e.g. "HOPE ON STUDIO — EST. 2026"
}

/* ------------------------------- API ------------------------------- */

export interface RevisionSummary {
  id: number;
  status: 'draft' | 'published';
  createdAt: string;
  publishedAt?: string;
}

export interface SaveDraftRequest {
  slug: string;
  content: PageContent;
}
