/**
 * initCursor() — custom cursor: a 6px dot following instantly, a 28px ring
 * following with lag, scaling over [data-cursor="link"] elements and
 * morphing into a small rotating circular-text badge over
 * [data-cursor-badge] elements. No-op on touch devices.
 */
import gsap from 'gsap';
import { isTouchDevice, prefersReducedMotion } from './util';

let started = false;

const BADGE_PATH_ID = 'cursor-badge-path';

export function initCursor(): void {
  if (started || isTouchDevice() || prefersReducedMotion()) return;
  started = true;

  document.documentElement.classList.add('has-custom-cursor');

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';

  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.innerHTML = `
    <svg class="cursor-ring__badge" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <path id="${BADGE_PATH_ID}" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
      </defs>
      <text class="cursor-ring__badge-text">
        <textPath href="#${BADGE_PATH_ID}" startOffset="0%"></textPath>
      </text>
    </svg>
  `;

  document.body.append(dot, ring);

  const badgeSvg = ring.querySelector<SVGSVGElement>('.cursor-ring__badge')!;
  const badgeText = ring.querySelector<SVGTextPathElement>('textPath')!;
  let badgeSpin: gsap.core.Tween | null = null;

  const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' });
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });

  const onMove = (e: PointerEvent) => {
    dotX(e.clientX);
    dotY(e.clientY);
    ringX(e.clientX);
    ringY(e.clientY);
  };
  window.addEventListener('pointermove', onMove);

  const onEnterDoc = () => {
    gsap.to([dot, ring], { autoAlpha: 1, duration: 0.2 });
  };
  const onLeaveDoc = () => {
    gsap.to([dot, ring], { autoAlpha: 0, duration: 0.2 });
  };
  document.addEventListener('mouseenter', onEnterDoc);
  document.addEventListener('mouseleave', onLeaveDoc);

  const setBadge = (target: HTMLElement | null) => {
    if (target) {
      const label = target.dataset.cursorBadge ?? '';
      badgeText.textContent = label ? ` ${label} •`.repeat(6) : '';
      ring.classList.add('cursor-ring--badge');
      if (!badgeSpin) {
        badgeSpin = gsap.to(badgeSvg, {
          rotation: 360,
          duration: 9,
          ease: 'none',
          repeat: -1,
          transformOrigin: '50% 50%',
        });
      }
    } else {
      ring.classList.remove('cursor-ring--badge');
      badgeSpin?.kill();
      badgeSpin = null;
    }
  };

  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    const badgeTarget = target.closest<HTMLElement>('[data-cursor-badge]');
    const linkTarget = target.closest<HTMLElement>('[data-cursor="link"]');
    ring.classList.toggle('cursor-ring--link', !!linkTarget && !badgeTarget);
    if (badgeTarget) setBadge(badgeTarget);
  });

  document.addEventListener('mouseout', (e) => {
    const related = e.relatedTarget as HTMLElement | null;
    const target = e.target as HTMLElement;
    const leavingBadge = target.closest<HTMLElement>('[data-cursor-badge]');
    const leavingLink = target.closest<HTMLElement>('[data-cursor="link"]');
    if (leavingBadge && !related?.closest?.('[data-cursor-badge]')) setBadge(null);
    if (leavingLink && !related?.closest?.('[data-cursor="link"]')) {
      ring.classList.remove('cursor-ring--link');
    }
  });
}
