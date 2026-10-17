import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const { globalSetup: _setup, globalTeardown: _teardown, ...local } = base;

// These tests create isolated accounts and clean up their temporary images in the real bucket.
export default defineConfig({
  ...local,
  testMatch: 'admin-journey.spec.ts',
  workers: 1,
  projects: [{ name: 'admin-journey', use: { ...devices['Desktop Chrome'] } }],
});
