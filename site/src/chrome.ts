/**
 * Page chrome — fixed nav, the ink preloader, custom cursor + motion wiring,
 * and the fixed corner metadata stamps (EST. 2026 / section index).
 *
 * Page-agnostic: every page (landing + detail pages) calls initChrome(page)
 * before rendering, then chrome.reveal() after render + initMotion.
 *
 *   const chrome = initChrome(page);
 *   await chrome.done;          // preloader intro finished
 *   renderPage(...); initMotion();
 *   chrome.reveal();            // lift preloader, start section-index watcher
 */
import gsap from 'gsap';
import type { PageContent } from '@shared/types';
import { reducedMotion } from './boot';
import { initCursor } from './motion';
import './chrome.css';

const SKIP_KEY = 'hos_preloaded';

const OUTLETS: { label: string; href: string }[] = [
  { label: 'Publishing', href: '/publishing' },
  { label: 'Photography', href: '/photography' },
  { label: 'Learning Design', href: '/learning-design' },
];

export interface ChromeHandle {
  /** Resolves when the preloader intro completes (immediately when skipped). */
  done: Promise<void>;
  /** Lift the preloader away and begin watching sections for the index stamp. */
  reveal(): void;
}

export function initChrome(page: PageContent): ChromeHandle {
  buildNav();
  buildStamps(page);
  initCursor();

  const preloader = buildPreloader();
  const done = playPreloader(preloader);

  return {
    done,
    reveal() {
      liftPreloader(preloader);
      watchSections();
    },
  };
}

/* ---------------------------------------------------------------- nav */

function buildNav(): void {
  const nav = document.createElement('header');
  nav.className = 'chrome-nav';
  nav.setAttribute('aria-label', 'Primary');

  const wordmark = document.createElement('a');
  wordmark.className = 'chrome-nav__mark';
  wordmark.href = '/';
  wordmark.dataset.cursor = 'link';
  wordmark.innerHTML = `<span>Hope On</span><span class="chrome-nav__mark-em">— Studio</span>`;

  const links = document.createElement('nav');
  links.className = 'chrome-nav__links';
  for (const o of OUTLETS) {
    const a = document.createElement('a');
    a.className = 'chrome-nav__link';
    a.href = o.href;
    a.textContent = o.label;
    a.dataset.cursor = 'link';
    links.append(a);
  }
  const cta = document.createElement('a');
  cta.className = 'chrome-nav__cta';
  cta.href = '#contact';
  cta.textContent = 'Enquire';
  cta.dataset.cursor = 'link';
  links.append(cta);

  nav.append(wordmark, links);
  document.body.prepend(nav);
}

/* ------------------------------------------------------------- stamps */

function buildStamps(page: PageContent): void {
  const left = document.createElement('div');
  left.className = 'chrome-stamp chrome-stamp--bl';
  left.textContent = 'Est. 2026';

  const right = document.createElement('div');
  right.className = 'chrome-stamp chrome-stamp--br';
  right.dataset.stampIndex = 'true';
  const total = String(page.blocks.length).padStart(2, '0');
  right.innerHTML = `<span class="chrome-stamp__n">01</span><span class="chrome-stamp__sep">/</span><span class="chrome-stamp__total">${total}</span>`;

  document.body.append(left, right);
}

function watchSections(): void {
  const nEl = document.querySelector<HTMLElement>('[data-stamp-index] .chrome-stamp__n');
  if (!nEl) return;
  const sections = Array.from(document.querySelectorAll<HTMLElement>('#app > [data-block-id]'));
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const idx = sections.indexOf(entry.target as HTMLElement);
        if (idx >= 0) nEl.textContent = String(idx + 1).padStart(2, '0');
      }
    },
    { rootMargin: '-50% 0px -49% 0px', threshold: 0 },
  );
  sections.forEach((s) => observer.observe(s));
}

/* ---------------------------------------------------------- preloader */

function buildPreloader(): HTMLElement {
  const pre = document.createElement('div');
  pre.className = 'preloader';
  pre.setAttribute('role', 'presentation');

  const inner = document.createElement('div');
  inner.className = 'preloader__inner';

  const mark = document.createElement('div');
  mark.className = 'preloader__mark';
  const word = 'HOPE ON';
  for (const ch of word) {
    const s = document.createElement('span');
    s.className = 'preloader__ch';
    s.textContent = ch === ' ' ? ' ' : ch;
    mark.append(s);
  }

  const sub = document.createElement('div');
  sub.className = 'preloader__sub';
  sub.textContent = 'Studio';

  const rule = document.createElement('div');
  rule.className = 'preloader__rule';

  inner.append(mark, rule, sub);
  pre.append(inner);
  document.body.append(pre);
  return pre;
}

function playPreloader(pre: HTMLElement): Promise<void> {
  const skip = safeSession('get', SKIP_KEY) === '1';

  if (skip || reducedMotion) {
    // Already seen this session (or reduced motion): a whisper, not a show.
    return new Promise((resolve) => {
      gsap.set(pre, { autoAlpha: 1 });
      gsap.to(pre, { autoAlpha: 0, duration: 0.4, ease: 'power2.out', delay: skip ? 0 : 0.25 });
      gsap.delayedCall(skip ? 0.05 : 0.35, () => {
        pre.style.pointerEvents = 'none';
        resolve();
      });
    });
  }

  safeSession('set', SKIP_KEY, '1');
  const chars = pre.querySelectorAll('.preloader__ch');
  const rule = pre.querySelector('.preloader__rule');
  const sub = pre.querySelector('.preloader__sub');

  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: () => resolve() });
    tl.set(pre, { autoAlpha: 1 })
      .from(chars, {
        yPercent: 120,
        autoAlpha: 0,
        duration: 0.9,
        stagger: 0.045,
        ease: 'power3.out',
      })
      .from(rule, { scaleX: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.35')
      .from(sub, { autoAlpha: 0, y: 10, duration: 0.6, ease: 'power2.out' }, '-=0.45')
      .to({}, { duration: 0.18 });
  });
}

function liftPreloader(pre: HTMLElement): void {
  pre.style.pointerEvents = 'none';
  gsap.to(pre, {
    yPercent: -100,
    duration: reducedMotion ? 0.01 : 1,
    ease: 'expo.inOut',
    onComplete: () => pre.remove(),
  });
}

/* --------------------------------------------------------------- util */

function safeSession(op: 'get' | 'set', key: string, val?: string): string | null {
  try {
    if (op === 'set') {
      sessionStorage.setItem(key, val ?? '');
      return null;
    }
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
