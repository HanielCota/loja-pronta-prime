import { expect, type Page } from '@playwright/test';

/**
 * O chat do logo nos testes, com a IA de verdade (DeepSeek e OpenAI): as respostas mudam a cada
 * vez, então os testes conferem o caminho (pergunta, resumo, logo), não as palavras da assistente.
 * Cada logo criado custa (uns US$ 0,01): os testes criam só os necessários.
 */

/** Tudo de uma vez, pra assistente ter o bastante logo na primeira resposta. */
const FULL_ANSWER =
  'Quero o desenho de uma patinha de cachorro fofa, nas cores rosa e dourado, com o nome em ' +
  'letra delicada, fundo branco, estilo ilustração. Pode criar assim.';
const CONFIRM = 'Isso mesmo, está tudo certo. Pode criar assim.';

/** Quanto a IA pode demorar: o texto, uns segundos; a imagem, até uns 2 minutos. */
const REPLY_TIMEOUT = 90_000;
const IMAGE_TIMEOUT = 180_000;

export function conversation(page: Page) {
  return page.getByRole('log', { name: 'Conversa sobre o seu logo' });
}

/** A fala da vez da assistente (a tela mostra uma pergunta por vez). */
async function currentReply(page: Page) {
  return (await conversation(page).textContent()) ?? '';
}

/**
 * Espera a próxima fala da assistente (a fala da vez muda). Se a IA falhar (acontece), toca em
 * "Tentar de novo", como a aluna faria.
 */
async function waitForReply(page: Page, before: string) {
  const retry = page.getByRole('button', { name: 'Tentar de novo' });
  const thinking = page.getByText('Pensando…');
  await expect
    .poll(
      async () => {
        if (await retry.isVisible()) await retry.click();
        if (await thinking.isVisible()) return false;
        return (await currentReply(page)) !== before;
      },
      { timeout: REPLY_TIMEOUT, intervals: [500] },
    )
    .toBe(true);
  await expect(page.getByText('Pensando…')).toHaveCount(0);
}

/** Escreve e manda uma mensagem (Enter), e espera a resposta. */
export async function say(page: Page, text: string) {
  const before = await currentReply(page);
  const field = page.getByLabel('Sua mensagem');
  await field.fill(text);
  await field.press('Enter');
  await waitForReply(page, before);
}

/** Conversa até a assistente ter o resumo e aparecer o "Criar meu logo". */
export async function chatUntilReady(page: Page) {
  const create = page.getByRole('button', { name: /^Criar (meu|outro) logo$/ });
  for (let turn = 0; turn < 5 && !(await create.isVisible()); turn++) {
    await say(page, turn === 0 ? FULL_ANSWER : CONFIRM);
  }
  await expect(create).toBeVisible();
}

/** Toca em criar e espera o logo número `number` chegar (a imagem carregada de verdade). */
export async function createLogo(page: Page, number: number) {
  await page.getByRole('button', { name: /^Criar (meu|outro) logo$/ }).click();
  await expectLogo(page, number);
}

/** Um ajuste de um toque no último logo ("Mais simples"...): espera a versão nova chegar. */
export async function tweakLogo(page: Page, label: string, number: number) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await expectLogo(page, number);
}

/** O logo número `number` na conversa, com a imagem carregada de verdade. */
export async function expectLogo(page: Page, number: number) {
  // No computador, no painel "Seu logo"; no celular, na conversa (só o que está à vista conta).
  const logo = page.getByRole('img', { name: `Logo ${number} criado pra sua loja`, exact: true });
  await expect(logo).toBeVisible({ timeout: IMAGE_TIMEOUT });
  await expect
    .poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
}
