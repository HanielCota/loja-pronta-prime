import { expect, type Page } from '@playwright/test';

/**
 * O estúdio do logo nos testes. As escolhas são na tela, sem IA; criar o logo chama a OpenAI de
 * verdade (uns US$ 0,01 por logo, até uns 2 minutos): os testes criam só os necessários.
 */

/** Quanto a IA pode demorar pra desenhar. */
const IMAGE_TIMEOUT = 180_000;

/** Toca na opção (o cartão inteiro, como ela faria) e confere que ficou marcada. */
export async function choose(page: Page, label: string) {
  const option = page.getByRole('radio', { name: label, exact: true });
  await option.locator('xpath=..').click();
  await expect(option).toBeChecked();
}

/** "Continuar" (ou, na última escolha, "Ver o resumo"). */
export async function goOn(page: Page) {
  await page.getByRole('button', { name: /^(Continuar|Ver o resumo)$/ }).click();
  await expect(page.getByRole('button', { name: 'Salvando…', exact: true })).toHaveCount(0);
}

/** Escolhe uma opção por tela, na ordem, e vai pro resumo. */
export async function pickAll(page: Page, labels: string[]) {
  for (const label of labels) {
    await choose(page, label);
    await goOn(page);
  }
  await expect(page.getByRole('heading', { name: 'Confira e crie o seu logo' })).toBeFocused();
}

/** Toca em criar e espera o logo número `number` chegar (a imagem carregada de verdade). */
export async function createLogo(page: Page, number: number) {
  await page.getByRole('button', { name: /^Criar (meu|outro) logo$/ }).click();
  await expectLogo(page, number);
}

/** Um ajuste de um toque no logo da vez ("Mais simples"...): espera a versão nova chegar. */
export async function tweakLogo(page: Page, label: string, number: number) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await expectLogo(page, number);
}

/** O logo número `number` no quadro, com a imagem carregada de verdade. */
export async function expectLogo(page: Page, number: number) {
  const logo = page.getByRole('img', { name: `Logo ${number} criado pra sua loja`, exact: true });
  await expect(logo).toBeVisible({ timeout: IMAGE_TIMEOUT });
  await expect
    .poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
}
