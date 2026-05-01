import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {}

const buildDate = new Date().toISOString();

// `base: './'` — required so the built `dist/` works when served from the
// repo at /webartests/experiments/aviation-spatialai/dist/ on GitHub Pages.
export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [react()],
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
    // Lazy chunks (XR emulator environments, TF.js) trip the default 500 kB
    // warning even though they're code-split and never load for end-users.
    chunkSizeWarningLimit: 2200,
    rollupOptions: {
      output: {
        // Split the heavy deps into their own chunks. tfjs is dynamic-imported
        // from predictTrajectory.ts so its chunk loads only on first prediction;
        // the others are eager.
        manualChunks: {
          three: ['three'],
          tiles: ['3d-tiles-renderer'],
          xr: ['@react-three/xr'],
          tfjs: ['@tensorflow/tfjs'],
        },
      },
    },
  },
});
