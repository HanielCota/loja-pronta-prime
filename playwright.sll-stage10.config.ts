import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const { globalSetup: _setup, globalTeardown: _teardown, ...local } = base;

export default defineConfig({
  ...local,
  use: { ...local.use, trace: 'off' },
  testMatch: 'sll-stage10-library.spec.ts',
  workers: 1,
  projects: [{ name: 'stage10', use: { ...devices['Desktop Chrome'] } }],
});
