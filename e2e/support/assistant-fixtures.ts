/** Somente o servidor E2E isolado recebe estes valores; nenhuma chamada Shopee é executada. */
export const ASSISTANT_TEST_CONFIGURATION = {
  SHOPEE_ENABLED: 'true',
  SHOPEE_PUBLICATION_ENABLED: 'true',
  SHOPEE_ENVIRONMENT: 'live',
  SHOPEE_PARTNER_ID: '123',
  SHOPEE_PARTNER_KEY: 'e2e-only-not-a-real-partner-key',
  SHOPEE_TOKEN_ENCRYPTION_KEY: 'cd'.repeat(32),
  SHOPEE_PILOT_USER_IDS: '',
  SHOPEE_CALLBACK_MODE: 'automatic',
};
