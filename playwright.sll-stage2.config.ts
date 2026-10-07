import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const { globalSetup: _setup, globalTeardown: _teardown, ...local } = base;
const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const parsedBaseUrl = new URL(baseUrl);
const port = parsedBaseUrl.port || (parsedBaseUrl.protocol === 'https:' ? '443' : '80');

if (!/^\d+$/.test(port)) throw new Error(`Porta inválida em E2E_BASE_URL: ${port}`);

export default defineConfig({
  ...local,
  webServer: {
    ...local.webServer,
    command: `bun run dev -- --port ${port}`,
    url: `${baseUrl}/entrar`,
  },
  testMatch: 'sll-stage2-pilot.spec.ts',
  workers: 1,
  projects: [
    {
      name: 'stage2',
      use: {
        ...devices['Desktop Chrome'],
        // Este piloto já guarda screenshots; não deixe o anexo de trace quebrado mascarar o resultado.
        trace: 'off',
      },
    },
  ],
});
