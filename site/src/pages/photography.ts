/**
 * Photography page entry — darkroom personality. Ink-dominant: ink hero →
 * cream manifesto → two ink particle-image "develop" moments (assemble then
 * slats) → ink gallery-flow (dominant) → ink scatter-words → ink quote-bloom →
 * ink contact → ink footer.
 */
import { loadContent, renderPage } from '../boot';
import type { BlockRenderer } from '../blocks/contract';
import type { PageContent } from '@shared/types';
import seed from '@shared/content/photography.json';

import { initChrome } from '../chrome';
import { initMotion } from '../motion';

import { hero } from '../blocks/hero';
import { manifesto } from '../blocks/manifesto';
import { particleImage } from '../blocks/particle-image';
import { galleryFlow } from '../blocks/gallery-flow';
import { scatterWordsBlock } from '../blocks/scatter-words';
import { quoteBloom } from '../blocks/quote-bloom';
import { contactCard } from '../blocks/contact-card';
import { footer } from '../blocks/footer';

import '../styles/pages-photography.css';

const registry = new Map<string, BlockRenderer<never>>(
  (
    [
      hero,
      manifesto,
      particleImage,
      galleryFlow,
      scatterWordsBlock,
      quoteBloom,
      contactCard,
      footer,
    ] as BlockRenderer<never>[]
  ).map((r) => [r.type, r]),
);

async function main(): Promise<void> {
  document.body.classList.add('page-photography');
  const seedContent = seed as unknown as PageContent;

  const chrome = initChrome(seedContent);
  const content = await loadContent('photography', seedContent);
  await chrome.done;

  renderPage(content, registry);
  initMotion();
  chrome.reveal();
}

void main();
