/**
 * Inspector — the right-hand panel. Two tabs:
 *   • Content — per-block editable props (bound to the catalog schema), plus
 *     add / remove / reorder for every array (panels, gallery, faq, …).
 *   • Style — element-focused overrides bound to block.style (BlockStyle):
 *     background, text & accent colour, heading font, section spacing.
 * Rebuilds on selection or structural change; refreshes values on undo/redo
 * only when nothing inside it is focused (so typing is never interrupted).
 */
import type { Block, BlockStyle, FontKey } from '@shared/types';
import type { EditorStore, EditorState } from '../store';
import type { ArrayField, Field } from '../catalog';
import { catalogFor } from '../catalog';
import { FONTS } from '../../../site/src/fonts';
import { isHexColor, normalizeHex } from '../theme';
import { getByPath, h } from '../util';

export interface InspectorDeps {
  store: EditorStore;
  onEdit(blockId: string, path: string, value: unknown): void;
  onStyle(blockId: string, next: BlockStyle | undefined): void;
  onAddItem(blockId: string, arrPath: string): void;
  onRemoveItem(blockId: string, arrPath: string, index: number): void;
  onMoveItem(blockId: string, arrPath: string, from: number, to: number): void;
  onDelete(blockId: string): void;
  onDuplicate(blockId: string): void;
  onSwapImage(blockId: string, path: string): void;
}

type Tab = 'content' | 'style';

const SPACING: { value: 'cozy' | 'normal' | 'airy'; label: string; pad?: number }[] = [
  { value: 'cozy', label: 'Cozy', pad: 0.7 },
  { value: 'normal', label: 'Normal' },
  { value: 'airy', label: 'Airy', pad: 1.3 },
];

export class Inspector {
  readonly el: HTMLElement;
  private deps: InspectorDeps;
  private body: HTMLElement;
  private lastSelected: string | null = null;
  private lastStructure = -1;
  private tab: Tab = 'content';

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
    if (selectionChanged) this.tab = 'content'; // fresh block → start on Content
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

    // --- Tabs ---------------------------------------------------------------
    const contentPanel = h('div', { class: 'insp__panel' });
    const stylePanel = h('div', { class: 'insp__panel' });
    const tabs = h('div', { class: 'insp__tabs', role: 'tablist' });
    const mkTab = (id: Tab, label: string): HTMLElement => {
      const btn = h(
        'button',
        { class: 'insp__tab', type: 'button', role: 'tab', 'aria-selected': String(this.tab === id) },
        [label],
      );
      btn.classList.toggle('is-active', this.tab === id);
      btn.addEventListener('click', () => {
        this.tab = id;
        tabs.querySelectorAll('.insp__tab').forEach((t) => {
          const on = t === btn;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', String(on));
        });
        contentPanel.hidden = id !== 'content';
        stylePanel.hidden = id !== 'style';
      });
      return btn;
    };
    tabs.append(mkTab('content', 'Content'), mkTab('style', 'Style'));
    this.body.append(tabs);

    contentPanel.hidden = this.tab !== 'content';
    stylePanel.hidden = this.tab !== 'style';

    // --- Content ------------------------------------------------------------
    if (!entry) {
      contentPanel.append(
        h('p', { class: 'insp__hint whisper' }, ['No editable schema for this block type.']),
      );
    } else {
      for (const field of entry.fields) {
        contentPanel.append(this.control(block, field, field.path));
      }
      for (const arr of entry.arrays) {
        contentPanel.append(this.arrayGroup(block, arr));
      }
    }

    // --- Style --------------------------------------------------------------
    this.buildStyle(block, stylePanel);

    this.body.append(contentPanel, stylePanel);

    const actions = h('div', { class: 'insp__actions' }, [
      this.actionBtn('Duplicate', 'insp__dup', () => this.deps.onDuplicate(block.id)),
      this.actionBtn('Delete block', 'insp__del', () => this.deps.onDelete(block.id)),
    ]);
    this.body.append(actions);
  }

  /* ------------------------------------------------------------- arrays */

  private arrayGroup(block: Block, arr: ArrayField): HTMLElement {
    const items = (getByPath(block.props, arr.path) as unknown[]) ?? [];
    const group = h('div', { class: 'insp__group' }, [
      h('p', { class: 'insp__group-label meta' }, [arr.label]),
    ]);

    items.forEach((_item, i) => {
      const ctrls = h('div', { class: 'insp__item-ctrls' }, [
        this.itemBtn('↑', 'Move up', i === 0, () => this.deps.onMoveItem(block.id, arr.path, i, i - 1)),
        this.itemBtn('↓', 'Move down', i === items.length - 1, () =>
          this.deps.onMoveItem(block.id, arr.path, i, i + 1),
        ),
        this.itemBtn('✕', `Remove ${arr.addNoun}`, false, () =>
          this.deps.onRemoveItem(block.id, arr.path, i),
        ),
      ]);
      (ctrls.lastChild as HTMLElement).classList.add('insp__item-del');

      const card = h('div', { class: 'insp__item' }, [
        h('div', { class: 'insp__item-head' }, [
          h('p', { class: 'insp__item-label meta' }, [arr.itemLabel(i)]),
          ctrls,
        ]),
      ]);

      if (arr.primitive) {
        card.append(this.control(block, { ...arr.primitive, label: '' }, `${arr.path}.${i}`));
      } else {
        for (const f of arr.fields) {
          card.append(this.control(block, f, `${arr.path}.${i}.${f.path}`));
        }
      }
      group.append(card);
    });

    if (arr.softMax && items.length > arr.softMax && arr.softMaxNote) {
      group.append(h('p', { class: 'insp__note whisper' }, [arr.softMaxNote]));
    }

    if (arr.max && items.length >= arr.max) {
      group.append(h('p', { class: 'insp__cap whisper' }, [arr.capNote ?? 'This section is full.']));
    } else {
      const add = h('button', { class: 'insp__add', type: 'button' }, [`+ Add ${arr.addNoun}`]);
      add.addEventListener('click', () => this.deps.onAddItem(block.id, arr.path));
      group.append(add);
    }
    return group;
  }

  private itemBtn(glyph: string, title: string, disabled: boolean, onClick: () => void): HTMLElement {
    const b = h('button', { class: 'insp__item-btn', type: 'button', title, 'aria-label': title }, [glyph]);
    (b as HTMLButtonElement).disabled = disabled;
    b.addEventListener('click', onClick);
    return b;
  }

  /* -------------------------------------------------------------- style */

  private buildStyle(block: Block, panel: HTMLElement): void {
    // Always read the CURRENT style from the store — the panel isn't rebuilt
    // between non-structural style edits, so the captured `block` goes stale.
    // Chaining edits (e.g. Deeper background, then a custom accent) must merge.
    const liveStyle = (): BlockStyle => {
      const b = this.deps.store.getState().draft.blocks.find((x) => x.id === block.id);
      return b?.style ? { ...b.style } : {};
    };
    const patch = (fn: (s: BlockStyle) => void): void => {
      const next = liveStyle();
      fn(next);
      this.deps.onStyle(block.id, next);
    };

    panel.append(
      h('p', { class: 'insp__style-hint whisper' }, [
        'Overrides for just this section. Anything left on “Default” follows the sitewide theme.',
      ]),
    );

    // Background — Default / Light / Deeper / Custom
    const currentBg =
      block.style?.bgColor != null
        ? 'custom'
        : block.style?.ground === 'cream'
          ? 'light'
          : block.style?.ground === 'ink'
            ? 'deeper'
            : 'default';

    const customWrap = h('div', { class: 'insp__style-custom' });
    customWrap.hidden = currentBg !== 'custom';
    customWrap.append(
      this.styleColorInput(block.style?.bgColor ?? '#f3f6ef', (hex) =>
        patch((s) => {
          s.bgColor = hex;
          delete s.ground;
        }),
      ),
    );

    const bgSeg = this.segmented(
      'Background',
      [
        { value: 'default', label: 'Default' },
        { value: 'light', label: 'Light' },
        { value: 'deeper', label: 'Deeper' },
        { value: 'custom', label: 'Custom' },
      ],
      currentBg,
      (v) => {
        customWrap.hidden = v !== 'custom';
        patch((s) => {
          delete s.ground;
          delete s.bgColor;
          if (v === 'light') s.ground = 'cream';
          else if (v === 'deeper') s.ground = 'ink';
          else if (v === 'custom') s.bgColor = block.style?.bgColor ?? '#f3f6ef';
        });
      },
    );
    panel.append(h('div', { class: 'insp__style-field' }, [bgSeg, customWrap]));

    // Text colour
    panel.append(
      this.styleColorField('Text colour', block.style?.textColor, '#232820', (hex) =>
        patch((s) => {
          if (hex) s.textColor = hex;
          else delete s.textColor;
        }),
      ),
    );

    // Accent colour
    panel.append(
      this.styleColorField('Accent colour', block.style?.accentColor, '#b08f45', (hex) =>
        patch((s) => {
          if (hex) s.accentColor = hex;
          else delete s.accentColor;
        }),
      ),
    );

    // Heading font — Default + display-role faces
    const fontSel = document.createElement('select');
    fontSel.className = 'field__control field__select';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = 'Default (theme)';
    if (!block.style?.fontDisplay) def.selected = true;
    fontSel.append(def);
    for (const [key, fd] of Object.entries(FONTS) as [FontKey, (typeof FONTS)[FontKey]][]) {
      if (!fd.roles.includes('display')) continue;
      const o = document.createElement('option');
      o.value = key;
      o.textContent = fd.label;
      o.style.fontFamily = fd.family;
      if (block.style?.fontDisplay === key) o.selected = true;
      fontSel.append(o);
    }
    fontSel.addEventListener('change', () =>
      patch((s) => {
        if (fontSel.value) s.fontDisplay = fontSel.value as FontKey;
        else delete s.fontDisplay;
      }),
    );
    panel.append(
      h('label', { class: 'field' }, [h('span', { class: 'field__label meta' }, ['Heading font']), fontSel]),
    );

    // Section spacing
    const currentPad = block.style?.padScale;
    const spacing =
      currentPad === 0.7 ? 'cozy' : currentPad === 1.3 ? 'airy' : 'normal';
    const spaceSeg = this.segmented(
      'Section spacing',
      SPACING.map((s) => ({ value: s.value, label: s.label })),
      spacing,
      (v) =>
        patch((s) => {
          const pad = SPACING.find((x) => x.value === v)?.pad;
          if (pad) s.padScale = pad;
          else delete s.padScale;
        }),
    );
    panel.append(h('div', { class: 'insp__style-field' }, [spaceSeg]));

    // Clear
    const clear = h('button', { class: 'insp__clear', type: 'button' }, ['Clear styling']);
    clear.addEventListener('click', () => this.deps.onStyle(block.id, undefined));
    panel.append(clear);
  }

  /** A labelled segmented control. Updates its own active state on click. */
  private segmented(
    label: string,
    opts: { value: string; label: string }[],
    current: string,
    onPick: (value: string) => void,
  ): HTMLElement {
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': label });
    for (const opt of opts) {
      const b = h('button', { class: 'seg__opt', type: 'button' }, [opt.label]);
      b.classList.toggle('is-active', opt.value === current);
      b.setAttribute('aria-pressed', String(opt.value === current));
      b.addEventListener('click', () => {
        seg.querySelectorAll('.seg__opt').forEach((o) => {
          const on = o === b;
          o.classList.toggle('is-active', on);
          o.setAttribute('aria-pressed', String(on));
        });
        onPick(opt.value);
      });
      seg.append(b);
    }
    return h('div', { class: 'insp__style-row' }, [
      h('span', { class: 'field__label meta' }, [label]),
      seg,
    ]);
  }

  /** Default / Custom colour field: a toggle plus a colour input when custom. */
  private styleColorField(
    label: string,
    current: string | undefined,
    seed: string,
    onSet: (hex: string | undefined) => void,
  ): HTMLElement {
    const picker = h('div', { class: 'insp__style-custom' });
    picker.hidden = current == null;
    picker.append(this.styleColorInput(current ?? seed, (hex) => onSet(hex)));

    const seg = this.segmented(
      label,
      [
        { value: 'default', label: 'Default' },
        { value: 'custom', label: 'Custom' },
      ],
      current == null ? 'default' : 'custom',
      (v) => {
        picker.hidden = v !== 'custom';
        onSet(v === 'custom' ? current ?? seed : undefined);
      },
    );
    return h('div', { class: 'insp__style-field' }, [seg, picker]);
  }

  /** A synced colour swatch + hex text input; never emits an invalid colour. */
  private styleColorInput(value: string, onChange: (hex: string) => void): HTMLElement {
    const start = normalizeHex(value);
    const swatch = h('input', { class: 'theme__swatch', type: 'color', value: start }) as HTMLInputElement;
    const hex = h('input', {
      class: 'theme__hex',
      type: 'text',
      value: start,
      spellcheck: 'false',
      'aria-label': 'Hex colour',
    }) as HTMLInputElement;
    let last = start;
    const commit = (raw: string) => {
      if (!isHexColor(raw)) {
        hex.value = last;
        return;
      }
      last = normalizeHex(raw);
      swatch.value = last;
      hex.value = last;
      onChange(last);
    };
    swatch.addEventListener('input', () => commit(swatch.value));
    hex.addEventListener('change', () => commit(hex.value));
    hex.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') hex.blur();
    });
    return h('div', { class: 'insp__color' }, [swatch, hex]);
  }

  /* ------------------------------------------------------------- shared */

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
    if (!field.label) (wrap.firstChild as HTMLElement).classList.add('field__label--hidden');

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
