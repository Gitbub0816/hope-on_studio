import '@styles/tokens.css';
import '@styles/base.css';
import { galleryFlow } from './src/blocks/gallery-flow';
import type { GalleryFlowProps } from '@shared/types';

const props: GalleryFlowProps = {
  kicker: 'From the Studio',
  items: [
    { image: { src: '/assets/art/gallery-01.jpg', alt: 'Journal spread' }, size: 'lg', treatment: 'halftone', rotation: -2 },
    { image: { src: '/assets/art/gallery-02.jpg', alt: 'Still-life photograph' }, size: 'md', treatment: 'photo', rotation: 1.5 },
    { image: { src: '/assets/art/gallery-03.jpg', alt: 'Storyboard sketches' }, size: 'sm', treatment: 'photo', rotation: 3 },
    { image: { src: '/assets/art/gallery-04.jpg', alt: 'Cloth-bound book' }, size: 'md', treatment: 'halftone', rotation: -1 },
    { image: { src: '/assets/art/gallery-05.jpg', alt: 'Contact sheet' }, size: 'lg', treatment: 'photo', rotation: 2 },
    { image: { src: '/assets/art/gallery-01.jpg', alt: 'Journal spread 2' }, size: 'sm', treatment: 'halftone', rotation: 2 },
    { image: { src: '/assets/art/gallery-02.jpg', alt: 'Still-life 2' }, size: 'lg', treatment: 'photo', rotation: -3 },
    { image: { src: '/assets/art/gallery-03.jpg', alt: 'Storyboard 2' }, size: 'md', treatment: 'photo', rotation: 1 },
    { image: { src: '/assets/art/gallery-04.jpg', alt: 'Cloth book 2' }, size: 'sm', treatment: 'halftone', rotation: -2 },
    { image: { src: '/assets/art/gallery-05.jpg', alt: 'Contact sheet 2' }, size: 'md', treatment: 'photo', rotation: 3 },
  ],
};

const app = document.getElementById('app')!;
const root = galleryFlow.render(props, { page: {} as any, index: 0, reducedMotion: false });
app.append(root);
galleryFlow.mount?.(root, props, { page: {} as any, index: 0, reducedMotion: false });

(window as any).__fpsProbe = () =>
  new Promise((resolve) => {
    const results: number[] = [];
    let bucketStart = performance.now();
    let frames = 0;
    const overallStart = performance.now();
    function tick() {
      frames++;
      const now = performance.now();
      if (now - bucketStart >= 1000) {
        results.push(+(frames / ((now - bucketStart) / 1000)).toFixed(1));
        frames = 0;
        bucketStart = now;
      }
      if (now - overallStart < 5000) requestAnimationFrame(tick);
      else resolve(results);
    }
    requestAnimationFrame(tick);
  });
