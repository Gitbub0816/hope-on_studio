/**
 * Revision history — a slide-in panel listing GET /api/revisions/:slug.
 * Restore fetches that revision's full content via
 * GET /api/revisions/:slug/:id and loads it into the draft.
 */
import type { RevisionSummary } from '@shared/types';
import { listRevisions } from '../api';
import { h, relativeTime } from '../util';

export interface RevisionsDeps {
  getSlug(): string;
  onRestore(id: number): void;
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
        'Restore brings any version of this page back as a new draft — nothing is ever lost.',
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
    const btn = h('button', { class: 'revs__restore', type: 'button' }, ['Restore']);
    btn.addEventListener('click', () => {
      this.deps.onRestore(r.id);
      this.hide();
    });
    row.append(btn);
    return row;
  }

  hide(): void {
    this.el.classList.remove('is-open');
  }
}
