/**
 * scatter-words — v1's exploded sentence. Words start scattered across the
 * viewport and assemble into reading order as the section scrubs through.
 * Emphasis words are set larger, in Cormorant italic (the "whisper").
 */
import type { ScatterWordsProps } from '@shared/types';
import type { BlockRenderer, Cleanup } from './contract';
import { el, blockRoot } from './contract';
import { scatterWords } from '../motion';
import './scatter-words.css';

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/gi, '');

export const scatterWordsBlock: BlockRenderer<ScatterWordsProps> = {
  type: 'scatter-words',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'scatter', type: 'scatter-words', props: {} }, 'ink');
    root.classList.add('scatter');

    const sentence = el(
      'p',
      { class: 'scatter__sentence display', 'data-edit': 'sentence' },
      [props.sentence],
    );

    root.append(el('div', { class: 'scatter__inner' }, [sentence]));
    return root;
  },

  mount(root, props): Cleanup {
    const sentence = root.querySelector<HTMLElement>('.scatter__sentence')!;
    scatterWords(sentence);

    const emphasis = new Set(props.emphasis.map(normalize));
    root.querySelectorAll<HTMLElement>('.scatter-word').forEach((w) => {
      if (emphasis.has(normalize(w.textContent ?? ''))) {
        w.classList.add('scatter-word--em', 'whisper');
      }
    });
    return () => {};
  },
};
