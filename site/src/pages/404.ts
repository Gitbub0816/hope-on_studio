/**
 * 404 — art-directed like every utility surface (CLAUDE.md working
 * agreements). Ink ground, a huge Fraunces "404", a whisper line, a single
 * grace-note bloom drifting behind the numerals, and a home link styled like
 * the contact card's email line.
 */
import '../boot';
import type { PageContent } from '@shared/types';
import { el } from '../blocks/contract';
import { initChrome } from '../chrome';
import { initMotion, entrance, magnetic } from '../motion';
import '../styles/pages-404.css';

const page: PageContent = {
  slug: '404',
  title: 'Lost — Hope On Studio',
  description: 'This page pressed itself between other pages.',
  ground: 'ink',
  blocks: [],
};

async function main(): Promise<void> {
  document.body.classList.add('page-404');
  const chrome = initChrome(page);
  await chrome.done;

  document.title = page.title;
  document.body.dataset.ground = page.ground;

  const app = document.querySelector<HTMLElement>('#app')!;
  app.innerHTML = '';
  app.append(build());

  initMotion();
  chrome.reveal();

  const home = app.querySelector<HTMLElement>('.lost__home');
  if (home) magnetic(home);
  entrance(app.querySelector('.lost')!);

  const bloomHost = app.querySelector<HTMLElement>('.lost__bloom');
  if (bloomHost) {
    import('../engine')
      .then(({ bloom }) => {
        bloom(bloomHost, { hues: ['peony', 'gold'], intensity: 'grace-note', trigger: 'immediate' });
      })
      .catch(() => {
        /* engine unavailable — the numerals stand alone */
      });
  }
}

function build(): HTMLElement {
  const root = el('section', { class: 'section lost', 'data-ground': 'ink' });

  const canvas = el('div', { class: 'lost__bloom', 'aria-hidden': 'true' });

  const kicker = el('p', { class: 'kicker lost__kicker' }, ['Nowhere in particular']);
  const numeral = el('h1', { class: 'lost__numeral display' }, ['404']);
  const whisper = el('p', { class: 'lost__whisper whisper' }, [
    'This page pressed itself between other pages.',
  ]);

  const home = el(
    'a',
    { class: 'lost__home', href: '/', 'data-cursor': 'link' },
    ['Take me home →'],
  );

  const inner = el('div', { class: 'lost__inner' }, [kicker, numeral, whisper, home]);
  root.append(canvas, inner);
  return root;
}

void main();
