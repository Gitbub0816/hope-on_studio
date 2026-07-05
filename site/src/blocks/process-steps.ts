/**
 * process-steps — elegant vertical editorial list (like the triptych index
 * numerals). Each step: giant ghost numeral, Fraunces h3 title, measure-width
 * body. A thin progress rule draws down the left margin as you scroll through
 * the steps, echoing v1's thin-line map rules.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { ProcessStepsProps, ProcessStep } from '@shared/types';
import type { BlockRenderer, Cleanup, RenderCtx } from './contract';
import { el, blockRoot } from './contract';
import { entrance } from '../motion';
import './process-steps.css';

gsap.registerPlugin(ScrollTrigger);

export const processSteps: BlockRenderer<ProcessStepsProps> = {
  type: 'process-steps',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'process', type: 'process-steps', props: {} }, 'cream');
    root.classList.add('process-steps');

    const head = el('div', { class: 'process-steps__head' }, [
      el('p', { class: 'kicker', 'data-edit': 'kicker' }, [props.kicker]),
      el('h2', { class: 'process-steps__heading', 'data-edit': 'heading' }, [props.heading]),
    ]);

    const track = el('div', { class: 'process-steps__track', 'aria-hidden': 'true' }, [
      el('div', { class: 'process-steps__progress' }),
    ]);

    const list = el('ol', { class: 'process-steps__list' });
    props.steps.forEach((step, i) => {
      list.append(buildStep(step, i));
    });

    const body = el('div', { class: 'process-steps__body' }, [track, list]);

    root.append(el('div', { class: 'section-inner' }, [head, body]));
    return root;
  },

  mount(root, _props, ctx: RenderCtx): Cleanup {
    entrance(root);

    const steps = Array.from(root.querySelectorAll<HTMLElement>('.process-steps__step'));
    steps.forEach((step, i) => {
      if (ctx.reducedMotion) {
        gsap.set(step, { autoAlpha: 1 });
        return;
      }
      gsap.from(step, {
        autoAlpha: 0,
        y: 32,
        duration: 0.9,
        ease: 'power3.out',
        delay: i * 0.04,
        scrollTrigger: { trigger: step, start: 'top 85%', once: true },
      });
    });

    let progressTrigger: ScrollTrigger | undefined;
    const progress = root.querySelector<HTMLElement>('.process-steps__progress');
    const track = root.querySelector<HTMLElement>('.process-steps__track');
    const list = root.querySelector<HTMLElement>('.process-steps__list');

    if (progress && track && list) {
      if (ctx.reducedMotion) {
        gsap.set(progress, { scaleY: 1 });
      } else {
        gsap.set(progress, { scaleY: 0, transformOrigin: 'top center' });
        progressTrigger = ScrollTrigger.create({
          trigger: list,
          start: 'top 60%',
          end: 'bottom 60%',
          scrub: 0.4,
          onUpdate: (self) => gsap.set(progress, { scaleY: self.progress }),
        });
      }
    }

    return () => {
      progressTrigger?.kill();
    };
  },
};

function buildStep(step: ProcessStep, i: number): HTMLElement {
  const numeral = el('span', { class: 'process-steps__n', 'aria-hidden': 'true' }, [step.n]);
  const title = el('h3', { class: 'process-steps__title', 'data-edit': `steps.${i}.title` }, [
    step.title,
  ]);
  const body = el('p', { class: 'process-steps__copy', 'data-edit': `steps.${i}.body` }, [
    step.body,
  ]);
  return el('li', { class: 'process-steps__step' }, [
    numeral,
    el('div', { class: 'process-steps__text' }, [title, body]),
  ]);
}
