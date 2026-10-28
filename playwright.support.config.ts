import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/** Support scenarios need isolated accounts but no seeded catalog or external storage. */
const support = { ...base };
delete support.globalTeardown;
export default defineConfig({
  ...support,
  globalSetup: './e2e/support-setup.ts',
  testMatch: /support-tickets\.spec\.ts/,
  projects: [{ name: 'support', use: { ...devices['Desktop Chrome'] } }],
  workers: 1,
  fullyParallel: false,
});
