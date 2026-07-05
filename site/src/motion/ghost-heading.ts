/**
 * ghostHeading(el) — the "ABOUT US / ABOUT US" doubling from v1_sheet_02:
 * clone the heading text into a low-opacity echo behind it, offset down,
 * with a slight scroll-linked parallax lag.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './util';

export function ghostHeading(el: HTMLElement): void {
  const heading = el.matches('h1, h2, h3, .display') ? el : el.querySelector<HTMLElement>('h1, h2, h3, .display');
  if (!heading || heading.dataset.ghosted) return;
  heading.dataset.ghosted = 'true';

  const wrapper = document.createElement('div');
  wrapper.className = 'ghost-heading';
  heading.parentElement?.insertBefore(wrapper, heading);
  wrapper.appendChild(heading);

  const echo = heading.cloneNode(true) as HTMLElement;
  echo.classList.add('ghost-heading__echo');
  echo.setAttribute('aria-hidden', 'true');
  echo.removeAttribute('id');
  wrapper.appendChild(echo);

  if (prefersReducedMotion()) return;

  gsap.to(echo, {
    yPercent: 6,
    ease: 'none',
    scrollTrigger: {
      trigger: heading,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1,
    },
  });
}
