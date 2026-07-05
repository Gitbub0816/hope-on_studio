/**
 * Topbar — the ink chrome: wordmark, page switcher, save state, undo/redo,
 * revision history, and Publish (with a floral bloom grace-note on success).
 */
import type { EditorState, EditorStore } from '../store';
import { PAGES } from '../seeds';
import { h, relativeTime } from '../util';

export interface TopbarDeps {
  store: EditorStore;
  onSwitchPage(slug: string): void;
  onUndo(): void;
  onRedo(): void;
  onPublish(): void;
  onOpenRevisions(): void;
}

export class Topbar {
  readonly el: HTMLElement;
  private deps: TopbarDeps;
  private select: HTMLSelectElement;
  private saveEl: HTMLElement;
  private saveDot: HTMLElement;
  private undoBtn: HTMLButtonElement;
  private redoBtn: HTMLButtonElement;
  private publishBtn: HTMLButtonElement;
  private bloomHost: HTMLElement;

  constructor(deps: TopbarDeps) {
    this.deps = deps;

    const wordmark = h('a', { class: 'top__mark', href: '#', 'aria-label': 'Hope On Studio editor' }, [
      h('span', {}, ['Hope On']),
      h('span', { class: 'top__mark-em' }, ['— Studio']),
      h('span', { class: 'top__mark-tag meta' }, ['Editor']),
    ]);
    wordmark.addEventListener('click', (e) => e.preventDefault());

    this.select = document.createElement('select');
    this.select.className = 'top__pages';
    this.select.setAttribute('aria-label', 'Page');
    for (const p of PAGES) {
      const o = document.createElement('option');
      o.value = p.slug;
      o.textContent = p.label;
      this.select.append(o);
    }
    this.select.addEventListener('change', () => this.deps.onSwitchPage(this.select.value));

    this.saveDot = h('span', { class: 'top__save-dot' });
    this.saveEl = h('span', { class: 'top__save-label' }, ['Saved']);
    const save = h('div', { class: 'top__save', title: 'Draft save state' }, [this.saveDot, this.saveEl]);

    this.undoBtn = this.iconBtn('↩', 'Undo', () => this.deps.onUndo());
    this.redoBtn = this.iconBtn('↪', 'Redo', () => this.deps.onRedo());
    const history = this.textBtn('History', 'top__history', () => this.deps.onOpenRevisions());

    this.bloomHost = h('span', { class: 'top__bloom', 'aria-hidden': 'true' });
    this.publishBtn = this.textBtn('Publish', 'top__publish', () => this.deps.onPublish());
    const publishWrap = h('div', { class: 'top__publish-wrap' }, [this.bloomHost, this.publishBtn]);

    const left = h('div', { class: 'top__left' }, [wordmark, this.select]);
    const right = h('div', { class: 'top__right' }, [
      save,
      h('div', { class: 'top__undo' }, [this.undoBtn, this.redoBtn]),
      history,
      publishWrap,
    ]);

    this.el = h('header', { class: 'top' }, [left, right]);
  }

  private iconBtn(glyph: string, title: string, onClick: () => void): HTMLButtonElement {
    const b = h('button', { class: 'top__icon', type: 'button', title, 'aria-label': title }, [glyph]);
    b.addEventListener('click', onClick);
    return b;
  }

  private textBtn(label: string, cls: string, onClick: () => void): HTMLButtonElement {
    const b = h('button', { class: `top__btn ${cls}`, type: 'button' }, [label]);
    b.addEventListener('click', onClick);
    return b;
  }

  reflect(state: EditorState): void {
    if (this.select.value !== state.slug) this.select.value = state.slug;
    this.undoBtn.disabled = !state.canUndo;
    this.redoBtn.disabled = !state.canRedo;

    const map: Record<EditorState['save'], string> = {
      clean: 'Saved',
      dirty: 'Editing…',
      saving: 'Saving…',
      saved: state.savedAt ? `Saved · ${relativeTime(state.savedAt)}` : 'Saved',
      offline: 'Offline draft',
      error: 'Save failed',
    };
    this.saveEl.textContent = map[state.save];
    this.saveDot.dataset.state = state.save;
  }

  /** Play a tiny floral bloom grace-note in the topbar on publish success. */
  async playBloom(): Promise<void> {
    try {
      const { bloom } = await import('@engine/index');
      const handle = bloom(this.bloomHost, {
        hues: ['peony', 'gold'],
        intensity: 'grace-note',
        trigger: 'immediate',
      });
      handle.play();
      this.bloomHost.classList.add('is-blooming');
      setTimeout(() => {
        handle.destroy();
        this.bloomHost.classList.remove('is-blooming');
      }, 2600);
    } catch {
      // engine unavailable — a quiet confirmation pulse instead
      this.publishBtn.classList.add('is-confirmed');
      setTimeout(() => this.publishBtn.classList.remove('is-confirmed'), 1200);
    }
  }
}
