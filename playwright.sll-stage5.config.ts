import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const { globalSetup: _setup, globalTeardown: _teardown, ...local } = base;

export default defineConfig({
  ...local,
  testMatch: 'sll-method-overview.spec.ts',
  workers: 1,
  projects: [{ name: 'method-overview', use: { ...devices['Desktop Chrome'] } }],
});
