import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// Course checks use an isolated database and do not upload the global setup's sample logos.
const { globalSetup: _setup, globalTeardown: _teardown, ...local } = base;
export default defineConfig({
  ...local,
  testMatch: 'ze-mauro.spec.ts',
  workers: 1,
  use: { ...base.use, extraHTTPHeaders: {} },
  projects: [{ name: 'ze-course', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    ...base.webServer,
    command: 'node node_modules/next/dist/bin/next start --hostname 127.0.0.1',
    env: { HOSTNAME: '127.0.0.1' },
  },
});
