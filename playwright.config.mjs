// Browser checks for every page of the site. Run against a server that is already up:
//
//   npx playwright test                      (uses http://localhost:4321, the dev server)
//   SITE_URL=https://andrewyu.app npx playwright test
//
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.mjs/,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.SITE_URL || 'http://localhost:4321',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
});
