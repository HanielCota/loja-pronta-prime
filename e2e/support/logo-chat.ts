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

/** As falas da assistente (cada uma começa com "Assistente:" pro leitor de tela). */
function replies(page: Page) {
  return conversation(page).getByText('Assistente:', { exact: true });
}

/**
 * Espera a próxima fala da assistente. Se a IA falhar (acontece), toca em "Tentar de novo", como
 * a aluna faria.
 */
async function waitForReply(page: Page, before: number) {
  const retry = page.getByRole('button', { name: 'Tentar de novo' });
  await expect
    .poll(
      async () => {
        if ((await replies(page).count()) > before) return true;
        if (await retry.isVisible()) await retry.click();
        return false;
      },
      { timeout: REPLY_TIMEOUT, intervals: [500] },
    )
    .toBe(true);
  await expect(page.getByText('Pensando…')).toHaveCount(0);
}

/** Escreve e manda uma mensagem (Enter), e espera a resposta. */
export async function say(page: Page, text: string) {
  const before = await replies(page).count();
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
  const logo = conversation(page).getByRole('img', { name: `Logo ${number} criado pra sua loja` });
  await expect(logo).toBeVisible({ timeout: IMAGE_TIMEOUT });
  await expect
    .poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
}
