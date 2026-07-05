/* ============================================================
   Hope On Studio — visual engine (public API)

   Two effects, both canvas-based, both editable-by-design and
   reduced-motion aware. See BUILD-CONTRACTS.md § Engine.

     particleImage(host, opts) → warm halftone dot/glyph field,
       scroll-scrubbed assembly (assemble | slats), or static at
       a given progress for the editor.

     bloom(host, opts) → the reserved floral magic moment;
       procedural watercolour petals unfurling then settling.
   ============================================================ */

export { particleImage } from './particle-image';
export type {
  ParticleImageOptions,
  ParticleImageHandle,
  ParticleVariant,
  Palette,
} from './particle-image';

export { bloom } from './bloom';
export type {
  BloomOptions,
  BloomHandle,
  BloomHue,
  BloomIntensity,
  BloomTrigger,
} from './bloom';

export { vinesLayer } from './vines';
export type { VinesOptions, VinesHandle, VineDensity, VineZone } from './vines';
