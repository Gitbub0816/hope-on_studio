/**
 * Shared helpers for the motion layer. Kept tiny and dependency-free
 * (besides gsap.utils) so every module can import without cycles.
 */
import gsap from 'gsap';

/** Live check — call at animation time, not just once at module load. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

/** Query helper that returns a real array (possibly empty) scoped to `root`. */
export function qAll<T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] {
  return gsap.utils.toArray<T>(selector, root as unknown as HTMLElement);
}

export function q<T extends Element = HTMLElement>(root: ParentNode, selector: string): T | null {
  return root.querySelector<T>(selector);
}
