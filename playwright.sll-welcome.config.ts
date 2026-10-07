import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// Esta conferência cria só contas e conteúdo locais; não usa o setup que envia logos ao bucket.
const { globalSetup: _setup, globalTeardown: _teardown, ...local } = base;
export default defineConfig({
  ...local,
  testMatch: 'sll-welcome.spec.ts',
  workers: 1,
  projects: [{ name: 'welcome', use: { ...devices['Desktop Chrome'] } }],
});
