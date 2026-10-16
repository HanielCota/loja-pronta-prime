import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const { globalSetup: _setup, globalTeardown: _teardown, ...local } = base;

// These tests create their own accounts in the isolated database and do not seed remote files.
export default defineConfig({
  ...local,
  testMatch: 'admin-journey.spec.ts',
  workers: 1,
  projects: [{ name: 'admin-journey', use: { ...devices['Desktop Chrome'] } }],
});
