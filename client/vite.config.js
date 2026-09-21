import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// In development the browser talks to Vite (5173) and Vite forwards /api to the Node server,
// so there is no CORS to configure and the client code can always use relative URLs.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:4000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    css: false,
  },
});
