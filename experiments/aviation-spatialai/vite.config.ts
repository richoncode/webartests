import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` — required so the built `dist/` works when served from the
// repo at /webartests/experiments/aviation-spatialai/dist/ on GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the very heavy deps so initial parse isn't all one chunk.
        manualChunks: {
          three: ['three'],
          tfjs: ['@tensorflow/tfjs'],
          tiles: ['3d-tiles-renderer'],
          xr: ['@react-three/xr'],
        },
      },
    },
  },
});
