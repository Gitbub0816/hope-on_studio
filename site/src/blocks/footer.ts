/**
 * footer — the closing whisper. A thin top rule, the sign-off line, a meta
 * stamp, and a single petal grace-note (a reserved bloom, blink-and-miss it)
 * drifting past as the page ends.
 */
import type { FooterProps } from '@shared/types';
import type { BlockRenderer, Cleanup } from './contract';
import { el, blockRoot } from './contract';
import './footer.css';

export const footer: BlockRenderer<FooterProps> = {
  type: 'footer',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'footer', type: 'footer', props: {} }, 'ink');
    root.classList.add('footer');

    const petal = el('div', { class: 'footer__petal', 'aria-hidden': 'true' });
    const line = el('p', { class: 'footer__line whisper', 'data-edit': 'line' }, [props.line]);
    const meta = el('p', { class: 'footer__meta meta', 'data-edit': 'meta' }, [props.meta]);

    const inner = el('div', { class: 'section-inner footer__inner' }, [petal, line, meta]);
    root.append(el('hr', { class: 'rule' }), inner);
    return root;
  },

  mount(root): Cleanup {
    const host = root.querySelector<HTMLElement>('.footer__petal')!;
    let destroy: (() => void) | undefined;
    let alive = true;

    import('../engine')
      .then(({ bloom }) => {
        if (!alive) return;
        const handle = bloom(host, {
          hues: ['peony'],
          intensity: 'grace-note',
          trigger: 'scroll',
        });
        destroy = handle.destroy;
      })
      .catch(() => {
        /* engine unavailable — the footer is simply quiet */
      });

    return () => {
      alive = false;
      destroy?.();
    };
  },
};
