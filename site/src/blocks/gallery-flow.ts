/**
 * gallery-flow — mixed-size images floating at different scroll speeds with
 * slight rotation (v1_sheet_04). Halftone-treatment items render through the
 * particle engine; photo items are plain images. Asymmetric offset grid,
 * small-caps captions.
 */
import type { GalleryFlowProps, GalleryFlowItem } from '@shared/types';
import type { BlockRenderer, Cleanup } from './contract';
import { el, blockRoot } from './contract';
import { parallax } from '../motion';
import './gallery-flow.css';

const DEPTH: Record<GalleryFlowItem['size'], number> = {
  lg: -0.35,
  md: 0.35,
  sm: 0.6,
};

export const galleryFlow: BlockRenderer<GalleryFlowProps> = {
  type: 'gallery-flow',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'gallery', type: 'gallery-flow', props: {} }, 'cream');
    root.classList.add('gallery');

    const head = el('div', { class: 'gallery__head' }, [
      el('p', { class: 'kicker', 'data-edit': 'kicker' }, [props.kicker]),
    ]);

    const flow = el('div', { class: 'gallery__flow' });

    props.items.forEach((item, i) => {
      const frame = el('div', { class: `gallery__frame gallery__frame--${item.treatment}` });
      const img = el('img', {
        class: 'gallery__img',
        src: item.image.src,
        alt: item.image.alt,
        'data-edit-img': `items.${i}.image`,
        loading: 'lazy',
        decoding: 'async',
      });
      if (item.treatment === 'halftone') {
        const canvas = el('div', { class: 'gallery__canvas', 'aria-hidden': 'true' }, [img]);
        frame.append(canvas);
      } else {
        frame.append(img);
      }

      const caption = el('figcaption', { class: 'meta gallery__caption' }, [
        `${String(i + 1).padStart(2, '0')} — ${item.image.alt}`,
      ]);

      const figure = el(
        'figure',
        {
          class: `gallery__item gallery__item--${item.size} gallery__item--${item.treatment}`,
          'data-rotate': String(item.rotation ?? 0),
        },
        [frame, caption],
      );
      flow.append(figure);
    });

    root.append(el('div', { class: 'section-inner' }, [head, flow]));
    return root;
  },

  mount(root, props): Cleanup {
    const items = Array.from(root.querySelectorAll<HTMLElement>('.gallery__item'));
    const disposers: (() => void)[] = [];
    let alive = true;

    items.forEach((item, i) => {
      parallax(item, DEPTH[props.items[i].size] ?? 0);
    });

    const halftones = props.items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => it.treatment === 'halftone');

    if (halftones.length) {
      import('../engine')
        .then(({ particleImage }) => {
          if (!alive) return;
          halftones.forEach(({ it, i }) => {
            const host = items[i].querySelector<HTMLElement>('.gallery__canvas');
            if (!host) return;
            const handle = particleImage(host, {
              src: it.image.src,
              variant: 'assemble',
              palette: 'auto',
            });
            disposers.push(handle.destroy);
          });
        })
        .catch(() => {
          /* engine unavailable — static <img> fallbacks remain */
        });
    }

    return () => {
      alive = false;
      disposers.forEach((d) => d());
    };
  },
};
