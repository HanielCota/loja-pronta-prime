import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Mesmas variáveis do app (banco e auth): os testes criam e removem alunas de teste.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const catalogTests =
  /(?:sll-(method-overview|stage07|stage1|stage10-library|stage2-pilot|welcome)|assistant)\.spec\.ts/;

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
    // Fixtures mudam o catálogo por SQL. Em dev, uma atualização sem cache reflete essas mudanças.
    // A reutilização entre visitas e a invalidação são verificadas no build de produção.
    extraHTTPHeaders: { 'Cache-Control': 'no-cache' },
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [
        /layout\.spec\.ts/,
        /sll-cache\.spec\.ts/,
        /assistant-publication\.spec\.ts/,
        catalogTests,
      ],
    },
    {
      // Estes cenários publicam o catálogo global: cada arquivo precisa terminar antes do próximo.
      name: 'sll',
      use: { ...devices['Desktop Chrome'] },
      testMatch: catalogTests,
      fullyParallel: false,
      workers: 1,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /(layout|accessibility)\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: `${baseURL}/entrar`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
