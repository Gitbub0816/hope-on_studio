/**
 * marquee — infinite horizontal loop of studio phrases at low contrast
 * (v1_sheet_06 "LATEST AND UPDATES"). Phrases joined by a champagne ornament,
 * thin rules above and below. Uses motion's marquee() for the loop.
 */
import type { MarqueeProps } from '@shared/types';
import type { BlockRenderer, Cleanup } from './contract';
import { el, blockRoot } from './contract';
import { marquee } from '../motion';
import './marquee.css';

const ORNAMENT = '❋';

export const marqueeBlock: BlockRenderer<MarqueeProps> = {
  type: 'marquee',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'marquee', type: 'marquee', props: {} }, 'ink');
    root.classList.add('marquee-section');

    const line = el('div', { class: 'marquee__line display' });
    props.phrases.forEach((phrase, i) => {
      line.append(el('span', { class: 'marquee__word', 'data-edit': `phrases.${i}` }, [phrase]));
      line.append(el('span', { class: 'marquee__orn', 'aria-hidden': 'true' }, [` ${ORNAMENT} `]));
    });

    root.append(
      el('hr', { class: 'rule' }),
      el('div', { class: 'marquee__wrap' }, [line]),
      el('hr', { class: 'rule' }),
    );
    return root;
  },

  mount(root): Cleanup {
    const line = root.querySelector<HTMLElement>('.marquee__line')!;
    marquee(line);
    return () => {};
  },
};
