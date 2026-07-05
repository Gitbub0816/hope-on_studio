/**
 * magnetic(el) — pointer-following translate up to 12px within an 80px
 * activation radius, elastic spring back on leave. No-op on touch devices.
 */
import gsap from 'gsap';
import { isTouchDevice, prefersReducedMotion } from './util';

const RADIUS = 80;
const MAX_TRANSLATE = 12;

export function magnetic(el: HTMLElement): void {
  if (isTouchDevice() || el.dataset.magnetic) return;
  el.dataset.magnetic = 'true';

  if (prefersReducedMotion()) return;

  const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });

  const onMove = (e: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < RADIUS) {
      const pull = 1 - dist / RADIUS;
      xTo(gsap.utils.clamp(-MAX_TRANSLATE, MAX_TRANSLATE, dx * 0.35 * pull));
      yTo(gsap.utils.clamp(-MAX_TRANSLATE, MAX_TRANSLATE, dy * 0.35 * pull));
    }
  };

  const onLeave = () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.35)' });
  };

  window.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
}
