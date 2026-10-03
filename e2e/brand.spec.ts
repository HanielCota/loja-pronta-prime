import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

const step = (name: string) => new RegExp(`/loja-pronta/marca/${name}(\\?.*)?$`);

/** Prévia do logo carregada de verdade (a imagem desenhada no servidor). */
/** As partes do logo desenhadas no quadro do editor (aparecem quando as letras carregam). */
const drawn = (page: Page) =>
  page
    .getByRole('img', { name: /^Seu logo, com/ })
    .locator(':scope > g[transform]:not([aria-hidden])');

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

  // Nome: o da conversa já vem no cartão; passar do limite avisa ali, e uma ideia volta a ele.
  await expect(page).toHaveURL(step('nome'));
  await expect(page.getByRole('heading', { name: 'Qual o nome da sua loja?' })).toBeVisible();
  const name = page.getByLabel('Nome da loja');
  await expect(name).toHaveValue('Patinhas da Ana');
  await expect(page.getByRole('radio', { name: 'Patinhas da Ana' })).toBeChecked();
  await expectNoA11yViolations(page);
  await name.fill('Um nome comprido demais pra caber na Shopee');
  await expect(page.getByText('Passou 13 letras do limite da Shopee.')).toBeVisible();
  await name.press('Enter');
  await expect(page.getByText('Use até 30 letras. Esse nome tem 43.')).toBeVisible();
  await expect(name).toBeFocused();
  await page.getByText('Patinhas da Ana', { exact: true }).click();
  await expect(name).toHaveValue('Patinhas da Ana');
  await page.getByRole('button', { name: 'Continuar com “Patinhas da Ana”' }).click();

  // Logo: direto no editor, já com um modelo montado com as respostas dela, na aba Estilo; um
  // toque muda o logo inteiro e desfazer volta.
  await expect(page).toHaveURL(step('ajustar'));
  await expect(drawn(page)).not.toHaveCount(0);
  const color = page.getByRole('group', { name: 'Cor', exact: true });
  await expect(color.getByLabel('Verde')).toBeChecked();
  await expect(page.getByRole('button', { name: /^Desfazer/ })).toBeDisabled();
  await color.getByLabel('Lilás').check({ force: true });
  await expect(color.getByLabel('Lilás')).toBeChecked();
  await page.getByRole('button', { name: /^Desfazer/ }).click();
  await expect(color.getByLabel('Verde')).toBeChecked();
  await color.getByLabel('Turquesa').check({ force: true });
  await page.getByRole('radio', { name: 'Desenhos' }).check({ force: true });
  await page.getByRole('button', { name: 'Coração', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Coração', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
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
  await page.getByRole('button', { name: 'Continuar com “Gatinhos & Cia”' }).click();
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

test('logo pelo teclado: as setas mudam a cor, e Enter salva', async ({ page }) => {
  await signIn(page, studentEmail('marcateclado'), PASSWORD, '/loja-pronta/marca');
  await expect(page).toHaveURL(step('nome'));
  await page.getByRole('button', { name: /^Continuar com/ }).press('Enter');
  await expect(page).toHaveURL(step('ajustar'));

  // As setas trocam a cor (e não mexem no logo, que é das setas fora dos campos).
  const color = page.getByRole('group', { name: 'Cor', exact: true });
  await color.getByLabel('Verde').focus();
  await page.keyboard.press('ArrowRight');
  await expect(color.getByLabel('Terracota')).toBeChecked();
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
