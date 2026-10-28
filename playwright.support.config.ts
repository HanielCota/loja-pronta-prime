import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/** Support and admin update scenarios need no seeded catalog or external storage. */
const support = { ...base };
delete support.globalTeardown;
export default defineConfig({
  ...support,
  globalSetup: './e2e/support-setup.ts',
  testMatch: /(?:support-tickets|patch-notes)\.spec\.ts/,
  projects: [{ name: 'support', use: { ...devices['Desktop Chrome'] } }],
  workers: 1,
  fullyParallel: false,
});
