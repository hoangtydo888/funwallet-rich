import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { crx } from '@crxjs/vite-plugin';
import path from 'path';
import manifest from './src/extension/public/manifest.json';

export default defineConfig({
  root: './src/extension',
  publicDir: 'public',
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    outDir: '../../dist-extension',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        inpage: path.resolve(__dirname, 'src/extension/src/content/inpage.ts'),
        content: path.resolve(__dirname, 'src/extension/src/content/inject.ts'),
      },
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: (chunkInfo) => {
          // Page scripts live at the root under fixed names; the worker registers them
          if (chunkInfo.name === 'inpage' || chunkInfo.name === 'content') {
            return `${chunkInfo.name}.js`;
          }
          return 'assets/[name]-[hash].js';
        },
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 5174,
    hmr: {
      port: 5174,
    },
  },
});
