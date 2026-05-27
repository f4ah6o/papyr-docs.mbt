import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PAPYR_DOCS_E2E_BASE_URL ?? 'http://127.0.0.1:8787';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/mobile-slide.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit-mobile',
      testMatch: ['**/mobile-slide.spec.ts'],
      use: { ...devices['iPhone 12'], browserName: 'webkit' },
    },
  ],
  webServer: {
    command: 'pnpm run e2e:dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      PAPYR_DOCS_R2_BUCKET: 'papyr-docs-e2e',
      PAPYR_DOCS_R2_PREVIEW_BUCKET: 'papyr-docs-e2e',
    },
  },
});
