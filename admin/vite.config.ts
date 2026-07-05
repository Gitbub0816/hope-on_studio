import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Admin visual editor — imports the real site block registry so the preview
// is pixel-identical to the public site. Its own root/port so it can run
// alongside the site dev server.
export default defineConfig({
  root: resolve(__dirname, '.'),
  publicDir: resolve(__dirname, '../site/public'),
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared'),
      '@engine': resolve(__dirname, '../site/src/engine'),
      '@motion': resolve(__dirname, '../site/src/motion'),
      '@blocks': resolve(__dirname, '../site/src/blocks'),
      '@styles': resolve(__dirname, '../site/src/styles'),
      '@site': resolve(__dirname, '../site/src'),
    },
  },
  build: {
    outDir: resolve(__dirname, '../dist/admin'),
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: { index: resolve(__dirname, 'index.html') },
    },
  },
  server: {
    port: 5174,
    proxy: { '/api': 'http://127.0.0.1:8787', '/media': 'http://127.0.0.1:8787' },
  },
});
