import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const { globalSetup: _setup, globalTeardown: _teardown, ...settings } = base;

export default defineConfig({
  ...settings,
  testMatch: /shopee-connection\.flow\.ts/,
  projects: [
    { name: 'desktop-light', use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop-dark', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-light', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-dark', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    ...base.webServer,
    command: 'bun run dev',
    env: {
      SHOPEE_ENABLED: 'true',
      SHOPEE_ENVIRONMENT: 'live',
      SHOPEE_CALLBACK_MODE: 'automatic',
      SHOPEE_PARTNER_ID: '123',
      SHOPEE_PARTNER_KEY: 'isolated-test-key',
      SHOPEE_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
      SHOPEE_PILOT_USER_IDS: '',
      SHOPEE_ASSISTED_DELIVERY_ENABLED: 'false',
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require="${path.resolve('e2e/support/shopee-authorization-api.cjs').replaceAll('\\', '/')}"`,
    },
  },
});
