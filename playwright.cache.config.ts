import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/** O cache entre visitas precisa ser conferido no mesmo servidor usado em produção. */
export default defineConfig({
  ...base,
  testMatch: /sll-cache\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  use: { ...base.use, extraHTTPHeaders: {} },
  projects: [{ name: 'cache', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    ...base.webServer,
    // Next start usa as bibliotecas nativas instaladas no Windows; o build continua de produção.
    command: 'node node_modules/next/dist/bin/next start --hostname 127.0.0.1',
    env: { HOSTNAME: '127.0.0.1' },
  },
});
