/**
 * Command pattern — every draft mutation is an invertible operation so undo /
 * redo is exact. Commands are pure: apply/revert take content and return new
 * content (structuredClone under the hood), never mutating the argument.
 */
import type { Block, PageContent } from '@shared/types';
import { clone, getByPath, setByPath, uid } from './util';

export interface Command {
  label: string;
  /** True when this changes block count/order (canvas needs a full rebuild). */
  structural: boolean;
  apply(content: PageContent): PageContent;
  revert(content: PageContent): PageContent;
}

function withProps(content: PageContent, blockId: string, path: string, value: unknown): PageContent {
  const c = clone(content);
  const b = c.blocks.find((x) => x.id === blockId);
  if (b) b.props = setByPath(b.props, path, value);
  return c;
}

function insertAt(content: PageContent, block: Block, index: number): PageContent {
  const c = clone(content);
  c.blocks.splice(Math.max(0, Math.min(index, c.blocks.length)), 0, clone(block));
  return c;
}

function removeById(content: PageContent, blockId: string): PageContent {
  const c = clone(content);
  c.blocks = c.blocks.filter((b) => b.id !== blockId);
  return c;
}

function moveIndex(content: PageContent, from: number, to: number): PageContent {
  const c = clone(content);
  if (from < 0 || from >= c.blocks.length) return c;
  const [item] = c.blocks.splice(from, 1);
  c.blocks.splice(Math.max(0, Math.min(to, c.blocks.length)), 0, item);
  return c;
}

/** Edit a single prop at a path within a block. */
export function setPropCommand(
  content: PageContent,
  blockId: string,
  path: string,
  value: unknown,
  label = 'Edit',
): Command | null {
  const b = content.blocks.find((x) => x.id === blockId);
  if (!b) return null;
  const old = clone(getByPath(b.props, path));
  const next = clone(value);
  return {
    label,
    structural: false,
    apply: (c) => withProps(c, blockId, path, next),
    revert: (c) => withProps(c, blockId, path, old),
  };
}

export function insertBlockCommand(block: Block, index: number): Command {
  return {
    label: 'Add block',
    structural: true,
    apply: (c) => insertAt(c, block, index),
    revert: (c) => removeById(c, block.id),
  };
}

export function removeBlockCommand(content: PageContent, blockId: string): Command | null {
  const index = content.blocks.findIndex((b) => b.id === blockId);
  if (index < 0) return null;
  const snapshot = clone(content.blocks[index]);
  return {
    label: 'Delete block',
    structural: true,
    apply: (c) => removeById(c, blockId),
    revert: (c) => insertAt(c, snapshot, index),
  };
}

export function duplicateBlockCommand(content: PageContent, blockId: string): Command | null {
  const index = content.blocks.findIndex((b) => b.id === blockId);
  if (index < 0) return null;
  const copy: Block = { ...clone(content.blocks[index]), id: uid(content.blocks[index].type) };
  return {
    label: 'Duplicate block',
    structural: true,
    apply: (c) => insertAt(c, copy, index + 1),
    revert: (c) => removeById(c, copy.id),
    // Expose the new id so callers can select it.
    ...({ newId: copy.id } as object),
  } as Command & { newId: string };
}

export function reorderCommand(from: number, to: number): Command {
  return {
    label: 'Reorder',
    structural: true,
    apply: (c) => moveIndex(c, from, to),
    revert: (c) => moveIndex(c, to, from),
  };
}
