/**
 * initMotion() — Lenis smooth scroll synced with GSAP ScrollTrigger, global
 * ScrollTrigger defaults, and the polarity flip watcher. Call once per page.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { prefersReducedMotion } from './util';
import { setupPolarity, setupPolarityReduced } from './polarity';

let started = false;
let lenis: Lenis | null = null;

export function initMotion(): void {
  if (started) return;
  started = true;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.defaults({ markers: false });

  if (prefersReducedMotion()) {
    // No Lenis, no scrub — native scroll + instant polarity via IntersectionObserver.
    setupPolarityReduced();
    return;
  }

  lenis = new Lenis({
    lerp: 0.08,
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  setupPolarity();
}

/** Exposed for reduced-motion-aware modules that want to re-check state (e.g. demo page). */
export function getLenis(): Lenis | null {
  return lenis;
}
