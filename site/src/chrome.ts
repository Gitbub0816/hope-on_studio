/**
 * Page chrome — "Light Sage World" (v2). Deliberately NOT a top bar.
 *
 *   · top-left  : stacked wordmark lockup — 'Hope On' in Fraunces italic over a
 *                 hand-drawn vine flourish that draws itself in, 'STUDIO' beneath.
 *   · right edge: a floating vertical rail of three leaf markers (one per outlet);
 *                 each opens a Fraunces-italic name pill leftward on hover/focus.
 *                 On mobile the rail collapses to a floral button that fans the
 *                 markers out in an arc.
 *   · bottom-left: a rotated 'Enquire' tab in antique gold that slides out on hover.
 *   · corner stamps: EST. 2026 + section index with a vine-teal scroll-progress tick.
 *   · one fixed, full-viewport ambient vines layer behind all content.
 *   · the ink preloader — choreography UNCHANGED (owner likes it); only its screen
 *     is pinned to --preloader-ink and it lifts away to reveal the light sage world.
 *
 * Page-agnostic: every page (landing + detail pages + 404) calls initChrome(page)
 * before rendering, then chrome.reveal() after render + initMotion.
 */
import gsap from 'gsap';
import type { PageContent } from '@shared/types';
import { reducedMotion } from './boot';
import { initCursor } from './motion';
import './chrome.css';

const SKIP_KEY = 'hos_preloaded';

/** Insert a chrome element into the tab order just before the page content
 *  (#app), so the primary nav is keyboard-reachable before the content. */
function mountBeforeApp(node: HTMLElement): void {
  const app = document.getElementById('app');
  if (app && app.parentNode) app.parentNode.insertBefore(node, app);
  else document.body.append(node);
}

interface Outlet {
  key: string;
  label: string;
  href: string;
  /** VINE hue for this outlet (DESIGN v2 — not the old bloom hues). */
  hue: string;
}

const OUTLETS: Outlet[] = [
  { key: 'publishing', label: 'Publishing', href: '/publishing', hue: 'var(--vine-violet)' },
  { key: 'photography', label: 'Photography', href: '/photography', hue: 'var(--vine-fuchsia)' },
  { key: 'learning-design', label: 'Learning Design', href: '/learning-design', hue: 'var(--vine-marigold)' },
];

export interface ChromeHandle {
  /** Resolves when the preloader intro completes (immediately when skipped). */
  done: Promise<void>;
  /** Lift the preloader away and begin watching sections for the index stamp. */
  reveal(): void;
}

export function initChrome(page: PageContent): ChromeHandle {
  mountVines();
  buildWordmark();
  buildRail(page);
  buildEnquire();
  buildStamps(page);
  initCursor();

  const preloader = buildPreloader();
  const done = playPreloader(preloader);

  return {
    done,
    reveal() {
      liftPreloader(preloader);
      watchSections();
      startScrollTick();
    },
  };
}

/* ------------------------------------------------------- ambient vines */

/** One fixed, full-viewport ambient vine layer behind all content. The engine
 *  module may still be landing — import defensively; the sage ground stands
 *  alone if it is absent, and the engine renders a static variant under
 *  reduced motion itself. */
function mountVines(): void {
  if (document.querySelector('.chrome-vines')) return;
  const host = document.createElement('div');
  host.className = 'chrome-vines';
  host.setAttribute('aria-hidden', 'true');
  document.body.prepend(host);

  import('./engine/vines')
    .then((mod) => {
      const layer = (mod as { vinesLayer?: unknown }).vinesLayer;
      if (typeof layer === 'function') {
        (layer as (h: HTMLElement, o?: unknown) => unknown)(host, {
          density: 'ambient',
          zone: 'full',
        });
      }
    })
    .catch(() => {
      /* vines engine not present yet — near-white sage ground stands alone */
    });
}

/* ---------------------------------------------------------- wordmark */

function buildWordmark(): void {
  const mark = document.createElement('a');
  mark.className = 'chrome-mark';
  mark.href = '/';
  mark.dataset.cursor = 'link';
  mark.setAttribute('aria-label', 'Hope On Studio — home');

  mark.innerHTML = `
    <span class="chrome-mark__word">Hope On</span>
    <svg class="chrome-mark__vine" viewBox="0 0 148 26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="hos-vine-grad" x1="0" y1="0" x2="148" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="var(--vine-fuchsia)"/>
          <stop offset="1" stop-color="var(--vine-violet)"/>
        </linearGradient>
      </defs>
      <path class="chrome-mark__stem" stroke="url(#hos-vine-grad)" stroke-width="1.6"
        stroke-linecap="round"
        d="M3 16 C 24 6 40 22 62 14 C 82 7 96 21 118 12 C 130 7 138 12 145 9"/>
      <path class="chrome-mark__leaf" stroke="url(#hos-vine-grad)" stroke-width="1.4"
        stroke-linecap="round" fill="none"
        d="M62 14 C 58 4 66 2 70 5 C 73 8 68 13 62 14 Z"/>
      <path class="chrome-mark__leaf" stroke="url(#hos-vine-grad)" stroke-width="1.4"
        stroke-linecap="round" fill="none"
        d="M118 12 C 120 3 128 4 129 8 C 130 12 124 14 118 12 Z"/>
    </svg>
    <span class="chrome-mark__studio">Studio</span>`;

  mountBeforeApp(mark);

  if (reducedMotion) return;
  const paths = mark.querySelectorAll<SVGPathElement>('path');
  const tl = gsap.timeline({ delay: 0.15 });
  paths.forEach((p, i) => {
    let len = 40;
    try {
      len = p.getTotalLength() || 40;
    } catch {
      /* jsdom / no layout — leave the fallback length */
    }
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    tl.to(
      p,
      { strokeDashoffset: 0, duration: i === 0 ? 1.1 : 0.5, ease: 'power2.out' },
      i === 0 ? 0 : '>-0.15',
    );
  });
}

/* -------------------------------------------------------------- rail */

function activeKey(page: PageContent): string | null {
  const bySlug = OUTLETS.find((o) => o.key === page.slug);
  if (bySlug) return bySlug.key;
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return OUTLETS.find((o) => o.href === path)?.key ?? null;
}

const LEAF_SVG = `<svg class="chrome-rail__leaf" viewBox="0 0 24 24" aria-hidden="true">
  <path class="chrome-rail__leaf-body" d="M12 2.5 C 4.5 7 4.5 17 12 21.5 C 19.5 17 19.5 7 12 2.5 Z"/>
  <path class="chrome-rail__leaf-vein" d="M12 4.5 L 12 20" />
</svg>`;

function buildRail(page: PageContent): void {
  const active = activeKey(page);

  const rail = document.createElement('nav');
  rail.className = 'chrome-rail';
  rail.setAttribute('aria-label', 'Outlets');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'chrome-rail__toggle';
  toggle.dataset.cursor = 'link';
  toggle.setAttribute('aria-label', 'Open outlets menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'chrome-rail-list');
  toggle.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true">
      <g class="chrome-rail__petals" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 16 C 16 8 12 5 16 3 C 20 5 16 8 16 16Z"/>
        <path d="M16 16 C 24 16 27 12 29 16 C 27 20 24 16 16 16Z"/>
        <path d="M16 16 C 16 24 20 27 16 29 C 12 27 16 24 16 16Z"/>
        <path d="M16 16 C 8 16 5 20 3 16 C 5 12 8 16 16 16Z"/>
      </g>
      <circle class="chrome-rail__pistil" cx="16" cy="16" r="2.6"/>
    </svg>`;

  const list = document.createElement('ul');
  list.className = 'chrome-rail__list';
  list.id = 'chrome-rail-list';

  for (const o of OUTLETS) {
    const li = document.createElement('li');
    li.className = 'chrome-rail__item';
    li.style.setProperty('--hue', o.hue);

    const a = document.createElement('a');
    a.className = 'chrome-rail__link';
    a.href = o.href;
    a.dataset.cursor = 'link';
    a.setAttribute('aria-label', o.label);
    if (active === o.key) a.setAttribute('aria-current', 'page');
    a.innerHTML = `<span class="chrome-rail__name">${o.label}</span>${LEAF_SVG}`;

    li.append(a);
    list.append(li);
  }

  rail.append(list, toggle);
  mountBeforeApp(rail);

  // Mobile fan: toggle expands/collapses the arc.
  const setOpen = (open: boolean): void => {
    rail.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close outlets menu' : 'Open outlets menu');
  };
  toggle.addEventListener('click', () => setOpen(!rail.classList.contains('is-open')));
  document.addEventListener('click', (e) => {
    if (!rail.classList.contains('is-open')) return;
    if (!rail.contains(e.target as Node)) setOpen(false);
  });
  rail.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rail.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
}

/* ----------------------------------------------------------- enquire */

function buildEnquire(): void {
  const a = document.createElement('a');
  a.className = 'chrome-enquire';
  a.href = '#contact';
  a.dataset.cursor = 'link';
  a.innerHTML = `<span class="chrome-enquire__label">Enquire</span>`;
  document.body.append(a);
}

/* ------------------------------------------------------------- stamps */

function buildStamps(page: PageContent): void {
  const est = document.createElement('div');
  est.className = 'chrome-stamp chrome-stamp--est';
  est.innerHTML = `<span>Hope On Studio</span><span class="chrome-stamp__dot">·</span><span>Est. 2026</span>`;

  const index = document.createElement('div');
  index.className = 'chrome-stamp chrome-stamp--index';
  index.dataset.stampIndex = 'true';
  const total = String(Math.max(page.blocks.length, 1)).padStart(2, '0');
  index.innerHTML =
    `<span class="chrome-stamp__tick" aria-hidden="true"><i class="chrome-stamp__tick-fill"></i></span>` +
    `<span class="chrome-stamp__n">01</span>` +
    `<span class="chrome-stamp__sep">/</span>` +
    `<span class="chrome-stamp__total">${total}</span>`;

  document.body.append(est, index);
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

/** Vine-teal tick beside the section index, filling with scroll progress.
 *  A state indicator (not decorative motion), so it updates under reduced
 *  motion too — it just reflects position, it does not animate on its own. */
function startScrollTick(): void {
  const fill = document.querySelector<HTMLElement>('.chrome-stamp__tick-fill');
  if (!fill) return;
  let ticking = false;
  const update = (): void => {
    ticking = false;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    fill.style.transform = `scaleY(${p})`;
  };
  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

/* ---------------------------------------------------------- preloader */
/* Choreography is intentionally unchanged (owner likes the start animation):
   letter cascade → rule draw → sub fade → lift. Only the screen colour is
   pinned to --preloader-ink, and it reveals the light sage world on lift. */

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
    s.textContent = ch === ' ' ? ' ' : ch;
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
