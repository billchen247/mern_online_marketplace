import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    hookTimeout: 60000,
    testTimeout: 30000,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/scripts/**', 'src/types/**'],
      reporter: ['text-summary', 'lcov', 'json-summary'],
      thresholds: { statements: 80, functions: 80, lines: 80, branches: 70 },
    },
  },
});
