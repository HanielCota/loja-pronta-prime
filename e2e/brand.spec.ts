import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

const step = (name: string) => new RegExp(`/loja-pronta/marca/${name}(\\?.*)?$`);

/**
 * O servidor dos testes roda com AI_FAKE=1 e STORAGE_DRIVER=local: o chat e a imagem respondem de
 * mentira (sem custo, sempre iguais) e o logo fica numa pasta do projeto.
 */

/** Prévia do logo carregada de verdade (a imagem guardada). */
async function expectLogoLoaded(page: Page, alt: RegExp) {
  const image = page.getByRole('img', { name: alt }).first();
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
}

test('marca completa: nome, chat do logo, texto, revisão com mudança e logo pra baixar', async ({
  page,
}) => {
  await signIn(page, studentEmail('marca'), PASSWORD);
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await expect(page.getByRole('heading', { name: 'Crie a marca da sua loja' })).toBeVisible();
  await page.getByRole('link', { name: /Criar minha marca/ }).click();

  // Nome: o da conversa já vem no cartão; passar do limite avisa ali, e uma ideia volta a ele.
  await expect(page).toHaveURL(step('nome'));
  await expect(page.getByRole('heading', { name: 'Qual o nome da sua loja?' })).toBeVisible();
  const name = page.getByLabel('Nome da loja');
  await expect(name).toHaveValue('Patinhas da Ana');
  await expect(page.getByRole('radio', { name: 'Patinhas da Ana' })).toBeChecked();
  await expectNoA11yViolations(page);
  await name.fill('Um nome comprido demais pra caber na Shopee');
  await expect(page.getByText('Passou 13 letras do limite da Shopee.').first()).toBeVisible();
  await name.press('Enter');
  await expect(page.getByText('Use até 30 letras. Esse nome tem 43.').first()).toBeVisible();
  await expect(name).toBeFocused();
  await page.getByText('Patinhas da Ana', { exact: true }).click();
  await expect(name).toHaveValue('Patinhas da Ana');
  await page.getByRole('button', { name: 'Continuar com “Patinhas da Ana”' }).click();

  // Logo: o chat pergunta (com respostas rápidas), monta o resumo e cria o logo; ela escolhe.
  await expect(page).toHaveURL(step('logo'));
  await expect(
    page.getByRole('heading', { name: 'Vamos criar o logo da Patinhas da Ana' }),
  ).toBeAttached();
  const conversation = page.getByRole('log', { name: 'Conversa sobre o seu logo' });
  await expect(conversation).toContainText('Vamos criar o logo da Patinhas da Ana?');
  await expectNoA11yViolations(page);
  await page.getByRole('group', { name: 'Respostas rápidas' }).getByText('Um desenho').click();
  await expect(conversation).toContainText('Que cores você quer no logo?');
  await page.getByLabel('Sua mensagem').fill('Rosa e dourado');
  await page.getByLabel('Sua mensagem').press('Enter');
  await expect(conversation).toContainText('Vai ser uma patinha rosa');
  await expect(page.getByText('uma patinha · rosa e dourado')).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Criar meu logo' }).click();
  const logo = conversation.getByRole('img', { name: 'Logo 1 criado pra sua loja' });
  await expect(logo).toBeVisible();
  await expect
    .poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  await page.getByRole('button', { name: 'Usar esse logo' }).click();

  // Texto: já vem um pronto no cartão; um jeito de falar troca o texto, "Outro texto" traz
  // outra versão do mesmo jeito, e vazio não segue.
  await expect(page).toHaveURL(step('descricao'));
  const description = page.getByLabel('Texto da loja');
  await expect(description).toHaveValue(/Patinhas da Ana/);
  await expect(page.getByRole('radio', { name: 'Carinhoso' })).toBeChecked();
  await expectNoA11yViolations(page);
  await page.getByText('Direto', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Direto' })).toBeChecked();
  const direct = await description.inputValue();
  await page.getByRole('button', { name: /^Outro texto/ }).click();
  await expect(description).not.toHaveValue(direct);
  await expect(page.getByRole('radio', { name: 'Direto' })).toBeChecked();
  await page.getByRole('button', { name: 'Apagar' }).click();
  await page.getByRole('button', { name: 'Continuar com esse texto' }).click();
  await expect(page.getByText('Escolha um dos textos ou escreva o seu.').first()).toBeVisible();
  await expect(description).toBeFocused();
  await page.getByText('Direto', { exact: true }).click();
  await page.getByRole('button', { name: 'Continuar com esse texto' }).click();

  // Revisão: mudar o nome volta pra revisão, já com o novo.
  await expect(page).toHaveURL(step('revisao'));
  await expectLogoLoaded(page, /^Logo da loja Patinhas da Ana/);
  await expectNoA11yViolations(page);
  await page.getByRole('link', { name: 'Mudar o nome' }).click();
  await expect(page).toHaveURL(/\/marca\/nome\?editar=1$/);
  await page.getByLabel('Nome da loja').fill('Gatinhos & Cia');
  await page.getByRole('button', { name: 'Continuar com “Gatinhos & Cia”' }).click();
  // O logo traz o nome escrito: ela volta pro chat, que avisa e oferece criar outro.
  await expect(page).toHaveURL(/\/marca\/logo\?editar=1$/);
  const renamed = page.getByRole('log', { name: 'Conversa sobre o seu logo' });
  await expect(renamed).toContainText('Você mudou o nome pra Gatinhos & Cia');
  await page.getByRole('button', { name: 'Criar outro logo' }).click();
  await expect(renamed.getByRole('img', { name: 'Logo 2 criado pra sua loja' })).toBeVisible();
  await page.getByRole('button', { name: 'Usar esse logo (logo 2)' }).click();
  await expect(page).toHaveURL(step('revisao'));
  // O texto da loja já veio com o nome novo.
  await expect(page.getByRole('main')).toContainText('Gatinhos & Cia');
  await expect(page.getByRole('main')).not.toContainText('Patinhas da Ana');

  // Confirmar: a loja vai pra fase 3, e o logo pode ser baixado em PNG.
  await page.getByRole('button', { name: 'Está tudo certo' }).click();
  await expect(page).toHaveURL(/\/loja-pronta\/marca\/pronta$/);
  await expect(page.getByRole('heading', { name: /Sua marca está pronta/ })).toBeVisible();
  await expectNoA11yViolations(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Baixar meu logo' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('logo-gatinhos-cia.png');

  // Confirmada, a marca reabre só pra rever (e2e/revise.spec.ts); o painel já está na fase 3, com
  // o nome e o logo dela.
  await page.goto('/loja-pronta/marca');
  await expect(page).toHaveURL(/\/marca\/revisao$/);
  await page.goto('/loja-pronta');
  await expect(page.getByRole('heading', { level: 1, name: 'Gatinhos & Cia' })).toBeVisible();
  await expectLogoLoaded(page, /^Logo da loja Gatinhos & Cia/);
  await expect(
    page.getByRole('list', { name: 'As etapas da sua loja' }).getByRole('listitem').nth(2),
  ).toContainText('Passo 1 de 5: Conta na Shopee');
});

test('chat do logo pelo teclado: escreve, Enter manda, e a conversa continua depois', async ({
  page,
}) => {
  await signIn(page, studentEmail('marcateclado'), PASSWORD, '/loja-pronta/marca');
  await expect(page).toHaveURL(step('nome'));
  await page.getByRole('button', { name: /^Continuar com/ }).press('Enter');
  await expect(page).toHaveURL(step('logo'));

  const field = page.getByLabel('Sua mensagem');
  await field.fill('Uma flor');
  await field.press('Enter');
  const conversation = page.getByRole('log', { name: 'Conversa sobre o seu logo' });
  await expect(conversation).toContainText('Que cores você quer no logo?');
  // Sem nada escrito, "Enviar" fica desligado.
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeDisabled();

  // Saiu e voltou: a conversa está lá; "Nova conversa" volta ao começo.
  await page.reload();
  await expect(conversation).toContainText('Uma flor');
  await page.getByRole('button', { name: 'Nova conversa' }).click();
  await expect(conversation).not.toContainText('Uma flor');
  await expect(conversation).toContainText('Vamos criar o logo da Patinhas da Ana?');
});

test('a marca só abre depois da conversa; o logo é só da dona', async ({ page }) => {
  // Conversa ainda não enviada: volta pra área.
  await signIn(page, studentEmail('conversaretoma'), PASSWORD, '/loja-pronta/marca');
  await expect(page).toHaveURL(/\/loja-pronta(\/conversa\/\w+)?$/);
  for (const path of ['/loja-pronta/marca/logo.png', '/loja-pronta/marca/imagens/e2e-logo-0001']) {
    expect((await page.request.get(path)).status()).toBe(404);
  }
});

test('marca confirmada antes do chat, sem logo: só o logo reabre, mesmo com a loja publicada', async ({
  page,
}) => {
  await signIn(page, studentEmail('marcasemlogo'), PASSWORD, '/loja-pronta/marca');
  await expect(page).toHaveURL(step('logo'));
  // Os outros passos continuam fechados: levam pro logo.
  for (const other of ['nome', 'descricao', 'revisao']) {
    await page.goto(`/loja-pronta/marca/${other}`);
    await expect(page).toHaveURL(step('logo'));
  }
  const conversation = page.getByRole('log', { name: 'Conversa sobre o seu logo' });
  await page.getByRole('group', { name: 'Respostas rápidas' }).getByText('Um desenho').click();
  await expect(conversation).toContainText('Que cores você quer no logo?');
  await page.getByLabel('Sua mensagem').fill('Rosa');
  await page.getByLabel('Sua mensagem').press('Enter');
  await page.getByRole('button', { name: 'Criar meu logo' }).click();
  await page.getByRole('button', { name: 'Usar esse logo' }).click();
  // Escolheu: volta pro painel, com o logo; a marca fecha de novo.
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await page.goto('/loja-pronta/marca/logo');
  await expect(page).toHaveURL(/\/loja-pronta$/);
});
