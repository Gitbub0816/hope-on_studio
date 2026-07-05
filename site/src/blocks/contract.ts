import type { Block, PageContent } from '@shared/types';

/**
 * Block renderer contract — every block module exports one of these.
 * Rules (editable-by-design):
 *  - render() is PURE DOM construction; no animation, no listeners.
 *  - The root element must carry data-block-id and data-block-type.
 *  - Editable text nodes carry data-edit="<propPath>", editable images
 *    carry data-edit-img="<propPath>", so the admin overlay can bind.
 *  - mount() runs after insertion: register GSAP/engine work here and
 *    return a cleanup function (the editor re-mounts blocks on edit).
 */
export interface RenderCtx {
  page: PageContent;
  index: number; // block position on page
  reducedMotion: boolean;
}

export type Cleanup = () => void;

export interface BlockRenderer<P = Record<string, unknown>> {
  type: string;
  render(props: P, ctx: RenderCtx): HTMLElement;
  mount?(el: HTMLElement, props: P, ctx: RenderCtx): Cleanup | void;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

export function blockRoot(block: Block, ground?: 'ink' | 'cream'): HTMLElement {
  const root = el('section', {
    class: `section block block--${block.type}`,
    'data-block-id': block.id,
    'data-block-type': block.type,
  });
  if (ground) root.dataset.ground = ground;
  return root;
}
