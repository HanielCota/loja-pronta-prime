import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const { globalSetup: _setup, globalTeardown: _teardown, ...local } = base;

export default defineConfig({
  ...local,
  testMatch: 'sll-stage1.spec.ts',
  workers: 1,
  projects: [{ name: 'stage1', use: { ...devices['Desktop Chrome'] } }],
});
