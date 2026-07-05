/**
 * Learning Design page entry — blueprint personality. Balanced grounds: ink
 * hero → cream manifesto → cream process-steps (blueprint grid-tick styling)
 * → cream stats → cream gallery (artifacts) → ink quote-bloom → ink contact →
 * ink footer.
 */
import { loadContent, renderPage } from '../boot';
import type { BlockRenderer } from '../blocks/contract';
import type { PageContent } from '@shared/types';
import seed from '@shared/content/learning-design.json';

import { initChrome } from '../chrome';
import { initMotion } from '../motion';

import { hero } from '../blocks/hero';
import { manifesto } from '../blocks/manifesto';
import { processSteps } from '../blocks/process-steps';
import { statsEditorial } from '../blocks/stats-editorial';
import { galleryFlow } from '../blocks/gallery-flow';
import { quoteBloom } from '../blocks/quote-bloom';
import { contactCard } from '../blocks/contact-card';
import { footer } from '../blocks/footer';

import '../styles/pages-learning-design.css';

const registry = new Map<string, BlockRenderer<never>>(
  (
    [
      hero,
      manifesto,
      processSteps,
      statsEditorial,
      galleryFlow,
      quoteBloom,
      contactCard,
      footer,
    ] as BlockRenderer<never>[]
  ).map((r) => [r.type, r]),
);

async function main(): Promise<void> {
  document.body.classList.add('page-learning-design');
  const seedContent = seed as unknown as PageContent;

  const chrome = initChrome(seedContent);
  const content = await loadContent('learning-design', seedContent);
  await chrome.done;

  renderPage(content, registry);
  initMotion();
  chrome.reveal();
}

void main();
