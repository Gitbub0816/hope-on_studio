/**
 * Publishing page entry — paper & ink personality. Cream-dominant rhythm:
 * ink hero → cream manifesto (drop cap) → cream gallery (spreads/bindings) →
 * cream process (how a title happens) → cream stats → ink quote-bloom →
 * ink contact → ink footer.
 */
import { loadContent, renderPage } from '../boot';
import type { BlockRenderer } from '../blocks/contract';
import type { PageContent } from '@shared/types';
import seed from '@shared/content/publishing.json';

import { initChrome } from '../chrome';
import { initMotion } from '../motion';

import { hero } from '../blocks/hero';
import { manifesto } from '../blocks/manifesto';
import { galleryFlow } from '../blocks/gallery-flow';
import { processSteps } from '../blocks/process-steps';
import { statsEditorial } from '../blocks/stats-editorial';
import { quoteBloom } from '../blocks/quote-bloom';
import { contactCard } from '../blocks/contact-card';
import { footer } from '../blocks/footer';

import '../styles/pages-publishing.css';

const registry = new Map<string, BlockRenderer<never>>(
  (
    [
      hero,
      manifesto,
      galleryFlow,
      processSteps,
      statsEditorial,
      quoteBloom,
      contactCard,
      footer,
    ] as BlockRenderer<never>[]
  ).map((r) => [r.type, r]),
);

async function main(): Promise<void> {
  document.body.classList.add('page-publishing');
  const seedContent = seed as unknown as PageContent;

  const chrome = initChrome(seedContent);
  const content = await loadContent('publishing', seedContent);
  await chrome.done;

  renderPage(content, registry);
  initMotion();
  chrome.reveal();
}

void main();
