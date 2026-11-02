import { defineConfig, devices } from '@playwright/test';

const ci = Boolean(process.env['CI']);

// Browser tests run against the built game served by `vite preview`.
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build:web && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !ci,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
