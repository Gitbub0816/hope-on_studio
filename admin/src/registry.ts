/**
 * The real site block registry, imported piece-by-piece from @blocks/* so the
 * editor preview is the actual site renderer — pixel-identical by construction.
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
import { particleImage } from '@blocks/particle-image';
import { statsEditorial } from '@blocks/stats-editorial';
import { processSteps } from '@blocks/process-steps';

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
  particleImage,
  statsEditorial,
  processSteps,
] as unknown as BlockRenderer<never>[];

export const registry = new Map<string, BlockRenderer<never>>(
  RENDERERS.map((r) => [r.type, r]),
);
