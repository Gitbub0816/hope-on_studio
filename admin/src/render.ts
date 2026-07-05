/**
 * Canvas renderer — draws the draft into the preview using the REAL site block
 * renderers, so the canvas is the site itself. We call render() only (pure DOM
 * per the block contract) and deliberately skip mount(): the site's mount step
 * wires GSAP/ScrollTrigger scroll choreography, which would leave blocks parked
 * at their pre-animation (often invisible) state without a live scroll runtime.
 * Skipping it gives us the "static assembled" composition the brief asks for —
 * fallback imagery visible, everything readable, and the preview scrolls as a
 * normal document. Block types the site hasn't built yet render as an elegant
 * placeholder so they remain selectable, movable, and editable.
 */
import type { Block, PageContent } from '@shared/types';
import type { RenderCtx } from '@blocks/contract';
import { applyBlockStyle } from '../../site/src/boot';
import { registry } from './registry';
import { catalogFor } from './catalog';
import { h } from './util';

export interface RenderedBlock {
  el: HTMLElement;
  block: Block;
}

function placeholder(block: Block): HTMLElement {
  const entry = catalogFor(block.type);
  const root = h('section', {
    class: 'section block block--placeholder',
    'data-ground': 'cream',
  });
  const inner = h('div', { class: 'ph' }, [
    h('p', { class: 'kicker' }, [entry?.label ?? block.type]),
    h('p', { class: 'ph__note whisper' }, [
      entry?.description ?? 'This block type is not yet built on the site.',
    ]),
    h('p', { class: 'ph__meta meta' }, ['Preview pending · editable in the inspector']),
  ]);
  root.append(inner);
  return root;
}

/** Render one block into a detached element (or a placeholder). */
export function renderBlock(content: PageContent, block: Block, index: number): HTMLElement {
  const renderer = registry.get(block.type);
  let el: HTMLElement;
  if (renderer) {
    const ctx: RenderCtx = { page: content, index, reducedMotion: true };
    try {
      el = renderer.render(block.props as never, ctx);
    } catch {
      el = placeholder(block);
    }
  } else {
    el = placeholder(block);
  }
  el.dataset.blockId = block.id;
  el.dataset.blockType = block.type;
  // Preview per-block Style overrides exactly as the live site would (reuses
  // boot.applyBlockStyle), so Style-tab edits are visible immediately.
  applyBlockStyle(el, block.style);
  return el;
}

/** Rebuild the whole canvas. Returns the rendered block elements in order. */
export function renderCanvas(container: HTMLElement, content: PageContent): RenderedBlock[] {
  container.innerHTML = '';
  document.documentElement.dataset.canvasGround = content.ground;
  const out: RenderedBlock[] = [];
  content.blocks.forEach((block, i) => {
    const el = renderBlock(content, block, i);
    container.append(el);
    out.push({ el, block });
  });
  return out;
}
