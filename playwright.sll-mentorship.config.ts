import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const { globalSetup: _setup, globalTeardown: _teardown, ...local } = base;
export default defineConfig({
  ...local,
  testMatch: 'sll-mentorship.flow.ts',
  workers: 1,
  projects: [{ name: 'sll-mentorship', use: { ...devices['Desktop Chrome'] } }],
});
