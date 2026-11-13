import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const { globalSetup: _setup, globalTeardown: _teardown, webServer, ...local } = base;
if (!webServer || Array.isArray(webServer)) {
  throw new Error('The mentorship tests require one web server.');
}

export default defineConfig({
  ...local,
  testMatch: 'sll-mentorship.flow.ts',
  workers: 1,
  // The serial flow shares fixtures and purchase state across its scenarios.
  retries: 0,
  webServer: {
    ...webServer,
    env: { HOTMART_MENTORSHIP_PRODUCT_UCODE: 'mentorship-browser-fixture' },
  },
  projects: [{ name: 'sll-mentorship', use: { ...devices['Desktop Chrome'] } }],
});
