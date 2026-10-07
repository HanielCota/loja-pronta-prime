import { describe, expect, it } from 'bun:test';
import { isChatGptDestination, isInternalSllDestination } from './resource-destination';

describe('destinos dos recursos do SLL', () => {
  it('reconhece somente rotas internas absolutas', () => {
    expect(isInternalSllDestination('/sll/recursos')).toBe(true);
    expect(isInternalSllDestination('/sll/recursos#calculadora')).toBe(true);
    expect(isInternalSllDestination('//outro-site.example')).toBe(false);
    expect(isInternalSllDestination('https://example.com')).toBe(false);
  });

  it('identifica acesso externo ao ChatGPT', () => {
    expect(isChatGptDestination('https://chatgpt.com/g/g-123')).toBe(true);
    expect(isChatGptDestination('https://www.bling.com.br/')).toBe(false);
  });
});
