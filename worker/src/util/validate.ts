import type { Block, PageContent, SaveDraftRequest } from '../../../shared/types';

function isBlock(x: unknown): x is Block {
  if (typeof x !== 'object' || x === null) return false;
  const b = x as Record<string, unknown>;
  return typeof b.id === 'string' && typeof b.type === 'string' && typeof b.props === 'object' && b.props !== null;
}

/** Loose structural check — we trust the editor to build valid PageContent,
 *  but guard against obviously malformed bodies reaching D1. */
export function isPageContent(x: unknown): x is PageContent {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.slug === 'string' &&
    typeof p.title === 'string' &&
    typeof p.description === 'string' &&
    (p.ground === 'ink' || p.ground === 'cream') &&
    Array.isArray(p.blocks) &&
    p.blocks.every(isBlock)
  );
}

export function isSaveDraftRequest(x: unknown): x is SaveDraftRequest {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Record<string, unknown>;
  return typeof p.slug === 'string' && isPageContent(p.content);
}
