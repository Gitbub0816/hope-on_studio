/**
 * Editor entry. Pulls in the exact fonts + design tokens the public site uses
 * (so the canvas is pixel-identical), then the editor chrome styles, then boots.
 */
import '@fontsource-variable/fraunces/index.css';
import '@fontsource-variable/figtree/index.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@styles/tokens.css';
import '@styles/base.css';
import './editor.css';

import { mountEditor } from './app';

const root = document.querySelector<HTMLElement>('#editor');
if (root) mountEditor(root);
