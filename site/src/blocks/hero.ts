/**
 * hero — full-viewport opening. Giant two-line Fraunces title over a dimmed,
 * scroll-scrubbed particle image of the studio's bloom field (v1_sheet_01/02:
 * type sitting in front of a halftone scene). Kicker above, whisper subtitle
 * below, corner meta stamps, and a pulsing SCROLL indicator.
 */
import type { HeroProps } from '@shared/types';
import type { BlockRenderer, Cleanup, RenderCtx } from './contract';
import { el, blockRoot } from './contract';
import { entrance } from '../motion';
import './hero.css';

export const hero: BlockRenderer<HeroProps> = {
  type: 'hero',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'hero', type: 'hero', props: {} }, 'ink');
    root.classList.add('hero');

    // Particle host (fallback <img> underneath; engine canvas overlays it).
    const canvas = el('div', { class: 'hero__canvas', 'aria-hidden': 'true' });
    const img = el('img', {
      class: 'hero__img',
      src: props.image.src,
      alt: props.image.alt,
      'data-edit-img': 'image',
      loading: 'eager',
      decoding: 'async',
    });
    canvas.append(img);
    const scrim = el('div', { class: 'hero__scrim', 'aria-hidden': 'true' });

    const kicker = el('p', { class: 'kicker hero__kicker', 'data-edit': 'kicker' }, [props.kicker]);

    const title = el('h1', { class: 'hero__title display', 'data-edit': 'title' });
    props.title.split('\n').forEach((line) => {
      title.append(el('span', { class: 'hero__line' }, [line]));
    });

    const subtitle = el('p', { class: 'hero__subtitle whisper', 'data-edit': 'subtitle' }, [
      props.subtitle,
    ]);

    const inner = el('div', { class: 'hero__inner' }, [kicker, title, subtitle]);

    const metaLeft = el('div', { class: 'meta hero__meta hero__meta--left', 'data-edit': 'meta.left' }, [
      props.meta.left,
    ]);
    const metaRight = el(
      'div',
      { class: 'meta hero__meta hero__meta--right', 'data-edit': 'meta.right' },
      [props.meta.right],
    );

    const scroll = el('div', { class: 'hero__scroll', 'aria-hidden': 'true' }, [
      el('span', { class: 'hero__scroll-line' }),
      el('span', { class: 'hero__scroll-label' }, ['Scroll']),
    ]);

    root.append(canvas, scrim, inner, metaLeft, metaRight, scroll);
    return root;
  },

  mount(root, props, ctx: RenderCtx): Cleanup {
    const host = root.querySelector<HTMLElement>('.hero__canvas')!;
    let destroy: (() => void) | undefined;
    let alive = true;

    import('../engine')
      .then(({ particleImage }) => {
        if (!alive) return;
        const handle = particleImage(host, {
          src: props.image.src,
          variant: 'assemble',
          palette: 'dark',
        });
        destroy = handle.destroy;
      })
      .catch(() => {
        /* engine unavailable — the static <img> fallback stays visible */
      });

    // Title cascade + kicker/subtitle choreography. Runs once in view.
    entrance(root, { delay: ctx.reducedMotion ? 0 : 0.1 });

    return () => {
      alive = false;
      destroy?.();
    };
  },
};
