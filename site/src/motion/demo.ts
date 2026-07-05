/**
 * DEV-ONLY demo harness exercising every export of the motion layer.
 * Not part of the shipped site — loaded only by /motion-demo.html.
 */
import '../boot';
import './demo.css';
import {
  initMotion,
  initCursor,
  entrance,
  ghostHeading,
  scatterWords,
  marquee,
  magnetic,
  parallax,
} from './index';

initMotion();
initCursor();

document.querySelectorAll<HTMLElement>('.demo-section').forEach((section) => entrance(section));

const ghostTarget = document.querySelector<HTMLElement>('.ghost-target');
if (ghostTarget) ghostHeading(ghostTarget);

const scatterTarget = document.querySelector<HTMLElement>('.scatter-line');
if (scatterTarget) scatterWords(scatterTarget);

document.querySelectorAll<HTMLElement>('.magnetic-btn').forEach((btn) => magnetic(btn));

document.querySelectorAll<HTMLElement>('.gallery-card').forEach((card) => {
  const depth = Number(card.dataset.depth ?? '0');
  parallax(card, depth);
});

const marqueeTarget = document.querySelector<HTMLElement>('.marquee-el');
if (marqueeTarget) marquee(marqueeTarget);

// Draw a simple placeholder gradient into the demo canvas so entrance() has
// real media to reveal.
const canvas = document.querySelector<HTMLCanvasElement>('.demo-canvas');
const ctx = canvas?.getContext('2d');
if (canvas && ctx) {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#8a9484');
  gradient.addColorStop(1, '#b08d7a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
