/**
 * quote-bloom — THE magic moment (DESIGN.md §3.1). Ink ground, full viewport.
 * The studio's founding line in large Fraunces, revealed line by line, while a
 * full floral bloom unfurls across the canvas layer behind it, then settles.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { QuoteBloomProps } from '@shared/types';
import type { BlockRenderer, Cleanup, RenderCtx } from './contract';
import { el, blockRoot } from './contract';
import './quote-bloom.css';

gsap.registerPlugin(ScrollTrigger);

export const quoteBloom: BlockRenderer<QuoteBloomProps> = {
  type: 'quote-bloom',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'quote', type: 'quote-bloom', props: {} }, 'ink');
    root.classList.add('quote');

    const canvas = el('div', { class: 'quote__canvas', 'aria-hidden': 'true' });

    const text = el('blockquote', { class: 'quote__text display', 'data-edit': 'quote' });
    props.quote.split('\n').forEach((line) => {
      const mask = el('span', { class: 'quote__line-mask' }, [
        el('span', { class: 'quote__line' }, [line]),
      ]);
      text.append(mask);
    });

    const inner = el('div', { class: 'quote__inner' }, [text]);
    if (props.attribution) {
      inner.append(
        el('cite', { class: 'quote__cite whisper', 'data-edit': 'attribution' }, [
          props.attribution,
        ]),
      );
    }

    root.append(canvas, inner);
    return root;
  },

  mount(root, props, ctx: RenderCtx): Cleanup {
    const host = root.querySelector<HTMLElement>('.quote__canvas')!;
    const lines = root.querySelectorAll<HTMLElement>('.quote__line');
    const cite = root.querySelector<HTMLElement>('.quote__cite');
    let destroy: (() => void) | undefined;
    let alive = true;

    import('../engine')
      .then(({ bloom }) => {
        if (!alive) return;
        const handle = bloom(host, {
          hues: ['peony', 'coral', 'iris', 'gold'],
          intensity: 'full',
          trigger: 'scroll',
        });
        destroy = handle.destroy;
      })
      .catch(() => {
        /* engine unavailable — text stands alone on ink */
      });

    if (ctx.reducedMotion) {
      gsap.from([...lines, ...(cite ? [cite] : [])], {
        autoAlpha: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power1.out',
        scrollTrigger: { trigger: root, start: 'top 80%', once: true },
      });
    } else {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: 'top 68%', once: true },
      });
      tl.from(lines, {
        yPercent: 115,
        autoAlpha: 0,
        duration: 1.2,
        stagger: 0.14,
        ease: 'power3.out',
      });
      if (cite) {
        tl.from(cite, { autoAlpha: 0, y: 16, duration: 0.8, ease: 'power2.out' }, '-=0.4');
      }
    }

    return () => {
      alive = false;
      destroy?.();
    };
  },
};
