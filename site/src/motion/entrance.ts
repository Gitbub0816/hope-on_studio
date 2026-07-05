/**
 * entrance(el, opts) — auto-choreographed section reveal:
 * kicker fades up -> heading lines/words cascade -> rule draws in -> media reveals.
 * Skips any step whose piece is missing. Plays once on scroll into view.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { prefersReducedMotion, qAll } from './util';

export interface EntranceOpts {
  delay?: number;
}

export function entrance(el: HTMLElement, opts: EntranceOpts = {}): void {
  const kicker = qAll(el, '.kicker');
  const heading = el.querySelector<HTMLElement>('h1, h2, h3');
  const rules = qAll(el, '.rule');
  const media = qAll(el, 'img, picture, canvas').filter((node) => {
    // Don't double-animate media that lives inside the heading itself.
    return !heading || !heading.contains(node);
  });

  if (!kicker.length && !heading && !rules.length && !media.length) return;

  const reduced = prefersReducedMotion();

  if (reduced) {
    const all = [...kicker, ...(heading ? [heading] : []), ...rules, ...media];
    if (all.length) {
      gsap.set(all, { clearProps: 'all' });
      gsap.from(all, {
        autoAlpha: 0,
        duration: 0.4,
        stagger: 0.05,
        ease: 'power1.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        delay: opts.delay ?? 0,
      });
    }
    return;
  }

  let split: SplitText | undefined;
  const tl = gsap.timeline({
    delay: opts.delay ?? 0,
    scrollTrigger: { trigger: el, start: 'top 82%', once: true },
    onComplete: () => split?.revert(),
  });

  if (kicker.length) {
    tl.from(kicker, { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power3.out' }, 0);
  }

  if (heading) {
    split = SplitText.create(heading, { type: 'lines,words', mask: 'lines' });
    tl.from(
      split.words,
      {
        yPercent: 110,
        autoAlpha: 0,
        duration: 1.1,
        stagger: 0.06,
        ease: 'power3.out',
      },
      kicker.length ? '-=0.25' : 0,
    );
  }

  if (rules.length) {
    gsap.set(rules, { transformOrigin: 'left center' });
    tl.from(
      rules,
      { scaleX: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08 },
      heading ? '-=0.55' : kicker.length ? '-=0.2' : 0,
    );
  }

  if (media.length) {
    tl.from(
      media,
      { autoAlpha: 0, y: 24, duration: 0.9, ease: 'power3.out', stagger: 0.08 },
      rules.length || heading ? '-=0.35' : 0,
    );
  }
}
