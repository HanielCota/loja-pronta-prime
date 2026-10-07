import { AxeBuilder } from '@axe-core/playwright';
import { createHash } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

/** Regras de acessibilidade checadas pelo axe: WCAG 2.2 A/AA e boas práticas. */
const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Cada aluna simula uma conexão: testes em paralelo não compartilham a cota por IP. */
export function studentIp(email: string): string {
  const hash = createHash('sha256').update(email).digest();
  return `10.${hash[0]}.${hash[1]}.${hash[2]}`;
}

/** Página sem problemas de acessibilidade (lista o que falhou e onde, se houver). */
export async function expectNoA11yViolations(page: Page, externalFrameSelectors: string[] = []) {
  const scan = new AxeBuilder({ page }).withTags(A11Y_TAGS);
  // Exclui apenas o documento externo indicado: o elemento iframe e seu título continuam avaliados.
  for (const selector of externalFrameSelectors) scan.exclude([selector, 'body']);
  const { violations } = await scan.analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
}

/** Abre o login (com destino opcional) e envia email e senha. */
export async function signIn(page: Page, email: string, password: string, next?: string) {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': studentIp(email) });
  await page.goto(next ? `/entrar?next=${encodeURIComponent(next)}` : '/entrar');
  await page.getByLabel('Email da compra').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Espera o navegador desenhar dois quadros (reações ao evento anterior já aconteceram). */
export function nextFrames(page: Page) {
  return page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}
