import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      'profitably-puristical-hettie.ngrok-free.dev',
      'localhost'
    ],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('zxing')) return 'vendor-zxing';
            if (id.includes('fuse.js')) return 'vendor-fuse';
            if (id.includes('dexie')) return 'vendor-dexie';
            return 'vendor';
          }
          if (id.includes('/src/pages/survey/')) return 'survey';
        }
      }
    }
  }
});
