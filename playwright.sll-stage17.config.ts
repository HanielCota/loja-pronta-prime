import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// Esta etapa cria somente uma aluna com dois produtos e não precisa tocar no bucket S3.
const { globalSetup: _setup, globalTeardown: _teardown, ...local } = base;

export default defineConfig({
  ...local,
  globalSetup: './e2e/sll-stage17-setup.ts',
  globalTeardown: './e2e/sll-stage17-teardown.ts',
  use: { ...local.use, trace: 'off' },
  testMatch: 'sll-stage17.spec.ts',
  workers: 1,
  projects: [
    { name: 'stage17-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'stage17-mobile', use: { ...devices['Pixel 7'] } },
  ],
});
