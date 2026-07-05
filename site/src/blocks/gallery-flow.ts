/**
 * gallery-flow — v2 "Light Sage World" redirect (DESIGN.md top banner, item 4):
 * "Gallery images slide diagonally across the screen — a continuous angled
 * stream, not a static grid." A full-bleed band, rotated ~-10deg, holds two
 * lanes of mixed-size images that marquee-loop along the diagonal in opposite
 * directions (lane 2 slower, for depth). Scroll velocity nudges lane speed
 * (see ../motion/marquee.ts for the pattern this mirrors). Hovering a lane
 * pauses it and scales the hovered image. Reduced motion drops the travel
 * entirely — a still diagonal composition, gentle fade only.
 *
 * Halftone treatment: a CSS filter + grain overlay on a plain <img>, NOT the
 * particleImage canvas engine. Measured in this repo (see gallery-flow.css
 * perf note): with the canvas engine mounted inside the moving/rotated lane,
 * 10 images held ~50fps in this sandbox's software-rendered headless Chromium
 * (vs. a clean 60fps with plain <img>s) — the canvas repaint cost fights the
 * marquee loop specifically because it's translating *and* rotated. The brief
 * allows this trade explicitly; taking it here.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { GalleryFlowProps, GalleryFlowItem } from '@shared/types';
import type { BlockRenderer, Cleanup, RenderCtx } from './contract';
import { el, blockRoot } from './contract';
import { entrance } from '../motion';
import './gallery-flow.css';

gsap.registerPlugin(ScrollTrigger);

const LANE_COUNT = 2;
/** seconds per full loop, one entry per lane (lane 2 noticeably slower) */
const LANE_PERIOD = [36, 50];
/** 1 = travels toward -x (leftward on the un-rotated band axis), -1 = reverse */
const LANE_DIR: (1 | -1)[] = [1, -1];

function makeFigure(item: GalleryFlowItem, propIndex: number): HTMLElement {
  const img = el('img', {
    class: 'gallery__img',
    src: item.image.src,
    alt: item.image.alt,
    'data-edit-img': `items.${propIndex}.image`,
    loading: 'lazy',
    decoding: 'async',
  });

  const media = el('div', { class: 'gallery__media' }, [img]);
  if (item.treatment === 'halftone') media.classList.add('gallery__media--halftone');

  const frame = el(
    'div',
    {
      class: `gallery__frame gallery__frame--${item.treatment}`,
      style: `--item-rotate: ${item.rotation ?? 0}deg`,
      'data-cursor': 'link',
      'data-cursor-badge': 'VIEW',
    },
    [media],
  );

  const caption = el('figcaption', { class: 'meta gallery__caption' }, [
    `${String(propIndex + 1).padStart(2, '0')} — ${item.image.alt}`,
  ]);

  return el('figure', { class: `gallery__item gallery__item--${item.size}` }, [frame, caption]);
}

export const galleryFlow: BlockRenderer<GalleryFlowProps> = {
  type: 'gallery-flow',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'gallery', type: 'gallery-flow', props: {} }, 'cream');
    root.classList.add('gallery');

    const kicker = el('p', { class: 'kicker', 'data-edit': 'kicker' }, [props.kicker]);
    const rule = el('hr', { class: 'rule gallery__rule' });
    const head = el('div', { class: 'gallery__head section-inner' }, [kicker, rule]);

    // Split items round-robin across lanes so both read as a mixed stream.
    const lanes: { item: GalleryFlowItem; propIndex: number }[][] = Array.from(
      { length: LANE_COUNT },
      () => [],
    );
    props.items.forEach((item, i) => lanes[i % LANE_COUNT].push({ item, propIndex: i }));

    const band = el('div', { class: 'gallery__band' });
    lanes.forEach((laneItems, laneI) => {
      if (!laneItems.length) return;
      const set = el(
        'div',
        { class: 'gallery__set' },
        laneItems.map(({ item, propIndex }) => makeFigure(item, propIndex)),
      );
      const track = el('div', { class: 'gallery__track' }, [set]);
      const lane = el('div', { class: `gallery__lane gallery__lane--${laneI}` }, [track]);
      band.append(lane);
    });

    const stage = el('div', { class: 'gallery__stage' }, [band]);

    root.append(head, stage);
    return root;
  },

  mount(root, _props, ctx?: RenderCtx): Cleanup {
    const stage = root.querySelector<HTMLElement>('.gallery__stage')!;
    const head = root.querySelector<HTMLElement>('.gallery__head')!;
    const laneEls = Array.from(root.querySelectorAll<HTMLElement>('.gallery__lane'));

    let alive = true;

    entrance(head, { delay: ctx?.reducedMotion ? 0 : 0.05 });

    const reduced = ctx?.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // Static diagonal composition only — no travel, no scroll nudge.
      return () => {
        alive = false;
      };
    }

    const tweens: gsap.core.Tween[] = [];
    const laneHandlers: { lane: HTMLElement; enter: () => void; leave: () => void }[] = [];
    let resizeT = 0;
    let st: ScrollTrigger | undefined;

    const build = () => {
      tweens.forEach((t) => t.kill());
      tweens.length = 0;
      laneHandlers.forEach(({ lane, enter, leave }) => {
        lane.removeEventListener('mouseenter', enter);
        lane.removeEventListener('mouseleave', leave);
      });
      laneHandlers.length = 0;

      laneEls.forEach((lane, i) => {
        const track = lane.querySelector<HTMLElement>('.gallery__track');
        const set = track?.querySelector<HTMLElement>('.gallery__set');
        if (!track || !set) return;

        track.querySelectorAll('.gallery__set--clone').forEach((n) => n.remove());
        const clone = set.cloneNode(true) as HTMLElement;
        clone.classList.add('gallery__set--clone');
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('[data-edit-img]').forEach((n) => n.removeAttribute('data-edit-img'));
        track.append(clone);

        gsap.set(track, { x: 0 });
        const distance = set.getBoundingClientRect().width;
        const dir = LANE_DIR[i % LANE_DIR.length];
        const period = LANE_PERIOD[i % LANE_PERIOD.length];
        const tween =
          dir === 1
            ? gsap.to(track, { x: -distance, duration: period, ease: 'none', repeat: -1 })
            : gsap.fromTo(track, { x: -distance }, { x: 0, duration: period, ease: 'none', repeat: -1 });
        tweens.push(tween);

        const enter = () => tween.pause();
        const leave = () => tween.play();
        lane.addEventListener('mouseenter', enter);
        lane.addEventListener('mouseleave', leave);
        laneHandlers.push({ lane, enter, leave });
      });
    };

    // Wait a frame so fonts/layout settle before measuring lane widths.
    const raf = requestAnimationFrame(build);
    const onResize = () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(build, 150);
    };
    window.addEventListener('resize', onResize);

    // Scroll-velocity nudge — same shape as motion/marquee.ts.
    st = ScrollTrigger.create({
      trigger: stage,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const velocity = gsap.utils.clamp(-1, 1, self.getVelocity() / 2500);
        tweens.forEach((t) => gsap.to(t, { timeScale: 1 + velocity * 0.4, duration: 0.4, overwrite: true }));
      },
      onLeave: () => tweens.forEach((t) => gsap.to(t, { timeScale: 1, duration: 0.6, overwrite: true })),
      onLeaveBack: () => tweens.forEach((t) => gsap.to(t, { timeScale: 1, duration: 0.6, overwrite: true })),
    });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeT);
      window.removeEventListener('resize', onResize);
      laneHandlers.forEach(({ lane, enter, leave }) => {
        lane.removeEventListener('mouseenter', enter);
        lane.removeEventListener('mouseleave', leave);
      });
      tweens.forEach((t) => t.kill());
      st?.kill();
    };
  },
};
