import { defineConfig, devices } from '@playwright/test';

const API_PORT = 5055;
const WEB_PORT = 5175;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Self-contained: API runs against a throw-away in-memory MongoDB (seeded); never touches Atlas.
  webServer: [
    {
      command: 'npm run dev:memory -w backend',
      cwd: '..',
      url: `http://localhost:${API_PORT}/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: { PORT: String(API_PORT), NODE_ENV: 'development', CLIENT_URL: `http://localhost:${WEB_PORT}`, RATE_LIMIT_ENABLED: 'false' },
    },
    {
      command: `npm run dev -w frontend -- --port ${WEB_PORT} --strictPort`,
      cwd: '..',
      url: `http://localhost:${WEB_PORT}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_BASE_URL: `http://localhost:${API_PORT}/api/v1`, VITE_API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
