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

  // Liberada: a conexão ainda está em breve, então ela coloca a marca na loja à mão.
  await page.getByRole('button', { name: 'Sim, já entro no painel de vendedora' }).click();
  await expect(page).toHaveURL(/\/loja-pronta\/shopee\/marca$/);
  await expect(page.getByRole('heading', { name: 'Coloque sua marca na Shopee' })).toBeVisible();
  await expect(page.getByRole('list').filter({ hasText: 'Abra o Perfil da Loja.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Baixar meu logo' })).toHaveAttribute(
    'href',
    /logo\.png\?baixar=1$/,
  );
  await expect(page.getByLabel('O texto da sua loja')).not.toBeEmpty();
  await expect(page.getByRole('button', { name: 'Copiar o texto' })).toBeVisible();
  await expectNoA11yViolations(page);

  // A conexão continua explicada, pra quem quer saber como vai ser.
  await page.getByRole('link', { name: 'Como vai funcionar a conexão automática' }).click();
  await expect(page).toHaveURL(/\/loja-pronta\/shopee\/conectar$/);
  await expect(page.getByRole('heading', { name: 'Conexão com a Shopee em breve' })).toBeVisible();
  await expect(page.getByText(/A conexão depende da liberação da Shopee/)).toBeVisible();
  await expectNoA11yViolations(page);

  // A conta já foi: a página dela leva pro painel, que oferece o passo a passo da marca.
  await page.goto('/loja-pronta/shopee');
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await expect(page.getByRole('heading', { name: 'Coloque sua marca na Shopee' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver o passo a passo' })).toBeVisible();
});

test('quem já tem loja na Shopee pula a criação da conta ao confirmar a marca', async ({
  page,
}) => {
  await signIn(page, studentEmail('shopeeloja'), PASSWORD, '/loja-pronta/marca/revisao');
  await expect(page).toHaveURL(/\/marca\/revisao$/);
  await page.getByRole('button', { name: 'Está tudo certo' }).click();
  await expect(page).toHaveURL(/\/marca\/pronta$/);
  await expect(
    page.getByRole('heading', { name: 'Próximo passo: sua marca na Shopee' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Colocar minha marca na Shopee' }).click();
  await expect(page).toHaveURL(/\/loja-pronta\/shopee\/marca$/);
});
