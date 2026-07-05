/**
 * stats-editorial — the map/stats moment (v1_sheet_03: thin-line map, huge
 * serif numeral "31 MIN."). Kicker + heading, then a row of huge Fraunces
 * numerals with small-caps labels beneath, separated by thin rules. Numbers
 * count up on scroll-enter; reduced motion serves the static final value.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { StatsEditorialProps, StatItem } from '@shared/types';
import type { BlockRenderer, Cleanup, RenderCtx } from './contract';
import { el, blockRoot } from './contract';
import { entrance } from '../motion';
import './stats-editorial.css';

gsap.registerPlugin(ScrollTrigger);

export const statsEditorial: BlockRenderer<StatsEditorialProps> = {
  type: 'stats-editorial',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'stats', type: 'stats-editorial', props: {} }, 'cream');
    root.classList.add('stats-editorial');

    const head = el('div', { class: 'stats-editorial__head' }, [
      el('p', { class: 'kicker', 'data-edit': 'kicker' }, [props.kicker]),
      el('h2', { class: 'stats-editorial__heading', 'data-edit': 'heading' }, [props.heading]),
    ]);

    const row = el('div', { class: 'stats-editorial__row' });
    props.stats.forEach((stat, i) => {
      row.append(buildColumn(stat, i));
    });

    root.append(el('div', { class: 'section-inner' }, [head, row]));
    return root;
  },

  mount(root, props, ctx: RenderCtx): Cleanup {
    entrance(root);

    const triggers: ScrollTrigger[] = [];
    const numerals = Array.from(root.querySelectorAll<HTMLElement>('.stats-editorial__value'));

    numerals.forEach((numEl, i) => {
      const raw = props.stats[i]?.value ?? '';
      const target = parseFloat(raw);
      if (Number.isNaN(target)) return; // non-numeric value — leave the literal text

      if (ctx.reducedMotion) {
        numEl.textContent = raw;
        return;
      }

      const decimals = (raw.split('.')[1] ?? '').length;
      const counter = { n: 0 };
      const st = ScrollTrigger.create({
        trigger: root,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          gsap.to(counter, {
            n: target,
            duration: 1.4,
            ease: 'power2.out',
            delay: 0.15 + i * 0.08,
            onUpdate: () => {
              numEl.textContent = counter.n.toFixed(decimals);
            },
            onComplete: () => {
              numEl.textContent = raw;
            },
          });
        },
      });
      triggers.push(st);
    });

    return () => {
      triggers.forEach((t) => t.kill());
    };
  },
};

function buildColumn(stat: StatItem, i: number): HTMLElement {
  const numWrap = el('p', { class: 'stats-editorial__num' }, [
    el('span', { class: 'stats-editorial__value', 'data-edit': `stats.${i}.value` }, [stat.value]),
    ...(stat.suffix
      ? [el('span', { class: 'stats-editorial__suffix', 'data-edit': `stats.${i}.suffix` }, [stat.suffix])]
      : []),
  ]);
  const label = el('p', { class: 'meta stats-editorial__label', 'data-edit': `stats.${i}.label` }, [
    stat.label,
  ]);
  return el('div', { class: 'stats-editorial__col' }, [numWrap, label]);
}
