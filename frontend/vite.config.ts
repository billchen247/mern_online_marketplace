/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Dev convenience: forward local uploads from the API server.
    proxy: { '/uploads': process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000' },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|axios|scheduler)\//.test(id)) return 'vendor';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    // same origin as the mocked API so jsdom XHR does not trigger CORS
    environmentOptions: { jsdom: { url: 'http://localhost:5000/' } },
    globals: true,
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000,
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/types/**', 'src/vite-env.d.ts'],
      reporter: ['text-summary', 'lcov', 'json-summary'],
      thresholds: { statements: 80, functions: 80, lines: 80, branches: 70 },
    },
  },
});
