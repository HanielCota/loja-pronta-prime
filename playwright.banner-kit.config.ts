import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const { globalSetup: _setup, globalTeardown: _teardown, ...local } = base;
export default defineConfig({
  ...local,
  testMatch: 'banner-kit.spec.ts',
  workers: 1,
  projects: [{ name: 'banner-kit', use: { ...devices['Desktop Chrome'] } }],
});
