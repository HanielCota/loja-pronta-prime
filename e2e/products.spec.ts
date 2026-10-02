import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

const SLL = /Boas-vindas ao Sistema Loja Lucrativa/;
const LOJA_PRONTA = /Boas-vindas à Loja Pronta/;

test('depois de criar a senha no primeiro acesso, escolhe entre a Loja Pronta e o SLL', async ({
  page,
}) => {
  await signIn(page, studentEmail('primeiroacessoescolha'), PASSWORD);
  await expect(page).toHaveURL(/\/primeiro-acesso$/);
  await page.getByLabel('Senha nova').fill('minha loja vai bombar');
  await page.getByRole('button', { name: 'Salvar e entrar' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Pra onde vamos/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Sistema Loja Lucrativa/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Loja Pronta/ }).first()).toBeVisible();
});

test('com os dois produtos: escolhe uma área e depois a outra', async ({ page, context }) => {
  await signIn(page, studentEmail('doisprodutos'), PASSWORD);
  await expect(page.getByRole('heading', { name: /Pra onde vamos/ })).toBeVisible();
  // Sem barra do topo: na tela, só os produtos.
  await expect(page.getByRole('banner')).toHaveCount(0);
  // O bloco da Loja Pronta mostra a fase da loja.
  await expect(page.getByRole('link', { name: /Loja Pronta/ })).toContainText(
    'Fase 1 de 7 · Conversa inicial',
  );
  await expectNoA11yViolations(page);

  await page.getByRole('link', { name: /Sistema Loja Lucrativa/ }).click();
  await expect(page).toHaveURL(/\/sll$/);
  await expect(page.getByRole('heading', { name: SLL })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.goto('/loja-pronta');
  await expect(page.getByRole('heading', { name: LOJA_PRONTA })).toBeVisible();
  await expectNoA11yViolations(page);

  // De volta ao início, a última área aberta aparece como "Continuar". A visita é registrada
  // logo depois da resposta, então confere recarregando.
  await page.goto('/');
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole('link', { name: /Loja Pronta.*Continuar/ })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  await expect(page.getByRole('link', { name: /Sistema Loja Lucrativa.*Entrar/ })).toBeVisible();

  // Na mesma sessão, a saudação não muda; num login seguinte, ela é recebida de volta.
  await page.goto('/sll');
  await expect(page.getByRole('heading', { name: SLL })).toBeVisible();
  await context.clearCookies();
  await signIn(page, studentEmail('doisprodutos'), PASSWORD, '/sll');
  await expect(page).toHaveURL(/\/sll$/);
  await expect(page.getByRole('heading', { name: /Bom te ver de novo/ })).toBeVisible();
});

test('com um produto só: entra direto nele, sem tela de escolha', async ({ page }) => {
  await signIn(page, studentEmail('sosll'), PASSWORD);
  await expect(page).toHaveURL(/\/sll$/);
  await expect(page.getByRole('heading', { name: SLL })).toBeVisible();
  // Ela nunca passa pela escolha: o sair fica na própria área.
  await expect(page.getByRole('button', { name: 'Sair da conta' })).toBeVisible();

  // A área do produto que ela não tem leva de volta (e o início manda pro produto dela).
  await page.goto('/loja-pronta');
  await expect(page).toHaveURL(/\/sll$/);
});

test('sem nenhum produto: avisa que o acesso ainda não foi liberado', async ({ page }) => {
  await signIn(page, studentEmail('semproduto'), PASSWORD);
  await expect(
    page.getByRole('heading', { name: 'Seu acesso ainda não foi liberado' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);

  // "Verificar de novo" recarrega o início (ainda sem produto, continua o aviso).
  await page.getByRole('link', { name: 'Verificar de novo' }).click();
  await expect(
    page.getByRole('heading', { name: 'Seu acesso ainda não foi liberado' }),
  ).toBeVisible();

  await page.goto('/sll');
  await expect(page).toHaveURL(/\/$/);
});

test('Loja Pronta mostra a fase da loja e todas as fases', async ({ page }) => {
  await signIn(page, studentEmail('lojafase3'), PASSWORD);
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await expect(page.getByRole('heading', { name: 'Fase 3 de 7' })).toBeVisible();

  const phases = page
    .getByRole('list', { name: 'Todas as fases da sua loja' })
    .getByRole('listitem');
  await expect(phases).toHaveCount(7);
  await expect(phases.nth(0)).toContainText('(concluída)');
  await expect(phases.nth(2)).toHaveAttribute('aria-current', 'step');
  await expect(phases.nth(2)).toContainText('Conexão com a Shopee');
  await expect(phases.nth(3)).toContainText('(a seguir)');
  await expectNoA11yViolations(page);
});

test('área sem login vai pro login e volta pra área depois de entrar', async ({ page }) => {
  await page.goto('/sll');
  await expect(page).toHaveURL(/\/entrar\?next=%2Fsll$/);
  await page.getByLabel('Email da compra').fill(studentEmail('voltaarea'));
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/sll$/);
});
