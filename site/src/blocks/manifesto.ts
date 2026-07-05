/**
 * manifesto — cream-ground statement of practice. Kicker, a ghost-duplicated
 * heading (v1_sheet_02 "ABOUT US / ABOUT US"), measure-width prose, thin rule.
 * Entrance choreography reveals it as the polarity flips ink → cream.
 */
import type { ManifestoProps } from '@shared/types';
import type { BlockRenderer, Cleanup } from './contract';
import { el, blockRoot } from './contract';
import { entrance, ghostHeading } from '../motion';
import './manifesto.css';

export const manifesto: BlockRenderer<ManifestoProps> = {
  type: 'manifesto',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'manifesto', type: 'manifesto', props: {} }, 'cream');
    root.classList.add('manifesto');

    const kicker = el('p', { class: 'kicker', 'data-edit': 'kicker' }, [props.kicker]);
    const heading = el('h2', { class: 'manifesto__heading', 'data-edit': 'heading' }, [
      props.heading,
    ]);

    const prose = el('div', { class: 'manifesto__prose', 'data-edit': 'body' });
    props.body.split('\n\n').forEach((para) => {
      prose.append(el('p', { class: 'manifesto__p' }, [para]));
    });

    const lead = el('div', { class: 'manifesto__lead' }, [kicker, heading]);
    const body = el('div', { class: 'manifesto__body' }, [prose]);

    if (props.accent === 'rule') {
      body.prepend(el('hr', { class: 'rule manifesto__rule' }));
    }

    const inner = el('div', { class: 'section-inner manifesto__grid' }, [lead, body]);
    root.append(inner);
    return root;
  },

  mount(root): Cleanup {
    const heading = root.querySelector<HTMLElement>('.manifesto__heading');
    if (heading) ghostHeading(heading);
    entrance(root);
    return () => {};
  },
};
