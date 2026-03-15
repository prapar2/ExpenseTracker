import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const clientDir = resolve(import.meta.dirname);

export default defineConfig({
  base: './',
  root: clientDir,
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        (await import('tailwindcss')).default({
          content: [
            resolve(clientDir, 'index.html'),
            resolve(clientDir, 'src/**/*.{js,jsx}'),
          ],
          theme: {
            extend: {
              colors: {
                primary: '#1B3A6B',
                accent: '#2E75B6',
                positive: '#1A6B3A',
                negative: '#B03030',
                warning: '#856404',
                income: '#2E75B6',
                expense: '#B03030',
                saving: '#1A6B3A',
              },
            },
          },
          plugins: [],
        }),
        (await import('autoprefixer')).default(),
      ],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: resolve(clientDir, 'dist'),
  },
});
