import '@styles/tokens.css';
import '@styles/base.css';
import { galleryFlow } from './src/blocks/gallery-flow';
import type { GalleryFlowProps } from '@shared/types';

const props: GalleryFlowProps = {
  kicker: 'From the Studio',
  items: Array.from({ length: 10 }, (_, i) => ({
    image: { src: `/assets/art/gallery-0${(i % 5) + 1}.jpg`, alt: `Image ${i}` },
    size: (['lg', 'md', 'sm'] as const)[i % 3],
    treatment: 'photo' as const, // no halftone this time
    rotation: (i % 5) - 2,
  })),
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
