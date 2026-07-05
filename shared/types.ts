/**
 * Shared contracts between the public site, the admin editor, and the worker.
 * The whole system speaks "blocks": a page is an ordered list of typed blocks.
 */

export type OutletKey = 'publishing' | 'photography' | 'learning-design';

/** One content block instance on a page. `props` shape depends on `type`. */
export interface Block<P = Record<string, unknown>> {
  id: string; // stable uuid — the editor keys off this
  type: string; // must exist in the block registry
  props: P;
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
