/**
 * Landing page entry — the full video-1 arc:
 * ink hero → cream manifesto → ink triptych → scatter → cream gallery →
 * ink quote-bloom → marquee → cream faq → contact → footer.
 */
import { loadContent, renderPage } from '../boot';
import type { BlockRenderer } from '../blocks/contract';
import type { PageContent } from '@shared/types';
import seed from '@shared/content/landing.json';

import { initChrome } from '../chrome';
import { initMotion } from '../motion';

import { hero } from '../blocks/hero';
import { manifesto } from '../blocks/manifesto';
import { outletTriptych } from '../blocks/outlet-triptych';
import { scatterWordsBlock } from '../blocks/scatter-words';
import { galleryFlow } from '../blocks/gallery-flow';
import { quoteBloom } from '../blocks/quote-bloom';
import { marqueeBlock } from '../blocks/marquee';
import { faqScatter } from '../blocks/faq-scatter';
import { contactCard } from '../blocks/contact-card';
import { footer } from '../blocks/footer';

const registry = new Map<string, BlockRenderer<never>>(
  (
    [
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
    ] as BlockRenderer<never>[]
  ).map((r) => [r.type, r]),
);

async function main(): Promise<void> {
  const seedContent = seed as unknown as PageContent;

  // Preloader + chrome start immediately; content loads in parallel.
  const chrome = initChrome(seedContent);
  const content = await loadContent('', seedContent);
  await chrome.done;

  renderPage(content, registry);
  initMotion();
  chrome.reveal();
}

void main();
