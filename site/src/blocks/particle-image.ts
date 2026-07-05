/**
 * particle-image — the "develop" moment (v1_sheet_02/03/05/06): a full-bleed
 * photograph rendered as halftone grain that assembles (or reveals through
 * vertical slats) as it scrolls into view. Ink ground. A small-caps caption
 * sits bottom-left like a contact-sheet stamp. Falls back to the plain <img>
 * if the engine can't load.
 */
import type { ParticleImageProps } from '@shared/types';
import type { BlockRenderer, Cleanup } from './contract';
import { el, blockRoot } from './contract';
import { entrance } from '../motion';
import './particle-image.css';

export const particleImage: BlockRenderer<ParticleImageProps> = {
  type: 'particle-image',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'particle-image', type: 'particle-image', props: {} }, 'ink');
    root.classList.add('particle-image', `particle-image--${props.height ?? 'full'}`);

    const canvas = el('div', { class: 'particle-image__canvas', 'aria-hidden': 'true' });
    const img = el('img', {
      class: 'particle-image__img',
      src: props.image.src,
      alt: props.image.alt,
      'data-edit-img': 'image',
      loading: 'lazy',
      decoding: 'async',
    });
    canvas.append(img);
    const scrim = el('div', { class: 'particle-image__scrim', 'aria-hidden': 'true' });

    const children: (Node | string)[] = [canvas, scrim];

    if (props.caption) {
      children.push(
        el('p', { class: 'meta particle-image__caption', 'data-edit': 'caption' }, [
          props.caption,
        ]),
      );
    }

    root.append(...children);
    return root;
  },

  mount(root, props): Cleanup {
    const host = root.querySelector<HTMLElement>('.particle-image__canvas')!;
    let destroy: (() => void) | undefined;
    let alive = true;

    import('../engine')
      .then(({ particleImage: mount }) => {
        if (!alive) return;
        const handle = mount(host, {
          src: props.image.src,
          variant: props.variant,
          palette: 'dark',
        });
        destroy = handle.destroy;
      })
      .catch(() => {
        /* engine unavailable — the static <img> fallback stays visible */
      });

    entrance(root);

    return () => {
      alive = false;
      destroy?.();
    };
  },
};
