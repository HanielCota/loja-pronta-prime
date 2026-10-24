import { describe, expect, test } from 'bun:test';
import { REQUEST_TIMEOUT_MS, uploadTimeoutMs } from './timeouts';

describe('uploadTimeoutMs', () => {
  test('um arquivo pequeno fica com o prazo normal', () => {
    expect(uploadTimeoutMs(0)).toBe(REQUEST_TIMEOUT_MS);
    expect(uploadTimeoutMs(10 * 1024)).toBeLessThan(REQUEST_TIMEOUT_MS + 100);
  });

  test('um vídeo grande ganha o tempo de envio a 1 MB/s', () => {
    expect(uploadTimeoutMs(500 * 1024 * 1024)).toBe(REQUEST_TIMEOUT_MS + 500_000);
  });
});
