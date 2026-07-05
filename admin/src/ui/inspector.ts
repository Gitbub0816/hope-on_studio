/**
 * Inspector — the right-hand panel. Per-block editable props bound to the
 * shared/types shapes via the catalog schema, plus Duplicate / Delete.
 * Rebuilds on selection or structural change; refreshes values on undo/redo
 * only when nothing inside it is focused (so typing is never interrupted).
 */
import type { Block } from '@shared/types';
import type { EditorStore, EditorState } from '../store';
import type { CatalogEntry, Field } from '../catalog';
import { catalogFor } from '../catalog';
import { getByPath, h } from '../util';

export interface InspectorDeps {
  store: EditorStore;
  onEdit(blockId: string, path: string, value: unknown): void;
  onDelete(blockId: string): void;
  onDuplicate(blockId: string): void;
  onSwapImage(blockId: string, path: string): void;
}

export class Inspector {
  readonly el: HTMLElement;
  private deps: InspectorDeps;
  private body: HTMLElement;
  private lastSelected: string | null = null;
  private lastStructure = -1;

  constructor(deps: InspectorDeps) {
    this.deps = deps;
    this.body = h('div', { class: 'insp__body' });
    this.el = h('aside', { class: 'insp', 'aria-label': 'Block inspector' }, [this.body]);
    this.renderEmpty();
  }

  reflect(state: EditorState): void {
    const selectionChanged = state.selectedId !== this.lastSelected;
    const structureChanged = state.structureRev !== this.lastStructure;
    const focusedInside = this.el.contains(document.activeElement);
    if (!selectionChanged && !structureChanged && focusedInside) return;
    this.lastSelected = state.selectedId;
    this.lastStructure = state.structureRev;
    const block = state.draft.blocks.find((b) => b.id === state.selectedId) ?? null;
    if (!block) this.renderEmpty();
    else this.renderBlock(block);
  }

  private renderEmpty(): void {
    this.body.innerHTML = '';
    this.body.append(
      h('div', { class: 'insp__empty' }, [
        h('p', { class: 'insp__eyebrow kicker' }, ['Inspector']),
        h('p', { class: 'insp__hint whisper' }, [
          'Select any section in the preview to edit its words, images, and arrangement.',
        ]),
      ]),
    );
  }

  private renderBlock(block: Block): void {
    const entry = catalogFor(block.type);
    this.body.innerHTML = '';

    const head = h('div', { class: 'insp__head' }, [
      h('p', { class: 'insp__eyebrow kicker' }, ['Editing']),
      h('h2', { class: 'insp__title' }, [entry?.label ?? block.type]),
      entry?.description ? h('p', { class: 'insp__desc whisper' }, [entry.description]) : h('span'),
    ]);
    this.body.append(head);

    if (!entry) {
      this.body.append(
        h('p', { class: 'insp__hint whisper' }, ['No editable schema for this block type.']),
      );
    } else {
      for (const field of entry.fields) {
        this.body.append(this.control(block, field, field.path));
      }
      for (const arr of entry.arrays) {
        const items = (getByPath(block.props, arr.path) as unknown[]) ?? [];
        const group = h('div', { class: 'insp__group' }, [
          h('p', { class: 'insp__group-label meta' }, [arr.label]),
        ]);
        items.forEach((_item, i) => {
          const card = h('div', { class: 'insp__item' }, [
            h('p', { class: 'insp__item-label meta' }, [arr.itemLabel(i)]),
          ]);
          for (const f of arr.fields) {
            card.append(this.control(block, f, `${arr.path}.${i}.${f.path}`));
          }
          group.append(card);
        });
        this.body.append(group);
      }
    }

    const actions = h('div', { class: 'insp__actions' }, [
      this.actionBtn('Duplicate', 'insp__dup', () => this.deps.onDuplicate(block.id)),
      this.actionBtn('Delete block', 'insp__del', () => this.deps.onDelete(block.id)),
    ]);
    this.body.append(actions);
  }

  private actionBtn(label: string, cls: string, onClick: () => void): HTMLElement {
    const b = h('button', { class: `insp__action ${cls}`, type: 'button' }, [label]);
    b.addEventListener('click', onClick);
    return b;
  }

  private control(block: Block, field: Field, path: string): HTMLElement {
    const value = getByPath(block.props, path);
    const wrap = h('label', { class: 'field' }, [
      h('span', { class: 'field__label meta' }, [field.label]),
    ]);

    if (field.kind === 'image') {
      const ref = (value as { src?: string; alt?: string }) ?? {};
      const preview = h('div', { class: 'field__img' });
      if (ref.src) {
        const img = document.createElement('img');
        img.src = ref.src;
        img.alt = ref.alt ?? '';
        preview.append(img);
      }
      const replace = h('button', { class: 'field__img-btn', type: 'button' }, ['Replace image']);
      replace.addEventListener('click', () => this.deps.onSwapImage(block.id, path));
      const alt = this.textInput(ref.alt ?? '', (v) =>
        this.deps.onEdit(block.id, `${path}.alt`, v),
      );
      alt.classList.add('field__alt');
      alt.setAttribute('placeholder', 'Describe this image (alt text)');
      wrap.append(preview, replace, alt);
      return wrap;
    }

    if (field.kind === 'select') {
      const sel = document.createElement('select');
      sel.className = 'field__control field__select';
      for (const opt of field.options ?? []) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        if (opt === value) o.selected = true;
        sel.append(o);
      }
      sel.addEventListener('change', () => this.deps.onEdit(block.id, path, sel.value));
      wrap.append(sel);
      return wrap;
    }

    if (field.kind === 'csv') {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const input = this.textInput(arr.join(', '), (v) =>
        this.deps.onEdit(
          block.id,
          path,
          v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      );
      wrap.append(input);
      if (field.help) wrap.append(h('span', { class: 'field__help whisper' }, [field.help]));
      return wrap;
    }

    if (field.kind === 'number') {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.5';
      input.className = 'field__control field__number';
      input.value = String(value ?? 0);
      input.addEventListener('change', () =>
        this.deps.onEdit(block.id, path, Number(input.value) || 0),
      );
      wrap.append(input);
      return wrap;
    }

    if (field.kind === 'textarea') {
      const ta = document.createElement('textarea');
      ta.className = 'field__control field__textarea';
      ta.rows = field.rows ?? 3;
      ta.value = String(value ?? '');
      ta.addEventListener('blur', () => this.deps.onEdit(block.id, path, ta.value));
      wrap.append(ta);
      if (field.help) wrap.append(h('span', { class: 'field__help whisper' }, [field.help]));
      return wrap;
    }

    // text
    const input = this.textInput(String(value ?? ''), (v) => this.deps.onEdit(block.id, path, v));
    wrap.append(input);
    if (field.help) wrap.append(h('span', { class: 'field__help whisper' }, [field.help]));
    return wrap;
  }

  private textInput(value: string, onCommit: (v: string) => void): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'field__control field__text';
    input.value = value;
    input.addEventListener('blur', () => onCommit(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
    return input;
  }
}
