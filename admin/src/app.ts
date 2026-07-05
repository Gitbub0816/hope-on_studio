/**
 * App — assembles the editor chrome, owns the store, and wires every feature:
 * page switching, selection, inline edit, image swap, reorder, palette, the
 * inspector, autosave, publish, revisions, and undo/redo.
 */
import type { Block, PageContent } from '@shared/types';
import { EditorStore } from './store';
import type { EditorState } from './store';
import {
  duplicateBlockCommand,
  insertBlockCommand,
  removeBlockCommand,
  reorderCommand,
  setPropCommand,
} from './commands';
import type { Command } from './commands';
import { seedFor, PAGES } from './seeds';
import { loadContent, publish as apiPublish, saveDraft, uploadMedia } from './api';
import { renderCanvas } from './render';
import type { RenderedBlock } from './render';
import { clone, debounce, getByPath, h } from './util';

import { Topbar } from './ui/topbar';
import { Inspector } from './ui/inspector';
import { Palette } from './ui/palette';
import { Overlay } from './ui/overlay';
import { Revisions } from './ui/revisions';
import { toast } from './ui/toast';

export function mountEditor(root: HTMLElement): void {
  // --- Layout ---------------------------------------------------------------
  const scrollEl = h('div', { class: 'canvas-scroll' });
  const canvas = h('div', { class: 'canvas', id: 'canvas' });
  scrollEl.append(canvas);

  const banner = h('div', { class: 'offline-banner', role: 'status' }, [
    h('span', {}, ['Offline draft mode — changes are kept locally and will not autosave.']),
  ]);

  const fileInput = h('input', { class: 'file-input', type: 'file', accept: 'image/*' }) as HTMLInputElement;

  const store = new EditorStore('', clone(seedFor('')), true);

  // --- Commands helper ------------------------------------------------------
  const exec = (cmd: Command | null): void => {
    if (!cmd) return;
    store.execute(cmd);
  };

  // --- Components -----------------------------------------------------------
  const topbar = new Topbar({
    store,
    onSwitchPage: (slug) => void loadPage(slug),
    onUndo: () => store.undo(),
    onRedo: () => store.redo(),
    onPublish: () => void publish(),
    onOpenRevisions: () => void revisions.open(),
  });

  const inspector = new Inspector({
    store,
    onEdit: (id, path, value) => exec(setPropCommand(store.getState().draft, id, path, value)),
    onDelete: (id) => deleteBlock(id),
    onDuplicate: (id) => duplicateBlock(id),
    onSwapImage: (id, path) => beginImageSwap(id, path),
  });

  const palette = new Palette({
    onChoose: (block, index) => addBlock(block, index),
  });

  const revisions = new Revisions({
    getSlug: () => store.getState().slug,
    onRestoreLatest: () => void restoreLatest(),
  });

  const overlay = new Overlay({
    store,
    scrollEl,
    canvas,
    onAddAt: (index) => palette.open(index),
    onSwapImage: (id, path) => beginImageSwap(id, path),
    onInlineCommit: (id, path, value) =>
      exec(setPropCommand(store.getState().draft, id, path, value)),
  });

  const main = h('div', { class: 'editor-main' }, [scrollEl, inspector.el]);
  root.append(topbar.el, banner, main, palette.el, revisions.el, fileInput);

  // --- Overlay custom events (reorder / block actions) ----------------------
  scrollEl.addEventListener('blk-reorder', (e) => {
    const { from, to } = (e as CustomEvent<{ from: number; to: number }>).detail;
    exec(reorderCommand(from, to));
  });
  scrollEl.addEventListener('blk-action', (e) => {
    const { action } = (e as CustomEvent<{ action: string }>).detail;
    const id = store.getState().selectedId;
    if (!id) return;
    if (action === 'delete') deleteBlock(id);
    else if (action === 'duplicate') duplicateBlock(id);
  });

  // --- Block operations -----------------------------------------------------
  function addBlock(block: Block, index: number): void {
    store.execute(insertBlockCommand(block, index));
    store.select(block.id);
    toast(`Added ${block.type.replace(/-/g, ' ')}`);
  }

  function duplicateBlock(id: string): void {
    const cmd = duplicateBlockCommand(store.getState().draft, id) as
      | (Command & { newId?: string })
      | null;
    if (!cmd) return;
    store.execute(cmd);
    if (cmd.newId) store.select(cmd.newId);
    toast('Block duplicated');
  }

  function deleteBlock(id: string): void {
    const cmd = removeBlockCommand(store.getState().draft, id);
    if (!cmd) return;
    store.execute(cmd);
    store.select(null);
    toast('Block deleted', {
      action: { label: 'Undo', onClick: () => store.undo() },
    });
  }

  // --- Image swap -----------------------------------------------------------
  let swapTarget: { id: string; path: string } | null = null;
  function beginImageSwap(id: string, path: string): void {
    swapTarget = { id, path };
    fileInput.value = '';
    fileInput.click();
  }
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file || !swapTarget) return;
    const { id, path } = swapTarget;
    swapTarget = null;
    const currentAlt = String(getByPath(store.getState().draft.blocks.find((b) => b.id === id)?.props, `${path}.alt`) ?? '');
    toast('Uploading image…', { duration: 1500 });
    const res = await uploadMedia(file, currentAlt);
    exec(setPropCommand(store.getState().draft, id, `${path}.src`, res.src, 'Swap image'));
    if (res.offline) {
      toast('Offline — using a local preview. Re-upload once the server is reachable.', {
        duration: 6000,
      });
    }
  });

  // --- Page loading ---------------------------------------------------------
  async function loadPage(slug: string): Promise<void> {
    const { content, online } = await loadContent(slug);
    const draft: PageContent = clone(content ?? seedFor(slug));
    store.load(slug, draft, online);
  }

  // --- Restore latest published --------------------------------------------
  async function restoreLatest(): Promise<void> {
    const { content, online } = await loadContent(store.getState().slug);
    if (!online || !content) {
      toast('Could not reach the server to restore.');
      return;
    }
    store.replaceDraft(clone(content));
    toast('Restored the last published version as a new draft.');
  }

  // --- Autosave -------------------------------------------------------------
  const autosave = debounce(async () => {
    const state = store.getState();
    if (!state.dirty || !state.online) return;
    store.setSave('saving');
    const res = await saveDraft(state.slug, store.getState().draft);
    if (res.ok) {
      store.markClean();
      store.setSave('saved');
    } else if (!res.online) {
      store.setOnline(false);
      store.setSave('offline');
    } else {
      store.setSave('error');
    }
  }, 1500);

  // --- Publish --------------------------------------------------------------
  let publishArmed = false;
  let publishTimer: ReturnType<typeof setTimeout> | undefined;
  async function publish(): Promise<void> {
    const state = store.getState();
    if (!state.online) {
      toast('Publishing needs a connection. Reconnect and try again.');
      return;
    }
    if (!publishArmed) {
      publishArmed = true;
      topbar.el.querySelector('.top__publish')!.textContent = 'Confirm publish';
      topbar.el.querySelector('.top__publish')!.classList.add('is-armed');
      publishTimer = setTimeout(() => resetPublish(), 4000);
      return;
    }
    resetPublish();

    if (state.dirty) {
      store.setSave('saving');
      const saved = await saveDraft(state.slug, store.getState().draft);
      if (saved.ok) {
        store.markClean();
        store.setSave('saved');
      } else {
        store.setSave(saved.online ? 'error' : 'offline');
        toast('Could not save the draft before publishing.');
        return;
      }
    }
    const res = await apiPublish(state.slug);
    if (res.ok) {
      void topbar.playBloom();
      toast('Published — the site now shows your changes.');
    } else {
      toast(res.online ? 'Publish failed.' : 'Offline — cannot publish right now.');
    }
  }
  function resetPublish(): void {
    publishArmed = false;
    if (publishTimer) clearTimeout(publishTimer);
    const btn = topbar.el.querySelector('.top__publish')!;
    btn.textContent = 'Publish';
    btn.classList.remove('is-armed');
  }

  // --- Keyboard shortcuts ---------------------------------------------------
  window.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const active = document.activeElement as HTMLElement | null;
    const inField =
      !!active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable);
    if (e.key.toLowerCase() === 'z' && !inField) {
      e.preventDefault();
      if (e.shiftKey) store.redo();
      else store.undo();
    } else if (e.key.toLowerCase() === 'y' && !inField) {
      e.preventDefault();
      store.redo();
    }
  });

  // --- Render pipeline ------------------------------------------------------
  let rendered: RenderedBlock[] = [];
  function rebuild(content: PageContent): void {
    rendered = renderCanvas(canvas, content);
    overlay.sync(rendered);
  }

  store.subscribe((state, prev) => {
    if (state.draft !== prev.draft) rebuild(state.draft);
    topbar.reflect(state);
    inspector.reflect(state);
    overlay.reflect(state);
    banner.classList.toggle('is-visible', !state.online);
    if (state.dirty && state.online && state.save === 'dirty') autosave.call();
  });

  // Initial paint + async load of the live landing content.
  rebuild(store.getState().draft);
  topbar.reflect(store.getState());
  inspector.reflect(store.getState());
  void loadPage('');
  void PAGES; // (kept for clarity: page list drives the switcher)
}

export type { EditorState };
