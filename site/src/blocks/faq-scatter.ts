/**
 * faq-scatter — the "F A Q" letters scattered wide (v1_sheet_06), then an
 * elegant accordion: each question in Fraunces with a thin rule beneath;
 * answers reveal with height + fade.
 */
import type { FaqScatterProps } from '@shared/types';
import type { BlockRenderer, Cleanup } from './contract';
import { el, blockRoot } from './contract';
import { scatterWords } from '../motion';
import './faq-scatter.css';

export const faqScatter: BlockRenderer<FaqScatterProps> = {
  type: 'faq-scatter',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'faq', type: 'faq-scatter', props: {} }, 'cream');
    root.classList.add('faq');

    const kicker = el('p', { class: 'kicker', 'data-edit': 'kicker' }, [props.kicker]);
    const title = el(
      'div',
      { class: 'faq__title display', 'aria-label': 'FAQ', role: 'heading', 'aria-level': '2' },
      ['F A Q'],
    );
    const head = el('div', { class: 'faq__head' }, [kicker, title]);

    const list = el('div', { class: 'faq__list' });
    props.items.forEach((item, i) => {
      const qText = el('h3', { class: 'faq__q-text', 'data-edit': `items.${i}.q` }, [item.q]);
      const icon = el('span', { class: 'faq__icon', 'aria-hidden': 'true' });
      const btn = el(
        'button',
        {
          class: 'faq__q',
          type: 'button',
          'aria-expanded': 'false',
          'data-cursor': 'link',
        },
        [qText, icon],
      );

      const answer = el('div', { class: 'faq__a' }, [
        el('p', { class: 'faq__a-text', 'data-edit': `items.${i}.a` }, [item.a]),
      ]);
      const wrap = el('div', { class: 'faq__a-wrap' }, [answer]);

      const row = el('div', { class: 'faq__item' }, [btn, wrap, el('hr', { class: 'rule' })]);
      list.append(row);
    });

    root.append(el('div', { class: 'section-inner faq__grid' }, [head, list]));
    return root;
  },

  mount(root): Cleanup {
    const title = root.querySelector<HTMLElement>('.faq__title');
    if (title) scatterWords(title);

    const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('.faq__q'));
    const handlers: (() => void)[] = [];
    btns.forEach((btn) => {
      const item = btn.closest('.faq__item')!;
      const toggle = () => {
        const open = item.classList.toggle('faq__item--open');
        btn.setAttribute('aria-expanded', String(open));
      };
      btn.addEventListener('click', toggle);
      handlers.push(() => btn.removeEventListener('click', toggle));
    });

    return () => handlers.forEach((h) => h());
  },
};
