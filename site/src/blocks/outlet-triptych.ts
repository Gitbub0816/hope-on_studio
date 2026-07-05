/**
 * outlet-triptych — the heart of the landing. Three tall panels (Publishing,
 * Photography, Learning Design). Each: a huge ghost index numeral, title,
 * whisper tagline, and a particle image. On hover (desktop) the panel's image
 * assembles further, a signature bloom unfurls behind its title, and siblings
 * dim. On mobile the image is scroll-scrubbed. Each panel links to its page.
 */
import type { TriptychProps, TriptychPanel } from '@shared/types';
import type { BlockRenderer, Cleanup, RenderCtx } from './contract';
import { el, blockRoot } from './contract';
import { entrance } from '../motion';
import type { BloomHandle } from '../engine';
import './outlet-triptych.css';

const HREF: Record<TriptychPanel['outlet'], string> = {
  publishing: '/publishing',
  photography: '/photography',
  'learning-design': '/learning-design',
};

const hoverCapable = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const outletTriptych: BlockRenderer<TriptychProps> = {
  type: 'outlet-triptych',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'triptych', type: 'outlet-triptych', props: {} }, 'ink');
    root.classList.add('triptych');

    const head = el('div', { class: 'triptych__head' }, [
      el('p', { class: 'kicker', 'data-edit': 'kicker' }, [props.kicker]),
    ]);

    const grid = el('div', { class: 'triptych__grid' });

    props.panels.forEach((panel, i) => {
      const idx = String(i + 1).padStart(2, '0');
      const num = el('span', { class: 'triptych__num display', 'aria-hidden': 'true' }, [idx]);

      const canvas = el('div', { class: 'triptych__canvas', 'aria-hidden': 'true' });
      const img = el('img', {
        class: 'triptych__img',
        src: panel.image.src,
        alt: panel.image.alt,
        'data-edit-img': `panels.${i}.image`,
        loading: 'lazy',
        decoding: 'async',
      });
      canvas.append(img);
      const media = el('div', { class: 'triptych__media' }, [canvas]);

      const bloomHost = el('div', {
        class: 'triptych__bloom',
        'aria-hidden': 'true',
        'data-bloom': panel.bloom,
      });
      const title = el('h3', { class: 'triptych__title', 'data-edit': `panels.${i}.title` }, [
        panel.title,
      ]);
      const tag = el('p', { class: 'triptych__tag whisper', 'data-edit': `panels.${i}.tagline` }, [
        panel.tagline,
      ]);
      const caption = el('div', { class: 'triptych__caption' }, [bloomHost, title, tag]);

      const enter = el('span', { class: 'triptych__enter meta' }, ['Enter']);

      const link = el(
        'a',
        {
          class: 'triptych__panel',
          href: HREF[panel.outlet],
          'data-cursor': 'link',
          'data-cursor-badge': 'ENTER',
          'aria-label': `${panel.title} — ${panel.tagline}`,
        },
        [num, media, caption, enter],
      );
      grid.append(link);
    });

    root.append(el('div', { class: 'section-inner' }, [head, grid]));
    return root;
  },

  mount(root, props, ctx: RenderCtx): Cleanup {
    const panels = Array.from(root.querySelectorAll<HTMLElement>('.triptych__panel'));
    const disposers: (() => void)[] = [];
    const canHover = hoverCapable();
    let alive = true;

    import('../engine')
      .then(({ particleImage, bloom }) => {
        if (!alive) return;
        panels.forEach((panel, i) => {
          const host = panel.querySelector<HTMLElement>('.triptych__canvas')!;
          const bloomHost = panel.querySelector<HTMLElement>('.triptych__bloom')!;
          const hue = props.panels[i].bloom;

          if (canHover && !ctx.reducedMotion) {
            const rest = 0.72;
            const handle = particleImage(host, {
              src: props.panels[i].image.src,
              variant: 'assemble',
              palette: 'dark',
              progress: rest,
            });
            disposers.push(handle.destroy);

            let bloomHandle: BloomHandle | null = null;
            const onEnter = () => {
              handle.setProgress(1);
              if (!bloomHandle) {
                bloomHandle = bloom(bloomHost, {
                  hues: [hue, 'peony'],
                  intensity: 'grace-note',
                  trigger: 'immediate',
                });
              } else {
                bloomHandle.play();
              }
            };
            const onLeave = () => handle.setProgress(rest);
            panel.addEventListener('pointerenter', onEnter);
            panel.addEventListener('pointerleave', onLeave);
            disposers.push(() => {
              panel.removeEventListener('pointerenter', onEnter);
              panel.removeEventListener('pointerleave', onLeave);
              bloomHandle?.destroy();
            });
          } else {
            // Touch / reduced motion: scroll-scrubbed assembly, no bloom.
            const handle = particleImage(host, {
              src: props.panels[i].image.src,
              variant: 'assemble',
              palette: 'dark',
              ...(ctx.reducedMotion ? { progress: 1 } : {}),
            });
            disposers.push(handle.destroy);
          }
        });
      })
      .catch(() => {
        /* engine unavailable — static <img> fallbacks remain */
      });

    entrance(root);

    return () => {
      alive = false;
      disposers.forEach((d) => d());
    };
  },
};
