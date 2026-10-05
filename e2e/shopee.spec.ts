import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

test('conta na Shopee: passo a passo, "falta terminar" e, liberada, a tela da conexão', async ({
  page,
}) => {
  await signIn(page, studentEmail('shopeeconta'), PASSWORD);
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await page.getByRole('link', { name: 'Abrir minha conta na Shopee' }).click();

  // O passo a passo: o que ter à mão, como fazer e o link da Shopee (em outra aba).
  await expect(page).toHaveURL(/\/loja-pronta\/shopee$/);
  await expect(
    page.getByRole('heading', { name: 'Abra sua conta de vendedora na Shopee' }),
  ).toBeVisible();
  const seller = page.getByRole('link', { name: /Abrir o cadastro da Shopee/ });
  await expect(seller).toHaveAttribute('href', 'https://seller.shopee.com.br/');
  await expect(seller).toHaveAttribute('target', '_blank');
  await expectNoA11yViolations(page);

  // Ainda falta algo no cadastro: o aviso, sem pressa; terminou, volta pra pergunta.
  await page.getByRole('link', { name: 'Já criei minha conta' }).click();
  await expect(
    page.getByRole('heading', { name: 'A Shopee já liberou a sua conta?' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Ainda falta terminar o cadastro' }).click();
  await expect(
    page.getByRole('heading', { name: 'Falta terminar seu cadastro na Shopee' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('link', { name: 'Já terminei' }).click();

  // Liberada: a loja vai pra conexão, que explica o que vai acontecer (e abre em breve).
  await page.getByRole('button', { name: 'Sim, já entro no painel de vendedora' }).click();
  await expect(page).toHaveURL(/\/loja-pronta\/shopee\/conectar$/);
  await expect(page.getByRole('heading', { name: 'Hora de conectar sua Shopee' })).toBeVisible();
  await expect(page.getByText('A conexão abre em breve')).toBeVisible();
  await expectNoA11yViolations(page);

  // A conta já foi: a página dela leva pro painel, que mostra a conexão.
  await page.goto('/loja-pronta/shopee');
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await expect(page.getByRole('link', { name: 'Ver como funciona a conexão' })).toBeVisible();
});

test('quem já tem loja na Shopee pula a criação da conta ao confirmar a marca', async ({
  page,
}) => {
  await signIn(page, studentEmail('shopeeloja'), PASSWORD, '/loja-pronta/marca/revisao');
  await expect(page).toHaveURL(/\/marca\/revisao$/);
  await page.getByRole('button', { name: 'Está tudo certo' }).click();
  await expect(page).toHaveURL(/\/marca\/pronta$/);
  await expect(page.getByText('Próximo passo: conectar a sua Shopee')).toBeVisible();
  await page.getByRole('link', { name: 'Ver como funciona a conexão' }).click();
  await expect(page).toHaveURL(/\/loja-pronta\/shopee\/conectar$/);
});
