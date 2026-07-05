/**
 * parallax(el, depth) — scroll parallax band. depth -1..1 maps to a
 * yPercent range of ±12%; an optional data-rotate attribute on el adds a
 * scroll-scrubbed rotation drift (video 2/3's floating rotated imagery).
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './util';

export function parallax(el: HTMLElement, depth: number): void {
  const clampedDepth = gsap.utils.clamp(-1, 1, depth);
  const yPercent = gsap.utils.mapRange(-1, 1, -12, 12, clampedDepth);
  const rotate = el.dataset.rotate ? Number(el.dataset.rotate) : 0;

  if (prefersReducedMotion()) {
    gsap.set(el, { yPercent: 0, rotation: 0 });
    return;
  }

  gsap.fromTo(
    el,
    { yPercent: -yPercent, rotation: 0 },
    {
      yPercent,
      rotation: rotate,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    },
  );
}
