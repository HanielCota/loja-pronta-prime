import { describe, expect, test } from 'bun:test';
import { APIConnectionError, APIConnectionTimeoutError, APIError } from 'openai';
import { AiUnavailableError, rejectedByApi } from './errors';

describe('rejectedByApi', () => {
  test('an HTTP error response means the request was refused before billing', () => {
    expect(rejectedByApi(APIError.generate(400, undefined, 'moderation', new Headers()))).toBe(
      true,
    );
    expect(rejectedByApi(APIError.generate(429, undefined, 'rate limit', new Headers()))).toBe(
      true,
    );
    expect(rejectedByApi(APIError.generate(500, undefined, 'server', new Headers()))).toBe(true);
  });

  test('timeouts, dropped connections and other errors may have been billed', () => {
    expect(rejectedByApi(new APIConnectionTimeoutError())).toBe(false);
    expect(rejectedByApi(new APIConnectionError({ message: 'reset' }))).toBe(false);
    expect(rejectedByApi(new Error('boom'))).toBe(false);
    expect(rejectedByApi(null)).toBe(false);
  });
});

test('AiUnavailableError assumes nothing was billed unless told otherwise', () => {
  expect(new AiUnavailableError('x').mayHaveBilled).toBe(false);
  expect(new AiUnavailableError('x', { mayHaveBilled: true }).mayHaveBilled).toBe(true);
});
