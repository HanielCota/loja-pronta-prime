import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/** This suite owns its accounts and needs no seeded content or storage uploads. */
const recovery = { ...base };
delete recovery.globalSetup;
delete recovery.globalTeardown;
export default defineConfig({
  ...recovery,
  testMatch: /hotmart-recovery\.spec\.ts/,
  projects: [{ name: 'hotmart', use: { ...devices['Desktop Chrome'] } }],
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
});
