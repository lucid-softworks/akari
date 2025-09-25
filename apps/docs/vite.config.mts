import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3333,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        bluesky: path.resolve(__dirname, 'bluesky.html'),
        clearsky: path.resolve(__dirname, 'clearsky.html'),
        tenor: path.resolve(__dirname, 'tenor.html'),
        libretranslate: path.resolve(__dirname, 'libretranslate.html'),
      },
    },
  },
});
