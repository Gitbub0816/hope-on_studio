/**
 * The real site block registry, imported piece-by-piece from @blocks/* so the
 * editor preview is the actual site renderer — pixel-identical by construction.
 *
 * Some block types (particle-image, stats-editorial, process-steps) are still
 * Wave-2 stubs on the site side and have no renderer yet; they are absent here
 * and the canvas renders an elegant placeholder for them instead (see render.ts),
 * so every block stays selectable, movable, and editable regardless.
 */
import type { BlockRenderer } from '@blocks/contract';

import { hero } from '@blocks/hero';
import { manifesto } from '@blocks/manifesto';
import { outletTriptych } from '@blocks/outlet-triptych';
import { scatterWordsBlock } from '@blocks/scatter-words';
import { galleryFlow } from '@blocks/gallery-flow';
import { quoteBloom } from '@blocks/quote-bloom';
import { marqueeBlock } from '@blocks/marquee';
import { faqScatter } from '@blocks/faq-scatter';
import { contactCard } from '@blocks/contact-card';
import { footer } from '@blocks/footer';

const RENDERERS = [
  hero,
  manifesto,
  outletTriptych,
  scatterWordsBlock,
  galleryFlow,
  quoteBloom,
  marqueeBlock,
  faqScatter,
  contactCard,
  footer,
] as unknown as BlockRenderer<never>[];

export const registry = new Map<string, BlockRenderer<never>>(
  RENDERERS.map((r) => [r.type, r]),
);
