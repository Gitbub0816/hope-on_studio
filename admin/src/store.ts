/**
 * EditorStore — the single source of truth. Plain TS, observable via a tiny
 * pub/sub. Holds the draft PageContent, selection, dirty flag, save state, and
 * the undo/redo stacks (command pattern, capped at 100).
 */
import type { PageContent } from '@shared/types';
import type { Command } from './commands';

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'offline' | 'error';

export interface EditorState {
  slug: string;
  draft: PageContent;
  selectedId: string | null;
  dirty: boolean;
  online: boolean;
  save: SaveState;
  savedAt: number;
  canUndo: boolean;
  canRedo: boolean;
  /** Bumped whenever block count/order changes — canvas rebuilds on change. */
  structureRev: number;
  /** Bumped on any draft change — inspector/topbar refresh. */
  rev: number;
}

const HISTORY_CAP = 100;

type Listener = (state: EditorState, prev: EditorState) => void;

export class EditorStore {
  private state: EditorState;
  private listeners = new Set<Listener>();
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  constructor(slug: string, draft: PageContent, online: boolean) {
    this.state = {
      slug,
      draft,
      selectedId: null,
      dirty: false,
      online,
      save: 'clean',
      savedAt: 0,
      canUndo: false,
      canRedo: false,
      structureRev: 0,
      rev: 0,
    };
  }

  getState(): EditorState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(patch: Partial<EditorState>, opts: { structural?: boolean; touch?: boolean } = {}): void {
    const prev = this.state;
    this.state = {
      ...prev,
      ...patch,
      rev: prev.rev + 1,
      structureRev: prev.structureRev + (opts.structural ? 1 : 0),
    };
    for (const fn of this.listeners) fn(this.state, prev);
  }

  /** Load a fresh page: replace draft, reset history + selection. */
  load(slug: string, draft: PageContent, online: boolean): void {
    this.undoStack = [];
    this.redoStack = [];
    this.set(
      {
        slug,
        draft,
        selectedId: null,
        dirty: false,
        online,
        save: online ? 'clean' : 'offline',
        canUndo: false,
        canRedo: false,
      },
      { structural: true },
    );
  }

  /** Run a command, pushing it onto the undo stack. Returns the new content. */
  execute(cmd: Command): PageContent {
    const next = cmd.apply(this.state.draft);
    this.undoStack.push(cmd);
    if (this.undoStack.length > HISTORY_CAP) this.undoStack.shift();
    this.redoStack = [];
    this.set(
      {
        draft: next,
        dirty: true,
        save: this.state.online ? 'dirty' : 'offline',
        canUndo: true,
        canRedo: false,
      },
      { structural: cmd.structural },
    );
    return next;
  }

  undo(): void {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    const next = cmd.revert(this.state.draft);
    this.redoStack.push(cmd);
    this.set(
      {
        draft: next,
        dirty: true,
        save: this.state.online ? 'dirty' : 'offline',
        selectedId: this.selectionStillValid(next) ? this.state.selectedId : null,
        canUndo: this.undoStack.length > 0,
        canRedo: true,
      },
      { structural: cmd.structural },
    );
  }

  redo(): void {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    const next = cmd.apply(this.state.draft);
    this.undoStack.push(cmd);
    this.set(
      {
        draft: next,
        dirty: true,
        save: this.state.online ? 'dirty' : 'offline',
        selectedId: this.selectionStillValid(next) ? this.state.selectedId : null,
        canUndo: true,
        canRedo: this.redoStack.length > 0,
      },
      { structural: cmd.structural },
    );
  }

  private selectionStillValid(content: PageContent): boolean {
    return content.blocks.some((b) => b.id === this.state.selectedId);
  }

  select(id: string | null): void {
    if (id === this.state.selectedId) return;
    this.set({ selectedId: id });
  }

  setSave(save: SaveState): void {
    this.set({ save, savedAt: save === 'saved' ? Date.now() : this.state.savedAt });
  }

  setOnline(online: boolean): void {
    if (online === this.state.online) return;
    this.set({ online });
  }

  /** Replace the draft wholesale (revision restore) and reset history. */
  replaceDraft(draft: PageContent): void {
    this.undoStack = [];
    this.redoStack = [];
    this.set(
      { draft, dirty: true, save: this.state.online ? 'dirty' : 'offline', selectedId: null, canUndo: false, canRedo: false },
      { structural: true },
    );
  }

  markClean(): void {
    this.set({ dirty: false });
  }
}
