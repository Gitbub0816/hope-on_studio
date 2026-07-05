/**
 * Block catalog — the editor's knowledge of every block type: an inspector
 * schema (which props are editable and how) and an in-voice default-props
 * factory used by the "+ Add block" palette. Prop shapes track shared/types.
 *
 * Placeholder copy is written in Hope On Studio's voice — never lorem ipsum.
 */
import type { MediaRef } from '@shared/types';
import { uid } from './util';

export type FieldKind = 'text' | 'textarea' | 'select' | 'image' | 'number' | 'csv';

/** How an inline [data-edit] node's innerText maps back to the stored string. */
export type MultiMode = 'line' | 'lines' | 'paras';

export interface Field {
  path: string; // relative to block.props, e.g. 'meta.left'
  label: string;
  kind: FieldKind;
  multiline?: MultiMode;
  options?: string[];
  rows?: number;
  help?: string;
}

export interface ArrayField {
  path: string; // e.g. 'panels'
  label: string;
  itemLabel: (i: number) => string;
  fields: Field[]; // paths relative to the item
}

export interface CatalogEntry {
  type: string;
  label: string;
  description: string;
  fields: Field[];
  arrays: ArrayField[];
  makeDefault(): Record<string, unknown>;
}

const img = (src: string, alt: string): MediaRef => ({ src, alt });

const PLACEHOLDER = '/assets/art/hero-bloom-field.jpg';

export const CATALOG: CatalogEntry[] = [
  {
    type: 'hero',
    label: 'Hero',
    description: 'Full-viewport opening — giant title over a particle image.',
    fields: [
      { path: 'kicker', label: 'Kicker', kind: 'text', multiline: 'line' },
      { path: 'title', label: 'Title', kind: 'textarea', multiline: 'lines', rows: 2, help: 'One line per row.' },
      { path: 'subtitle', label: 'Subtitle', kind: 'textarea', multiline: 'line', rows: 3 },
      { path: 'image', label: 'Image', kind: 'image' },
      { path: 'meta.left', label: 'Meta — left', kind: 'text', multiline: 'line' },
      { path: 'meta.right', label: 'Meta — right', kind: 'text', multiline: 'line' },
    ],
    arrays: [],
    makeDefault: () => ({
      kicker: 'A New Chapter',
      title: 'A HEADING\nWORTH KEEPING',
      subtitle: 'A quiet line that says, in the studio’s voice, what this page is for.',
      image: img(PLACEHOLDER, 'A soft botanical scene rendered in halftone'),
      meta: { left: 'EST. 2026', right: 'HOPE ON STUDIO' },
    }),
  },
  {
    type: 'manifesto',
    label: 'Manifesto',
    description: 'Cream statement of practice — ghost-duplicated heading and prose.',
    fields: [
      { path: 'kicker', label: 'Kicker', kind: 'text', multiline: 'line' },
      { path: 'heading', label: 'Heading', kind: 'textarea', multiline: 'lines', rows: 2 },
      { path: 'body', label: 'Body', kind: 'textarea', multiline: 'paras', rows: 6, help: 'Blank line between paragraphs.' },
      { path: 'accent', label: 'Accent rule', kind: 'select', options: ['none', 'rule'] },
    ],
    arrays: [],
    makeDefault: () => ({
      kicker: 'The Practice',
      heading: 'Made slowly,\non purpose.',
      body: 'A short paragraph in the studio’s unhurried voice about why this work matters.\n\nA second paragraph, patient and warm, that finishes the thought.',
      accent: 'rule',
    }),
  },
  {
    type: 'outlet-triptych',
    label: 'Outlet Triptych',
    description: 'The three creative outlets as tall hover-bloom panels.',
    fields: [{ path: 'kicker', label: 'Kicker', kind: 'text', multiline: 'line' }],
    arrays: [
      {
        path: 'panels',
        label: 'Panels',
        itemLabel: (i) => `Panel ${i + 1}`,
        fields: [
          { path: 'title', label: 'Title', kind: 'text', multiline: 'line' },
          { path: 'tagline', label: 'Tagline', kind: 'textarea', multiline: 'line', rows: 2 },
          { path: 'image', label: 'Image', kind: 'image' },
          { path: 'bloom', label: 'Bloom hue', kind: 'select', options: ['iris', 'coral', 'gold'] },
        ],
      },
    ],
    makeDefault: () => ({
      kicker: 'Three Creative Outlets',
      panels: [
        { outlet: 'publishing', title: 'Publishing', tagline: 'Artistic books & journals that ask to be held.', image: img('/assets/art/outlet-publishing.jpg', 'An open journal with pressed flowers'), bloom: 'iris' },
        { outlet: 'photography', title: 'Photography', tagline: 'Quiet images with long memories.', image: img('/assets/art/outlet-photography.jpg', 'A muted still-life photograph'), bloom: 'coral' },
        { outlet: 'learning-design', title: 'Learning Design', tagline: 'Courses built the way good stories are.', image: img('/assets/art/outlet-learning.jpg', 'A hand-drawn course blueprint'), bloom: 'gold' },
      ],
    }),
  },
  {
    type: 'scatter-words',
    label: 'Scatter Words',
    description: 'A sentence exploded across the viewport, assembling on scroll.',
    fields: [
      { path: 'sentence', label: 'Sentence', kind: 'textarea', multiline: 'line', rows: 3 },
      { path: 'emphasis', label: 'Emphasis words', kind: 'csv', help: 'Comma-separated words to set larger, in italic.' },
    ],
    arrays: [],
    makeDefault: () => ({
      sentence: 'Every project begins the same way — with a small stubborn hope that it can be beautiful',
      emphasis: ['hope', 'beautiful'],
    }),
  },
  {
    type: 'gallery-flow',
    label: 'Gallery Flow',
    description: 'Mixed-size images floating at different speeds, gentle rotation.',
    fields: [{ path: 'kicker', label: 'Kicker', kind: 'text', multiline: 'line' }],
    arrays: [
      {
        path: 'items',
        label: 'Items',
        itemLabel: (i) => `Image ${i + 1}`,
        fields: [
          { path: 'image', label: 'Image', kind: 'image' },
          { path: 'size', label: 'Size', kind: 'select', options: ['sm', 'md', 'lg'] },
          { path: 'treatment', label: 'Treatment', kind: 'select', options: ['photo', 'halftone'] },
          { path: 'rotation', label: 'Rotation°', kind: 'number' },
        ],
      },
    ],
    makeDefault: () => ({
      kicker: 'From the Studio',
      items: [
        { image: img('/assets/art/gallery-01.jpg', 'Journal spread with botanical illustration'), size: 'lg', treatment: 'halftone', rotation: -2 },
        { image: img('/assets/art/gallery-02.jpg', 'Still-life photograph of paper and petals'), size: 'md', treatment: 'photo', rotation: 1.5 },
        { image: img('/assets/art/gallery-03.jpg', 'Course storyboard sketches'), size: 'sm', treatment: 'photo', rotation: 3 },
      ],
    }),
  },
  {
    type: 'quote-bloom',
    label: 'Quote Bloom',
    description: 'The reserved floral magic moment — a founding line on ink.',
    fields: [
      { path: 'quote', label: 'Quote', kind: 'textarea', multiline: 'lines', rows: 3, help: 'One line per row.' },
      { path: 'attribution', label: 'Attribution', kind: 'text', multiline: 'line' },
    ],
    arrays: [],
    makeDefault: () => ({
      quote: 'Hope is a discipline —\nyou practice it in ink, in light, in the way you teach.',
      attribution: 'the studio’s founding line',
    }),
  },
  {
    type: 'marquee',
    label: 'Marquee',
    description: 'An infinite horizontal loop of studio phrases.',
    fields: [{ path: 'phrases', label: 'Phrases', kind: 'csv', help: 'Comma-separated phrases.' }],
    arrays: [],
    makeDefault: () => ({
      phrases: ['NEW WORK IN THE MAKING', 'COMMISSIONS OPEN SOON', 'MADE SLOWLY, WITH HOPE'],
    }),
  },
  {
    type: 'faq-scatter',
    label: 'FAQ',
    description: 'Scattered "F A Q" letters over an elegant accordion.',
    fields: [{ path: 'kicker', label: 'Kicker', kind: 'text', multiline: 'line' }],
    arrays: [
      {
        path: 'items',
        label: 'Questions',
        itemLabel: (i) => `Q${i + 1}`,
        fields: [
          { path: 'q', label: 'Question', kind: 'textarea', multiline: 'line', rows: 2 },
          { path: 'a', label: 'Answer', kind: 'textarea', multiline: 'line', rows: 3 },
        ],
      },
    ],
    makeDefault: () => ({
      kicker: 'Asked & Answered',
      items: [
        { q: 'A question a visitor might ask?', a: 'A warm, unhurried answer in the studio’s voice.' },
        { q: 'And one more?', a: 'A second answer that leaves the reader feeling looked after.' },
      ],
    }),
  },
  {
    type: 'contact-card',
    label: 'Contact Card',
    description: 'An art-directed correspondence card, thin-bordered on ink.',
    fields: [
      { path: 'kicker', label: 'Kicker', kind: 'text', multiline: 'line' },
      { path: 'heading', label: 'Heading', kind: 'text', multiline: 'line' },
      { path: 'email', label: 'Email', kind: 'text', multiline: 'line' },
    ],
    arrays: [
      {
        path: 'socials',
        label: 'Socials',
        itemLabel: (i) => `Link ${i + 1}`,
        fields: [
          { path: 'label', label: 'Label', kind: 'text', multiline: 'line' },
          { path: 'href', label: 'URL', kind: 'text' },
        ],
      },
    ],
    makeDefault: () => ({
      kicker: 'Correspondence',
      heading: 'Write to the studio',
      email: 'hello@hopeon.studio',
      socials: [{ label: 'Instagram', href: '#' }],
    }),
  },
  {
    type: 'footer',
    label: 'Footer',
    description: 'The closing whisper line and a single drifting petal.',
    fields: [
      { path: 'line', label: 'Line', kind: 'text', multiline: 'line' },
      { path: 'meta', label: 'Meta stamp', kind: 'text', multiline: 'line' },
    ],
    arrays: [],
    makeDefault: () => ({ line: 'Made slowly, with hope.', meta: 'HOPE ON STUDIO — EST. 2026' }),
  },
  {
    type: 'particle-image',
    label: 'Particle Image',
    description: 'A single halftone image that assembles from particles.',
    fields: [
      { path: 'image', label: 'Image', kind: 'image' },
      { path: 'caption', label: 'Caption', kind: 'text', multiline: 'line' },
      { path: 'variant', label: 'Variant', kind: 'select', options: ['assemble', 'slats'] },
      { path: 'height', label: 'Height', kind: 'select', options: ['half', 'full'] },
    ],
    arrays: [],
    makeDefault: () => ({
      image: img(PLACEHOLDER, 'A still image rendered in halftone dots'),
      caption: 'Nº 01 — a quiet frame',
      variant: 'assemble',
      height: 'full',
    }),
  },
  {
    type: 'stats-editorial',
    label: 'Stats Editorial',
    description: 'Huge serif numerals with small-caps labels.',
    fields: [
      { path: 'kicker', label: 'Kicker', kind: 'text', multiline: 'line' },
      { path: 'heading', label: 'Heading', kind: 'text', multiline: 'line' },
    ],
    arrays: [
      {
        path: 'stats',
        label: 'Stats',
        itemLabel: (i) => `Stat ${i + 1}`,
        fields: [
          { path: 'value', label: 'Value', kind: 'text', multiline: 'line' },
          { path: 'suffix', label: 'Suffix', kind: 'text', multiline: 'line' },
          { path: 'label', label: 'Label', kind: 'textarea', multiline: 'line', rows: 2 },
        ],
      },
    ],
    makeDefault: () => ({
      kicker: 'The Shelf So Far',
      heading: 'Small numbers, kept promises.',
      stats: [
        { value: '3', suffix: 'titles', label: 'in quiet development' },
        { value: '1', suffix: '', label: 'rule — never ship anything we wouldn’t keep' },
      ],
    }),
  },
  {
    type: 'process-steps',
    label: 'Process Steps',
    description: 'Numbered steps with huge serif numerals — a blueprint feel.',
    fields: [
      { path: 'kicker', label: 'Kicker', kind: 'text', multiline: 'line' },
      { path: 'heading', label: 'Heading', kind: 'text', multiline: 'line' },
    ],
    arrays: [
      {
        path: 'steps',
        label: 'Steps',
        itemLabel: (i) => `Step ${i + 1}`,
        fields: [
          { path: 'n', label: 'Number', kind: 'text', multiline: 'line' },
          { path: 'title', label: 'Title', kind: 'text', multiline: 'line' },
          { path: 'body', label: 'Body', kind: 'textarea', multiline: 'line', rows: 3 },
        ],
      },
    ],
    makeDefault: () => ({
      kicker: 'How It Happens',
      heading: 'From whisper to finished.',
      steps: [
        { n: '01', title: 'Listen', body: 'A short line about how the work begins.' },
        { n: '02', title: 'Compose', body: 'A short line about how it takes shape.' },
        { n: '03', title: 'Finish', body: 'A short line about how it is completed, only when inevitable.' },
      ],
    }),
  },
];

export const CATALOG_BY_TYPE = new Map(CATALOG.map((e) => [e.type, e]));

export function catalogFor(type: string): CatalogEntry | undefined {
  return CATALOG_BY_TYPE.get(type);
}
