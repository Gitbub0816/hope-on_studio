/** Bundled seed content — the offline source of truth when the API is down. */
import type { PageContent } from '@shared/types';
import landing from '@shared/content/landing.json';
import publishing from '@shared/content/publishing.json';
import photography from '@shared/content/photography.json';
import learningDesign from '@shared/content/learning-design.json';

export interface PageDef {
  /** API/url slug: '' for landing (mapped to 'landing' on the wire). */
  slug: string;
  /** Human label for the page switcher. */
  label: string;
  seed: PageContent;
}

export const PAGES: PageDef[] = [
  { slug: '', label: 'Landing', seed: landing as unknown as PageContent },
  { slug: 'publishing', label: 'Publishing', seed: publishing as unknown as PageContent },
  { slug: 'photography', label: 'Photography', seed: photography as unknown as PageContent },
  {
    slug: 'learning-design',
    label: 'Learning Design',
    seed: learningDesign as unknown as PageContent,
  },
];

export function seedFor(slug: string): PageContent {
  return (PAGES.find((p) => p.slug === slug) ?? PAGES[0]).seed;
}

/** Wire slug: the API maps '' <-> 'landing'. */
export function apiSlug(slug: string): string {
  return slug === '' ? 'landing' : slug;
}
