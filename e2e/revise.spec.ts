import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

test('conversa enviada: ela revê e muda uma resposta, sem voltar de fase', async ({ page }) => {
  await signIn(page, studentEmail('revisaconversa'), PASSWORD, '/loja-pronta');
  await expect(page).toHaveURL(/\/loja-pronta$/);
  // Só a etapa feita tem o link; a marca (a atual) ainda não.
  await expect(page.getByRole('link', { name: /^Ver e editar/ })).toHaveCount(1);
  await page.getByRole('link', { name: 'Ver e editar: Conte sobre você e sua loja' }).click();

  await expect(page).toHaveURL(/\/conversa\/revisao$/);
  await expect(page.getByRole('heading', { name: 'Suas respostas' })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('link', { name: 'Editar cor principal' }).click();
  await expect(page.getByRole('radio', { name: 'Verde' })).toBeChecked();
  await page.getByText('Lilás').click();
  await expect(page).toHaveURL(/\/conversa\/revisao$/);
  await expect(page.getByText('Lilás', { exact: true })).toBeVisible();

  // O WhatsApp (o canal dos avisos) dá pra corrigir: abre com o número salvo e volta pra revisão.
  await page.getByRole('link', { name: 'Editar WhatsApp' }).click();
  await expect(page).toHaveURL(/\/conversa\/whatsapp$/);
  const whatsapp = page.getByLabel('Seu WhatsApp, com DDD');
  await expect(whatsapp).toHaveValue('(11) 98765-4321');
  await whatsapp.fill('21 99876-5432');
  await page.getByRole('button', { name: 'Salvar o número' }).click();
  await expect(page).toHaveURL(/\/conversa\/revisao$/);
  await expect(page.getByText('(21) 99876-5432')).toBeVisible();

  await page.getByRole('link', { name: 'Voltar pra Loja Pronta' }).click();
  await expect(page).toHaveURL(/\/loja-pronta$/);
  // Continua na fase da marca.
  await expect(page.getByText('Etapa 2 de 3', { exact: false }).first()).toBeVisible();
});

test('marca confirmada: ela muda o nome e volta pro painel na mesma fase', async ({ page }) => {
  await signIn(page, studentEmail('revisamarca'), PASSWORD, '/loja-pronta');
  await expect(page.getByRole('heading', { level: 1, name: 'Patinhas da Ana' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Ver e editar/ })).toHaveCount(2);
  await page.getByRole('link', { name: 'Ver e editar: Crie a marca da sua loja' }).click();

  await expect(page).toHaveURL(/\/marca\/revisao$/);
  await expect(page.getByRole('heading', { name: 'Sua marca' }).first()).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('link', { name: 'Mudar o nome' }).click();
  await page.getByLabel('Nome da loja').fill('Patinhas & Cia');
  await page.getByRole('button', { name: 'Continuar com “Patinhas & Cia”' }).click();
  // O logo traz o nome antigo: o estúdio avisa; ela pode seguir com ele, voltando pra revisão.
  await expect(page).toHaveURL(/\/marca\/logo\?editar=1&antigo=Patinhas/);
  await expect(page.getByText('Você mudou o nome pra Patinhas & Cia')).toBeVisible();
  await page.getByRole('link', { name: 'Voltar' }).click();
  await expect(page).toHaveURL(/\/marca\/revisao$/);
  await expect(page.getByText('Patinhas & Cia', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Voltar pra Loja Pronta' }).click();
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Patinhas & Cia' })).toBeVisible();
  await expect(page.getByText('Etapa 3 de 3', { exact: false }).first()).toBeVisible();
});

test('loja publicada: as fases feitas não reabrem', async ({ page }) => {
  await signIn(page, studentEmail('revisatravada'), PASSWORD, '/loja-pronta');
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await expect(page.getByRole('link', { name: /^Ver e editar/ })).toHaveCount(0);

  await page.goto('/loja-pronta/conversa/revisao');
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await page.goto('/loja-pronta/marca/revisao');
  await expect(page).toHaveURL(/\/loja-pronta$/);
});
