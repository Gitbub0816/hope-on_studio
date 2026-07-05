/**
 * API client for the editor. Every call degrades gracefully: when the worker
 * is unreachable the editor keeps working against bundled seed content and
 * object-URL media (offline draft mode).
 */
import type { PageContent, RevisionSummary } from '@shared/types';
import { apiSlug } from './seeds';

export interface LoadResult {
  content: PageContent | null;
  online: boolean;
}

const TIMEOUT = 2500;

async function timedFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(TIMEOUT) });
}

/** Load the published content for a slug. Returns online:false if unreachable. */
export async function loadContent(slug: string): Promise<LoadResult> {
  try {
    const res = await timedFetch(`/api/content/${apiSlug(slug)}`);
    if (res.ok) return { content: (await res.json()) as PageContent, online: true };
    // Reachable but no published revision yet (404) — still "online".
    if (res.status === 404) return { content: null, online: true };
    return { content: null, online: false };
  } catch {
    return { content: null, online: false };
  }
}

export interface SaveResult {
  ok: boolean;
  online: boolean;
}

/** Save a draft revision. */
export async function saveDraft(slug: string, content: PageContent): Promise<SaveResult> {
  try {
    const res = await timedFetch('/api/draft', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: apiSlug(slug), content }),
    });
    return { ok: res.ok, online: true };
  } catch {
    return { ok: false, online: false };
  }
}

/** Promote the latest draft to published. */
export async function publish(slug: string): Promise<SaveResult> {
  try {
    const res = await timedFetch(`/api/publish/${apiSlug(slug)}`, { method: 'POST' });
    return { ok: res.ok, online: true };
  } catch {
    return { ok: false, online: false };
  }
}

export async function listRevisions(slug: string): Promise<RevisionSummary[] | null> {
  try {
    const res = await timedFetch(`/api/revisions/${apiSlug(slug)}`);
    if (!res.ok) return null;
    return (await res.json()) as RevisionSummary[];
  } catch {
    return null;
  }
}

export async function getRevisionContent(slug: string, id: number): Promise<PageContent | null> {
  try {
    const res = await timedFetch(`/api/revisions/${apiSlug(slug)}/${id}`);
    if (!res.ok) return null;
    return (await res.json()) as PageContent;
  } catch {
    return null;
  }
}

export interface MediaResult {
  src: string;
  offline: boolean;
}

/** Upload an image. Offline fallback: a local object URL (session-only). */
export async function uploadMedia(file: File, alt: string): Promise<MediaResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('alt', alt);
  try {
    const res = await fetch('/api/media', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const json = (await res.json()) as { src: string };
      return { src: json.src, offline: false };
    }
  } catch {
    /* fall through to object URL */
  }
  return { src: URL.createObjectURL(file), offline: true };
}
