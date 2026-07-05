/**
 * marquee(el) — seamless infinite horizontal loop of el's content ("LATEST AND
 * UPDATES" style). Duplicates content for the loop, ~40s period, pauses on
 * hover, and gets a subtle direction-aware nudge from scroll velocity.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './util';

const PERIOD = 40; // seconds for one full loop

export function marquee(el: HTMLElement): void {
  if (el.dataset.marqueed) return;
  el.dataset.marqueed = 'true';
  el.classList.add('marquee');

  const original = document.createElement('div');
  original.className = 'marquee__set';
  original.append(...Array.from(el.childNodes));

  const track = document.createElement('div');
  track.className = 'marquee__track';
  track.append(original);
  el.append(track);

  if (prefersReducedMotion()) {
    // Static: show the content once, no duplication, no motion.
    return;
  }

  const clone = original.cloneNode(true) as HTMLElement;
  clone.setAttribute('aria-hidden', 'true');
  track.append(clone);

  let tween: gsap.core.Tween;

  const build = () => {
    tween?.kill();
    gsap.set(track, { x: 0 });
    const distance = original.getBoundingClientRect().width;
    tween = gsap.to(track, {
      x: -distance,
      duration: PERIOD,
      ease: 'none',
      repeat: -1,
    });
  };

  // Wait a frame so fonts/layout are settled before measuring width.
  requestAnimationFrame(build);
  window.addEventListener('resize', () => build());

  el.addEventListener('mouseenter', () => tween?.pause());
  el.addEventListener('mouseleave', () => tween?.play());

  // Subtle direction-aware nudge from scroll velocity.
  ScrollTrigger.create({
    trigger: el,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      if (!tween) return;
      const velocity = gsap.utils.clamp(-1, 1, self.getVelocity() / 2500);
      gsap.to(tween, { timeScale: 1 + velocity * 0.4, duration: 0.4, overwrite: true });
    },
    onLeave: () => tween && gsap.to(tween, { timeScale: 1, duration: 0.6, overwrite: true }),
    onLeaveBack: () => tween && gsap.to(tween, { timeScale: 1, duration: 0.6, overwrite: true }),
  });
}
