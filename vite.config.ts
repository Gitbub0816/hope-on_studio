import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Public site — multi-page app. The admin editor has its own config (admin/vite.config.ts).
export default defineConfig({
  root: 'site',
  publicDir: 'public',
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'shared'),
      '@engine': resolve(__dirname, 'site/src/engine'),
      '@motion': resolve(__dirname, 'site/src/motion'),
      '@blocks': resolve(__dirname, 'site/src/blocks'),
      '@styles': resolve(__dirname, 'site/src/styles'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist/site'),
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'site/index.html'),
        publishing: resolve(__dirname, 'site/publishing/index.html'),
        photography: resolve(__dirname, 'site/photography/index.html'),
        'learning-design': resolve(__dirname, 'site/learning-design/index.html'),
        404: resolve(__dirname, 'site/404.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
});
