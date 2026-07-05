/**
 * Block palette — the "+ Add block" modal. Lists every block type with a short
 * description, pulled from the catalog. Choosing one inserts a block with
 * sensible in-voice default props at the requested index.
 */
import type { Block } from '@shared/types';
import { CATALOG } from '../catalog';
import { h, uid } from '../util';

export interface PaletteDeps {
  onChoose(block: Block, index: number): void;
}

export class Palette {
  readonly el: HTMLElement;
  private deps: PaletteDeps;
  private index = 0;
  private grid: HTMLElement;

  constructor(deps: PaletteDeps) {
    this.deps = deps;
    this.grid = h('div', { class: 'palette__grid' });

    const modal = h('div', { class: 'palette__modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Add a block' }, [
      h('div', { class: 'palette__head' }, [
        h('p', { class: 'palette__eyebrow kicker' }, ['Compose']),
        h('h2', { class: 'palette__title' }, ['Add a block']),
        h('p', { class: 'palette__sub whisper' }, ['Every piece arrives with placeholder words in the studio’s voice — edit them once it’s in place.']),
      ]),
      this.grid,
    ]);

    const close = h('button', { class: 'palette__close', type: 'button', 'aria-label': 'Close' }, ['✕']);
    close.addEventListener('click', () => this.hide());
    modal.append(close);

    this.el = h('div', { class: 'palette', role: 'presentation' }, [modal]);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.hide();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.el.classList.contains('is-open')) this.hide();
    });

    this.buildGrid();
    this.el.classList.remove('is-open');
  }

  private buildGrid(): void {
    for (const entry of CATALOG) {
      const card = h('button', { class: 'palette__card', type: 'button' }, [
        h('span', { class: 'palette__card-name' }, [entry.label]),
        h('span', { class: 'palette__card-desc whisper' }, [entry.description]),
      ]);
      card.addEventListener('click', () => {
        const block: Block = { id: uid(entry.type), type: entry.type, props: entry.makeDefault() };
        this.deps.onChoose(block, this.index);
        this.hide();
      });
      this.grid.append(card);
    }
  }

  open(index: number): void {
    this.index = index;
    this.el.classList.add('is-open');
  }

  hide(): void {
    this.el.classList.remove('is-open');
  }
}
