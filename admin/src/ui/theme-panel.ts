/**
 * Theme panel — a left slide-in drawer for the sitewide look: grounds, text &
 * ornament, the vine hues, the three type faces, and overall type size. Every
 * change previews live on the whole document (chrome + canvas). Saving PUTs to
 * /api/settings/theme and publishes to the whole site immediately — this panel
 * is deliberately separate from page drafts, and says so.
 */
import type { FontKey, Theme } from '@shared/types';
import { FONTS } from '../../../site/src/fonts';
import { getTheme, saveTheme } from '../api';
import { applyTheme, DEFAULT_THEME, isHexColor, normalizeHex } from '../theme';
import { clone, h } from '../util';
import { toast } from './toast';

type FontRole = 'display' | 'italic' | 'ui';
type PanelSave = 'clean' | 'unsaved' | 'saving' | 'saved' | 'offline' | 'error';

interface ColorRowDef {
  key: keyof Theme['colors'];
  label: string;
}

const GROUNDS: ColorRowDef[] = [
  { key: 'cream', label: 'Page background' },
  { key: 'sageTint', label: 'Deeper background' },
];
const TEXT_ORNAMENT: ColorRowDef[] = [
  { key: 'ink', label: 'Text' },
  { key: 'champagne', label: 'Gold accents' },
];
const VINES: ColorRowDef[] = [
  { key: 'vineFuchsia', label: 'Vine pink' },
  { key: 'vineViolet', label: 'Vine violet' },
  { key: 'vineTeal', label: 'Vine teal' },
  { key: 'vineMarigold', label: 'Vine marigold' },
  { key: 'vineLeaf', label: 'Vine leaf' },
];

const FONT_SLOTS: { slot: FontRole; label: string; hint: string }[] = [
  { slot: 'display', label: 'Headings', hint: 'Big serif display face' },
  { slot: 'italic', label: 'Whispers & quotes', hint: 'The italic voice' },
  { slot: 'ui', label: 'Interface', hint: 'Labels, buttons, small print' },
];

export class ThemePanel {
  readonly el: HTMLElement;
  private theme: Theme = clone(DEFAULT_THEME);
  private body: HTMLElement;
  private saveBtn: HTMLButtonElement;
  private saveDot: HTMLElement;
  private saveLabel: HTMLElement;
  private state: PanelSave = 'clean';

  constructor() {
    this.body = h('div', { class: 'theme__body' });

    this.saveDot = h('span', { class: 'theme__save-dot' });
    this.saveLabel = h('span', { class: 'theme__save-label' }, ['Matches the site']);
    const saveState = h('div', { class: 'theme__save-state' }, [this.saveDot, this.saveLabel]);

    this.saveBtn = h('button', { class: 'theme__save', type: 'button' }, ['Save theme']) as HTMLButtonElement;
    this.saveBtn.addEventListener('click', () => void this.save());

    const resetBtn = h('button', { class: 'theme__reset', type: 'button' }, ['Reset to studio default']);
    resetBtn.addEventListener('click', () => this.reset());

    const foot = h('div', { class: 'theme__foot' }, [
      h('p', { class: 'theme__publish-note whisper' }, [
        'Theme changes apply to the whole site the moment you save — they are not part of a page draft.',
      ]),
      saveState,
      h('div', { class: 'theme__foot-actions' }, [resetBtn, this.saveBtn]),
    ]);

    const panel = h('div', { class: 'theme__panel', role: 'dialog', 'aria-label': 'Sitewide theme' }, [
      h('div', { class: 'theme__head' }, [
        h('p', { class: 'theme__eyebrow kicker' }, ['Sitewide']),
        h('h2', { class: 'theme__title' }, ['Theme']),
        h('p', { class: 'theme__sub whisper' }, [
          'Colours and type for the whole studio. Changes preview here instantly.',
        ]),
      ]),
      this.body,
      foot,
    ]);

    const close = h('button', { class: 'theme__close', type: 'button', 'aria-label': 'Close' }, ['✕']);
    close.addEventListener('click', () => this.hide());
    panel.append(close);

    this.el = h('div', { class: 'theme', role: 'presentation' }, [panel]);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.hide();
    });
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });

    this.build();
    this.reflectSave();
  }

  /** Fetch the live theme and apply it on load, so the canvas matches production. */
  async init(): Promise<void> {
    const { theme, online } = await getTheme();
    if (theme) this.theme = theme;
    await applyTheme(this.theme);
    this.state = online ? 'clean' : 'offline';
    this.build();
    this.reflectSave();
  }

  open(): void {
    this.el.classList.add('is-open');
    this.el.querySelector<HTMLElement>('input, select, button')?.focus();
  }

  hide(): void {
    this.el.classList.remove('is-open');
  }

  /* --------------------------------------------------------------- build */

  private build(): void {
    this.body.innerHTML = '';
    this.body.append(
      this.colorSection('Grounds', GROUNDS),
      this.colorSection('Text & Ornament', TEXT_ORNAMENT),
      this.colorSection('Vine Colours', VINES),
      this.fontSection(),
      this.sizeSection(),
    );
  }

  private section(title: string, rows: HTMLElement[]): HTMLElement {
    return h('section', { class: 'theme__section' }, [
      h('p', { class: 'theme__section-label meta' }, [title]),
      ...rows,
    ]);
  }

  private colorSection(title: string, defs: ColorRowDef[]): HTMLElement {
    return this.section(
      title,
      defs.map((d) => this.colorRow(d)),
    );
  }

  private colorRow(def: ColorRowDef): HTMLElement {
    const current = normalizeHex(this.theme.colors[def.key]);

    const swatch = h('input', {
      class: 'theme__swatch',
      type: 'color',
      value: current,
      'aria-label': `${def.label} colour`,
    }) as HTMLInputElement;

    const hex = h('input', {
      class: 'theme__hex',
      type: 'text',
      value: current,
      spellcheck: 'false',
      'aria-label': `${def.label} hex value`,
    }) as HTMLInputElement;

    const commit = (raw: string) => {
      if (!isHexColor(raw)) {
        // Never store an invalid colour — fall back to the previous value.
        hex.value = normalizeHex(this.theme.colors[def.key]);
        return;
      }
      const value = normalizeHex(raw);
      swatch.value = value;
      hex.value = value;
      this.change((t) => {
        t.colors[def.key] = value;
      });
    };

    swatch.addEventListener('input', () => commit(swatch.value));
    hex.addEventListener('change', () => commit(hex.value));
    hex.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') hex.blur();
    });

    return h('label', { class: 'theme__row' }, [
      swatch,
      h('span', { class: 'theme__row-label' }, [def.label]),
      hex,
    ]);
  }

  private fontSection(): HTMLElement {
    return this.section(
      'Fonts',
      FONT_SLOTS.map(({ slot, label, hint }) => this.fontRow(slot, label, hint)),
    );
  }

  private fontRow(slot: FontRole, label: string, hint: string): HTMLElement {
    const select = document.createElement('select');
    select.className = 'theme__font';
    select.setAttribute('aria-label', label);

    const choices = (Object.entries(FONTS) as [FontKey, (typeof FONTS)[FontKey]][]).filter(
      ([, def]) => def.roles.includes(slot),
    );
    for (const [key, def] of choices) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = def.label;
      // Show each option in its own face where the browser has it loaded.
      opt.style.fontFamily = def.family;
      if (this.theme.fonts[slot] === key) opt.selected = true;
      select.append(opt);
    }
    select.addEventListener('change', () => {
      this.change((t) => {
        t.fonts[slot] = select.value as FontKey;
      });
    });

    return h('div', { class: 'theme__field' }, [
      h('span', { class: 'theme__field-label' }, [label]),
      select,
      h('span', { class: 'theme__field-hint whisper' }, [hint]),
    ]);
  }

  private sizeSection(): HTMLElement {
    const value = h('span', { class: 'theme__size-value' }, [`${Math.round(this.theme.typeScale * 100)}%`]);
    const slider = h('input', {
      class: 'theme__slider',
      type: 'range',
      min: '90',
      max: '110',
      step: '1',
      value: String(Math.round(this.theme.typeScale * 100)),
      'aria-label': 'Type size percentage',
    }) as HTMLInputElement;
    slider.addEventListener('input', () => {
      const pct = Number(slider.value);
      value.textContent = `${pct}%`;
      this.change((t) => {
        t.typeScale = pct / 100;
      });
    });
    return this.section('Type size', [
      h('div', { class: 'theme__size' }, [slider, value]),
      h('span', { class: 'theme__field-hint whisper' }, [
        'Nudges every text size across the site together.',
      ]),
    ]);
  }

  /* --------------------------------------------------------------- state */

  private change(mutate: (t: Theme) => void): void {
    mutate(this.theme);
    this.state = 'unsaved';
    this.reflectSave();
    void applyTheme(this.theme);
  }

  private async save(): Promise<void> {
    this.state = 'saving';
    this.reflectSave();
    const res = await saveTheme(this.theme);
    if (res.ok) {
      this.state = 'saved';
      toast('Theme saved — the whole site now wears it.');
    } else if (!res.online) {
      this.state = 'offline';
      toast('Offline — the theme will save once the server is reachable.', { duration: 6000 });
    } else {
      this.state = 'error';
      toast('Could not save the theme just now. Please try again.');
    }
    this.reflectSave();
  }

  private reset(): void {
    const ok = window.confirm(
      'Reset every colour, font, and size back to the studio default? Your current theme stays live until you press Save.',
    );
    if (!ok) return;
    this.theme = clone(DEFAULT_THEME);
    this.state = 'unsaved';
    this.build();
    this.reflectSave();
    void applyTheme(this.theme);
  }

  private reflectSave(): void {
    const map: Record<PanelSave, string> = {
      clean: 'Matches the site',
      unsaved: 'Unsaved changes',
      saving: 'Saving…',
      saved: 'Saved to the site',
      offline: 'Offline — not saved',
      error: 'Save failed',
    };
    this.saveLabel.textContent = map[this.state];
    this.saveDot.dataset.state = this.state;
    this.saveBtn.disabled = this.state === 'saving';
  }
}
