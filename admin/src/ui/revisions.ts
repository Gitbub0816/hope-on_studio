/**
 * Revision history — a slide-in panel listing GET /api/revisions/:slug.
 *
 * Limitation: the worker exposes revision *summaries* and a single
 * GET /api/content/:slug that returns the latest *published* revision only —
 * there is no endpoint to fetch an arbitrary revision's block JSON. So
 * "Restore" reloads the latest published content into the draft; per-revision
 * restore would need a `GET /api/revisions/:slug/:id` route on the worker.
 */
import type { RevisionSummary } from '@shared/types';
import { listRevisions } from '../api';
import { h, relativeTime } from '../util';

export interface RevisionsDeps {
  getSlug(): string;
  onRestoreLatest(): void;
}

export class Revisions {
  readonly el: HTMLElement;
  private deps: RevisionsDeps;
  private list: HTMLElement;

  constructor(deps: RevisionsDeps) {
    this.deps = deps;
    this.list = h('div', { class: 'revs__list' });
    const panel = h('div', { class: 'revs__panel', role: 'dialog', 'aria-label': 'Revision history' }, [
      h('div', { class: 'revs__head' }, [
        h('p', { class: 'revs__eyebrow kicker' }, ['History']),
        h('h2', { class: 'revs__title' }, ['Revisions']),
      ]),
      this.list,
      h('p', { class: 'revs__note whisper' }, [
        'Restore brings back the last published version of this page as a new draft.',
      ]),
    ]);
    const close = h('button', { class: 'revs__close', type: 'button', 'aria-label': 'Close' }, ['✕']);
    close.addEventListener('click', () => this.hide());
    panel.append(close);

    this.el = h('div', { class: 'revs', role: 'presentation' }, [panel]);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.hide();
    });
  }

  async open(): Promise<void> {
    this.el.classList.add('is-open');
    this.list.innerHTML = '';
    this.list.append(h('p', { class: 'revs__loading whisper' }, ['Loading…']));
    const rows = await listRevisions(this.deps.getSlug());
    this.list.innerHTML = '';
    if (!rows) {
      this.list.append(
        h('p', { class: 'revs__empty whisper' }, ['History is unavailable offline.']),
      );
      return;
    }
    if (!rows.length) {
      this.list.append(h('p', { class: 'revs__empty whisper' }, ['No revisions yet.']));
      return;
    }
    rows.forEach((r) => this.list.append(this.row(r)));
  }

  private row(r: RevisionSummary): HTMLElement {
    const when = r.publishedAt ?? r.createdAt;
    const stamp = Number.isNaN(Date.parse(when)) ? when : relativeTime(Date.parse(when));
    const meta = h('div', { class: 'revs__row-meta' }, [
      h('span', { class: `revs__badge revs__badge--${r.status}` }, [r.status]),
      h('span', { class: 'revs__when meta' }, [`#${r.id} · ${stamp}`]),
    ]);
    const row = h('div', { class: 'revs__row' }, [meta]);
    if (r.status === 'published') {
      const btn = h('button', { class: 'revs__restore', type: 'button' }, ['Restore']);
      btn.addEventListener('click', () => {
        this.deps.onRestoreLatest();
        this.hide();
      });
      row.append(btn);
    }
    return row;
  }

  hide(): void {
    this.el.classList.remove('is-open');
  }
}
