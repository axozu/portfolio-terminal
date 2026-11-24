import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * E2E-смоук на production-сборке: фейковый API (MSW) работает и там.
 * Перед запуском нужна сборка: `npm run build`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: 'retain-on-failure',
    locale: 'en-US',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run preview -- --port ${String(PORT)} --strictPort`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env.CI,
  },
});
