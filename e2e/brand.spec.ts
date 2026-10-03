import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

const step = (name: string) => new RegExp(`/loja-pronta/marca/${name}(\\?.*)?$`);

/** Prévia do logo carregada de verdade (a imagem desenhada no servidor). */
async function expectLogoLoaded(page: Page, alt: RegExp) {
  const image = page.getByRole('img', { name: alt }).first();
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
}

test('marca completa: nome, modelo, estúdio, texto, revisão com mudança e logo pra baixar', async ({
  page,
}) => {
  await signIn(page, studentEmail('marca'), PASSWORD);
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await expect(page.getByRole('heading', { name: 'Crie a marca da sua loja' })).toBeVisible();
  await page.getByRole('link', { name: /Criar minha marca/ }).click();

  // Nome: o da conversa vem primeiro; nome comprido demais avisa quantas letras tem.
  await expect(page).toHaveURL(step('nome'));
  await expect(
    page.getByRole('heading', { name: 'Esse vai ser o nome da sua loja?' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Patinhas da Ana/ })).toContainText(
    'O nome que você escolheu na conversa',
  );
  await expectNoA11yViolations(page);
  await page.getByLabel('Nome da loja').fill('Um nome comprido demais pra caber na Shopee');
  await page.getByRole('button', { name: 'Usar esse nome' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Use até 30 letras');
  await page.getByRole('button', { name: /Patinhas da Ana/ }).click();

  // Modelo: 6 logos prontos, com o nome dela.
  await expect(page).toHaveURL(step('modelo'));
  await expect(page.getByRole('main').getByRole('button')).toHaveCount(6);
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Selo redondo' }).click();

  // Estúdio: a prévia muda na hora; desfazer volta o último toque.
  await expect(page).toHaveURL(step('ajustar'));
  await expectLogoLoaded(page, /^Seu logo: Selo redondo/);
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Voltar ao modelo' })).toBeDisabled();
  await page.getByText('Lilás', { exact: true }).click();
  await expect(page.getByRole('img', { name: /cor lilás/ })).toBeVisible();
  await page.getByText('Desfazer').click();
  await expect(page.getByRole('img', { name: /cor verde/ })).toBeVisible();
  await page.getByText('Turquesa', { exact: true }).click();
  await page.getByText('Desenho', { exact: true }).first().click();
  await page.getByText('Gato', { exact: true }).click();
  await expect(page.getByRole('img', { name: /cor turquesa, desenho de gato/ })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Gostei, continuar' }).click();

  // Texto: 3 prontos com o nome da loja.
  await expect(page).toHaveURL(step('descricao'));
  await expect(page.getByRole('main').getByRole('button', { name: /Texto \d/ })).toHaveCount(3);
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: /Texto 2/ }).click();

  // Revisão: mudar o nome volta pra revisão, já com o novo.
  await expect(page).toHaveURL(step('revisao'));
  await expectLogoLoaded(page, /^Logo da loja Patinhas da Ana/);
  await expectNoA11yViolations(page);
  await page.getByRole('link', { name: 'Mudar o nome' }).click();
  await expect(page).toHaveURL(/\/marca\/nome\?editar=1$/);
  await page.getByLabel('Nome da loja').fill('Gatinhos & Cia');
  await page.getByRole('button', { name: 'Usar esse nome' }).click();
  await expect(page).toHaveURL(step('revisao'));
  await expect(page.getByRole('main')).toContainText('Gatinhos & Cia');

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

test('estúdio pelo teclado: Tab e setas mudam a cor, e Enter salva', async ({ page }) => {
  await signIn(page, studentEmail('marcateclado'), PASSWORD, '/loja-pronta/marca');
  await expect(page).toHaveURL(step('nome'));
  await page.getByRole('button', { name: /Patinhas da Ana/ }).press('Enter');
  await expect(page).toHaveURL(step('modelo'));
  await page.getByRole('button', { name: 'Ícone em cima' }).press('Enter');
  await expect(page).toHaveURL(step('ajustar'));

  const green = page.getByRole('radio', { name: 'Verde' });
  await green.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Terracota' })).toBeChecked();
  await expect(page.getByRole('img', { name: /cor terracota/ })).toBeVisible();
  await page.getByRole('button', { name: 'Gostei, continuar' }).press('Enter');
  await expect(page).toHaveURL(step('descricao'));
});

test('a marca só abre depois da conversa; o logo é só da dona', async ({ page }) => {
  // Conversa ainda não enviada: volta pra área.
  await signIn(page, studentEmail('conversaretoma'), PASSWORD, '/loja-pronta/marca');
  await expect(page).toHaveURL(/\/loja-pronta(\/conversa\/\w+)?$/);
  const response = await page.request.get('/loja-pronta/marca/logo.svg');
  expect(response.status()).toBe(404);
});
