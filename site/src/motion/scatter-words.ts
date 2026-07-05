/**
 * scatterWords(el) — v1's "SUMMER TURNS THIS AREA INTO..." effect: words start
 * scattered across the viewport and fly to their natural reading position as
 * the section scrubs through the viewport. Sizes are handled by CSS classes
 * already present on the markup; we only move position/rotation.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { prefersReducedMotion } from './util';

export function scatterWords(el: HTMLElement): void {
  if (el.dataset.scattered) return;
  el.dataset.scattered = 'true';

  const split = SplitText.create(el, { type: 'words', wordsClass: 'scatter-word' });
  const words = split.words;
  if (!words.length) return;

  if (prefersReducedMotion()) {
    gsap.set(words, { autoAlpha: 1, x: 0, y: 0, rotation: 0 });
    return;
  }

  const vw = () => window.innerWidth / 100;
  const vh = () => window.innerHeight / 100;

  gsap.set(words, {
    x: () => gsap.utils.random(-40, 40) * vw(),
    y: () => gsap.utils.random(-30, 30) * vh(),
    rotation: () => gsap.utils.random(-8, 8),
  });

  gsap.to(words, {
    x: 0,
    y: 0,
    rotation: 0,
    ease: 'none',
    stagger: { each: 0.02, from: 'random' },
    scrollTrigger: {
      trigger: el,
      start: 'top 95%',
      end: 'top 15%',
      scrub: true,
    },
  });
}
