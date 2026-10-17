import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';
import { ASSISTANT_TEST_CONFIGURATION } from './e2e/support/assistant-fixtures';

export default defineConfig({
  ...base,
  testMatch: /store-automation\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  projects: [{ name: 'store-automation', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    ...base.webServer,
    command: 'bun run dev',
    env: {
      ...ASSISTANT_TEST_CONFIGURATION,
      SHOPEE_DUPLICATION_ENABLED: 'true',
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require=${path.resolve('e2e/support/shopee-readonly-api.cjs')}`,
    },
  },
});
