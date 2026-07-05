/**
 * Overlay controller — the editing layer that sits over the live preview.
 * Selection outline + handles, inline contenteditable text, image swap,
 * drag-to-reorder with a ghost drop line, and "+ add block" gap affordances.
 */
import type { EditorStore, EditorState } from '../store';
import type { CatalogEntry, Field, MultiMode } from '../catalog';
import { catalogFor } from '../catalog';
import { h } from '../util';
import type { RenderedBlock } from '../render';

export interface OverlayDeps {
  store: EditorStore;
  scrollEl: HTMLElement;
  canvas: HTMLElement;
  onAddAt(index: number): void;
  onSwapImage(blockId: string, path: string, img: HTMLImageElement): void;
  onInlineCommit(blockId: string, path: string, value: unknown): void;
}

/** Resolve the catalog Field for a data-edit path (handles array indices). */
function resolveField(entry: CatalogEntry | undefined, path: string): Field | undefined {
  if (!entry) return undefined;
  const scalar = entry.fields.find((f) => f.path === path);
  if (scalar) return scalar;
  const parts = path.split('.');
  const numIdx = parts.findIndex((p) => /^\d+$/.test(p));
  if (numIdx > 0) {
    const arrPath = parts.slice(0, numIdx).join('.');
    const sub = parts.slice(numIdx + 1).join('.');
    const arr = entry.arrays.find((a) => a.path === arrPath);
    return arr?.fields.find((f) => f.path === sub);
  }
  return undefined;
}

function normalize(mode: MultiMode | undefined, raw: string): string {
  const t = raw.replace(/\r/g, '');
  if (mode === 'lines') {
    return t
      .split('\n')
      .map((s) => s.trim())
      .filter((s, i, a) => s.length > 0 || (i > 0 && i < a.length - 1))
      .join('\n')
      .trim();
  }
  if (mode === 'paras') {
    return t
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join('\n\n');
  }
  return t.replace(/\s*\n\s*/g, ' ').trim();
}

export class Overlay {
  private deps: OverlayDeps;
  private blocks: RenderedBlock[] = [];
  private selbox: HTMLElement;
  private toolbar: HTMLElement;
  private dropline: HTMLElement;
  private adderLayer: HTMLElement;
  private editingNode: HTMLElement | null = null;
  private editingBefore = '';
  private dragging = false;

  constructor(deps: OverlayDeps) {
    this.deps = deps;
    const s = deps.scrollEl;

    this.selbox = h('div', { class: 'selbox', 'aria-hidden': 'true' });
    for (const c of ['tl', 'tr', 'bl', 'br']) {
      this.selbox.append(h('span', { class: `selbox__h selbox__h--${c}` }));
    }
    this.toolbar = this.buildToolbar();
    this.dropline = h('div', { class: 'dropline', 'aria-hidden': 'true' });
    this.adderLayer = h('div', { class: 'adder-layer' });

    s.append(this.adderLayer, this.selbox, this.toolbar, this.dropline);

    this.selbox.style.display = 'none';
    this.toolbar.style.display = 'none';
    this.dropline.style.display = 'none';

    this.wireCanvas();
    s.addEventListener('scroll', () => this.reposition(), { passive: true });
    window.addEventListener('resize', () => this.reposition());
  }

  private buildToolbar(): HTMLElement {
    const bar = h('div', { class: 'blk-toolbar', 'aria-hidden': 'false' });
    const mk = (cls: string, label: string, title: string) =>
      h('button', { class: `blk-toolbar__btn ${cls}`, type: 'button', title, 'aria-label': title }, [label]);

    const handle = mk('blk-toolbar__drag', '⋮⋮', 'Drag to reorder');
    handle.classList.add('js-drag');
    const up = mk('', '↑', 'Move up');
    const down = mk('', '↓', 'Move down');
    const dup = mk('', '⧉', 'Duplicate');
    const del = mk('blk-toolbar__del', '✕', 'Delete');

    up.addEventListener('click', () => this.emitMove(-1));
    down.addEventListener('click', () => this.emitMove(1));
    dup.addEventListener('click', () => this.dispatch('duplicate'));
    del.addEventListener('click', () => this.dispatch('delete'));

    bar.append(handle, up, down, dup, del);
    this.wireDrag(handle);
    return bar;
  }

  private dispatch(action: 'duplicate' | 'delete'): void {
    this.deps.scrollEl.dispatchEvent(new CustomEvent('blk-action', { detail: { action } }));
  }

  private emitMove(dir: number): void {
    const id = this.deps.store.getState().selectedId;
    if (!id) return;
    const idx = this.blocks.findIndex((b) => b.block.id === id);
    if (idx < 0) return;
    const to = idx + dir;
    if (to < 0 || to >= this.blocks.length) return;
    this.deps.scrollEl.dispatchEvent(
      new CustomEvent('blk-reorder', { detail: { from: idx, to } }),
    );
  }

  /** Called after every canvas rebuild. */
  sync(blocks: RenderedBlock[]): void {
    this.blocks = blocks;
    this.buildAdders();
    this.reposition();
  }

  reflect(state: EditorState): void {
    // toggle contenteditable / image affordances on the selected block
    this.canvasBlocks().forEach((el) => {
      const selected = el.dataset.blockId === state.selectedId;
      el.classList.toggle('is-selected', selected);
      el.querySelectorAll<HTMLElement>('[data-edit]').forEach((n) => {
        if (selected) n.setAttribute('contenteditable', 'true');
        else n.removeAttribute('contenteditable');
      });
      el.querySelectorAll<HTMLElement>('[data-edit-img]').forEach((n) => {
        n.classList.toggle('is-swappable', selected);
      });
    });
    this.reposition();
  }

  private canvasBlocks(): HTMLElement[] {
    return Array.from(this.deps.canvas.querySelectorAll<HTMLElement>('[data-block-id]')).filter(
      (el) => el.parentElement === this.deps.canvas,
    );
  }

  private selectedEl(): HTMLElement | null {
    const id = this.deps.store.getState().selectedId;
    if (!id) return null;
    return this.blocks.find((b) => b.block.id === id)?.el ?? null;
  }

  private rectIn(el: HTMLElement): { top: number; left: number; w: number; h: number } {
    const s = this.deps.scrollEl;
    const cr = s.getBoundingClientRect();
    const br = el.getBoundingClientRect();
    return {
      top: br.top - cr.top + s.scrollTop,
      left: br.left - cr.left + s.scrollLeft,
      w: br.width,
      h: br.height,
    };
  }

  private reposition(): void {
    const el = this.selectedEl();
    if (!el || this.dragging) {
      if (!this.dragging) {
        this.selbox.style.display = 'none';
        this.toolbar.style.display = 'none';
      }
      return;
    }
    const r = this.rectIn(el);
    Object.assign(this.selbox.style, {
      display: 'block',
      top: `${r.top}px`,
      left: `${r.left}px`,
      width: `${r.w}px`,
      height: `${r.h}px`,
    });
    Object.assign(this.toolbar.style, {
      display: 'flex',
      top: `${Math.max(6, r.top + 8)}px`,
      left: `${r.left + r.w - 8}px`,
    });
    this.positionAdders();
  }

  /* --------------------------------------------------------- add gaps */

  private buildAdders(): void {
    this.adderLayer.innerHTML = '';
    const count = this.blocks.length + 1;
    for (let i = 0; i < count; i++) {
      const zone = h('div', { class: 'adder', 'data-index': String(i) });
      const pill = h('button', { class: 'adder__pill', type: 'button', title: 'Add a block here' }, [
        '+ Add block',
      ]);
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deps.onAddAt(i);
      });
      zone.append(h('span', { class: 'adder__line' }), pill);
      this.adderLayer.append(zone);
    }
    this.positionAdders();
  }

  private positionAdders(): void {
    const zones = Array.from(this.adderLayer.children) as HTMLElement[];
    zones.forEach((zone, i) => {
      let y: number;
      if (i < this.blocks.length) {
        y = this.rectIn(this.blocks[i].el).top;
      } else if (this.blocks.length) {
        const last = this.rectIn(this.blocks[this.blocks.length - 1].el);
        y = last.top + last.h;
      } else {
        y = 0;
      }
      zone.style.top = `${y}px`;
    });
  }

  /* ------------------------------------------------------- canvas wiring */

  private wireCanvas(): void {
    const canvas = this.deps.canvas;

    // Intercept clicks: select block, enter inline edit, or trigger image swap.
    canvas.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement;
        const imgWrap = target.closest<HTMLElement>('[data-edit-img]');
        const blockEl = target.closest<HTMLElement>('[data-block-id]');
        // Neutralize site links/buttons so editing never navigates.
        const interactive = target.closest('a, button');
        if (interactive && !interactive.closest('.blk-toolbar')) {
          e.preventDefault();
        }
        if (!blockEl) return;
        const id = blockEl.dataset.blockId!;
        const state = this.deps.store.getState();

        if (state.selectedId !== id) {
          this.commitEdit();
          this.deps.store.select(id);
          return;
        }
        // Already selected:
        if (imgWrap && imgWrap instanceof HTMLImageElement) {
          e.preventDefault();
          const path = imgWrap.getAttribute('data-edit-img')!;
          this.deps.onSwapImage(id, path, imgWrap);
          return;
        }
        const editNode = target.closest<HTMLElement>('[data-edit]');
        if (editNode) this.beginEdit(editNode, id);
      },
      true,
    );

    canvas.addEventListener(
      'focusout',
      (e) => {
        if (this.editingNode && e.target === this.editingNode) this.commitEdit();
      },
      true,
    );

    canvas.addEventListener('keydown', (e) => {
      if (!this.editingNode) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelEdit();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        const node = this.editingNode;
        const multiline = node.tagName === 'TEXTAREA' || node.dataset.multi === 'lines' || node.dataset.multi === 'paras';
        if (!multiline) {
          e.preventDefault();
          this.commitEdit();
        }
      }
    });
  }

  private beginEdit(node: HTMLElement, blockId: string): void {
    if (this.editingNode === node) return;
    this.commitEdit();
    const type = this.blocks.find((b) => b.block.id === blockId)?.block.type ?? '';
    const field = resolveField(catalogFor(type), node.getAttribute('data-edit')!);
    node.dataset.multi = field?.multiline ?? 'line';
    this.editingNode = node;
    this.editingBefore = node.innerText;
    node.classList.add('is-editing');
    node.focus();
    // place caret at click point (best-effort: select all if empty)
  }

  private commitEdit(): void {
    const node = this.editingNode;
    if (!node) return;
    this.editingNode = null;
    node.classList.remove('is-editing');
    const blockEl = node.closest<HTMLElement>('[data-block-id]');
    const path = node.getAttribute('data-edit');
    if (!blockEl || !path) return;
    const mode = node.dataset.multi as MultiMode | undefined;
    const value = normalize(mode, node.innerText);
    const before = normalize(mode, this.editingBefore);
    if (value !== before) {
      this.deps.onInlineCommit(blockEl.dataset.blockId!, path, value);
    }
  }

  private cancelEdit(): void {
    const node = this.editingNode;
    if (!node) return;
    node.innerText = this.editingBefore;
    node.classList.remove('is-editing');
    this.editingNode = null;
    node.blur();
  }

  /* ---------------------------------------------------------- drag reorder */

  private wireDrag(handle: HTMLElement): void {
    let startY = 0;
    let targetIndex = -1;

    const boundaries = (): number[] => {
      // y positions (in scroll space) of each gap: before block 0..n
      const ys = this.blocks.map((b) => this.rectIn(b.el).top);
      if (this.blocks.length) {
        const last = this.rectIn(this.blocks[this.blocks.length - 1].el);
        ys.push(last.top + last.h);
      }
      return ys;
    };

    const onMove = (e: PointerEvent) => {
      if (!this.dragging) return;
      const s = this.deps.scrollEl;
      const cr = s.getBoundingClientRect();
      const y = e.clientY - cr.top + s.scrollTop;
      const bounds = boundaries();
      // nearest boundary
      let best = 0;
      let bestDist = Infinity;
      bounds.forEach((by, i) => {
        const d = Math.abs(by - y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      targetIndex = best;
      this.dropline.style.display = 'block';
      this.dropline.style.top = `${bounds[best]}px`;
      // gentle auto-scroll near edges
      const vh = cr.height;
      const localY = e.clientY - cr.top;
      if (localY < 60) s.scrollTop -= 12;
      else if (localY > vh - 60) s.scrollTop += 12;
    };

    const onUp = () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.dropline.style.display = 'none';
      handle.releasePointerCapture?.(this.capturedPointer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.classList.remove('is-dragging-block');

      const id = this.deps.store.getState().selectedId;
      const from = this.blocks.findIndex((b) => b.block.id === id);
      if (from >= 0 && targetIndex >= 0) {
        // Convert boundary index to destination index.
        let to = targetIndex;
        if (to > from) to -= 1;
        if (to !== from) {
          this.deps.scrollEl.dispatchEvent(
            new CustomEvent('blk-reorder', { detail: { from, to } }),
          );
        }
      }
      this.reposition();
    };

    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!this.deps.store.getState().selectedId) return;
      this.dragging = true;
      startY = e.clientY;
      void startY;
      targetIndex = -1;
      this.capturedPointer = e.pointerId;
      handle.setPointerCapture?.(e.pointerId);
      document.body.classList.add('is-dragging-block');
      this.selbox.style.display = 'none';
      this.toolbar.style.display = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  private capturedPointer = 0;
}
