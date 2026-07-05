/**
 * The polarity flip — video 1's signature ground crossfade, recalibrated for
 * "Light Sage World" (owner redirect, DESIGN.md top banner): both grounds are
 * now LIGHT — a near-white sage (`--cream`) and a deeper sage tint
 * (`--sage-tint`). Sections still declare `data-ground="ink|cream"` and keep
 * transparent backgrounds; we tween `document.body`'s background-color as
 * each section's top crosses 60% of the viewport, and stamp
 * `body.dataset.ground` so fixed chrome (nav, cursor) can flip its own
 * tokens via CSS. The mechanics are unchanged — only the two target colors
 * moved from ink/cream to the two light sage tints.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './util';

// Resolved values of site/src/styles/tokens.css's --sage-tint / --cream.
// Hardcoded (not read live) because GSAP tweens body.style.backgroundColor
// directly and needs concrete color strings to interpolate between.
const GROUND_COLOR: Record<string, string> = {
  ink: '#e4ebda', // --sage-tint — the deeper light ground
  cream: '#f3f6ef', // --cream — the near-white base ground
};

let currentGround: string | null = null;

function flipTo(ground: string): void {
  if (ground === currentGround || !GROUND_COLOR[ground]) return;
  currentGround = ground;
  document.body.dataset.ground = ground;
  gsap.to(document.body, {
    backgroundColor: GROUND_COLOR[ground],
    duration: 0.9,
    ease: 'expo.inOut',
    overwrite: 'auto',
  });
}

function flipInstant(ground: string): void {
  if (ground === currentGround || !GROUND_COLOR[ground]) return;
  currentGround = ground;
  document.body.dataset.ground = ground;
  gsap.set(document.body, { backgroundColor: GROUND_COLOR[ground] });
}

/** Smooth, scroll-driven polarity flips (GSAP + ScrollTrigger path). */
export function setupPolarity(): void {
  const sections = gsap.utils.toArray<HTMLElement>('[data-ground]');
  if (!sections.length) return;

  // Seed the initial ground from whichever section starts closest to the top.
  const first = sections[0];
  if (first?.dataset.ground) flipInstant(first.dataset.ground);

  sections.forEach((section) => {
    const ground = section.dataset.ground;
    if (!ground) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 60%',
      end: 'bottom 60%',
      onEnter: () => flipTo(ground),
      onEnterBack: () => flipTo(ground),
    });
  });
}

/** Reduced-motion fallback: instant flips via IntersectionObserver, no Lenis/GSAP scrub. */
export function setupPolarityReduced(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-ground]'));
  if (!sections.length) return;

  const first = sections[0];
  if (first?.dataset.ground) flipInstant(first.dataset.ground);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const ground = (entry.target as HTMLElement).dataset.ground;
        if (ground && entry.isIntersecting) flipInstant(ground);
      });
    },
    { rootMargin: '-60% 0px -39% 0px', threshold: 0 },
  );
  sections.forEach((section) => observer.observe(section));
}

export function isReducedPolarityActive(): boolean {
  return prefersReducedMotion();
}
