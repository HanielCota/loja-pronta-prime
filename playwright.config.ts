import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Mesmas variáveis do app (banco e auth): os testes criam e removem alunas de teste.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /layout\.spec\.ts/ },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /(layout|accessibility)\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: `${baseURL}/entrar`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
