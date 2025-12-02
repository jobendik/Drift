import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  publicDir: 'public',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    target: 'esnext',
    minify: 'terser',
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    include: ['three', 'yuka', 'dat.gui'],
  },
});
