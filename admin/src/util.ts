/** Small shared helpers for the editor. */

/** Read a value at a dotted path ("panels.0.title") from an object. */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Immutably set a value at a dotted path, returning a new cloned root. */
export function setByPath<T>(root: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const clone = structuredClone(root) as unknown;
  let cursor = clone as Record<string, unknown> | unknown[];
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const idx = Array.isArray(cursor) ? Number(key) : key;
    cursor = (cursor as Record<string, unknown>)[idx as string] as
      | Record<string, unknown>
      | unknown[];
  }
  const last = keys[keys.length - 1];
  (cursor as Record<string, unknown>)[last] = value;
  return clone as T;
}

/** Deep clone via structuredClone (draft docs are plain JSON). */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

/** Small stable id for new blocks. */
export function uid(prefix = 'blk'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Create an element with attrs + children (mirrors the site's el() ergonomics). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

/** Debounce a zero-arg function. */
export function debounce(fn: () => void, ms: number): { call(): void; cancel(): void } {
  let t: ReturnType<typeof setTimeout> | undefined;
  return {
    call() {
      if (t) clearTimeout(t);
      t = setTimeout(fn, ms);
    },
    cancel() {
      if (t) clearTimeout(t);
      t = undefined;
    },
  };
}

/** Relative "just now / 2m ago" phrasing for the save stamp. */
export function relativeTime(from: number): string {
  const secs = Math.max(0, Math.round((Date.now() - from) / 1000));
  if (secs < 8) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}
