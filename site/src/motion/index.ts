/**
 * Motion layer entry point — see context/BUILD-CONTRACTS.md § Motion for the
 * frozen interface. Register GSAP plugins once here; every sibling module
 * assumes registration already happened by the time its exported function runs.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

import '../styles/motion.css';

gsap.registerPlugin(ScrollTrigger, SplitText);

export { initMotion } from './init';
export { entrance } from './entrance';
export type { EntranceOpts } from './entrance';
export { ghostHeading } from './ghost-heading';
export { scatterWords } from './scatter-words';
export { marquee } from './marquee';
export { magnetic } from './magnetic';
export { initCursor } from './cursor';
export { parallax } from './parallax';
