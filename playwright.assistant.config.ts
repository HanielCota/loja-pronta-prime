import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';
import { ASSISTANT_TEST_CONFIGURATION } from './e2e/support/assistant-fixtures';

/** Usa banco temporário do runner. A fila é verificada sem iniciar um worker. */
export default defineConfig({
  ...base,
  testMatch: /assistant-publication\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  projects: [{ name: 'assistant-publication', use: { ...devices['Desktop Chrome'] } }],
  webServer: { ...base.webServer, command: 'bun run dev', env: ASSISTANT_TEST_CONFIGURATION },
});
