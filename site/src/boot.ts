/**
 * Shared boot module — every page entry imports this FIRST.
 * Fonts, tokens, base styles, and the page-rendering runtime.
 */
import '@fontsource-variable/fraunces';
import '@fontsource-variable/figtree';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import './styles/tokens.css';
import './styles/base.css';

import type { PageContent } from '@shared/types';
import type { BlockRenderer, RenderCtx, Cleanup } from './blocks/contract';

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Load page content: published revision from the API when available,
 * falling back to the bundled seed (static hosting / first deploy).
 */
export async function loadContent(slug: string, seed: PageContent): Promise<PageContent> {
  try {
    const res = await fetch(`/api/content/${slug || 'landing'}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) return (await res.json()) as PageContent;
  } catch {
    /* offline / static — seed is the source */
  }
  return seed;
}

/** Render a full page from content into #app using the given registry. */
export function renderPage(
  content: PageContent,
  registry: Map<string, BlockRenderer<never>>,
  target = document.querySelector<HTMLElement>('#app')!,
): Cleanup[] {
  document.title = content.title;
  document.body.dataset.ground = content.ground;
  target.innerHTML = '';
  const cleanups: Cleanup[] = [];
  const mounts: (() => void)[] = [];

  content.blocks.forEach((block, index) => {
    const renderer = registry.get(block.type);
    if (!renderer) {
      console.warn(`No renderer for block type "${block.type}" — skipped`);
      return;
    }
    const ctx: RenderCtx = { page: content, index, reducedMotion };
    const node = renderer.render(block.props as never, ctx);
    node.dataset.blockId = block.id;
    node.dataset.blockType = block.type;
    target.append(node);
    if (renderer.mount) {
      mounts.push(() => {
        const cleanup = renderer.mount!(node, block.props as never, ctx);
        if (cleanup) cleanups.push(cleanup);
      });
    }
  });

  // Mount after all blocks are in the DOM so cross-block measurements work.
  mounts.forEach((m) => m());
  return cleanups;
}
