import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

const SLL = /As aulas abrem em breve/;
const LOJA_PRONTA = /^Sua loja$/;

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
  // Sem topo (não há pra onde voltar) e nada competindo com os produtos: o sair fica no rodapé.
  await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(
    page.getByRole('contentinfo').getByRole('button', { name: 'Sair da conta' }),
  ).toBeVisible();
  // Leitor de tela: cada produto é um título, o link se chama pelo que faz e o resto do cartão
  // (incluindo qual é o recomendado) vem como descrição.
  await expect(page.getByRole('heading', { level: 2, name: 'Loja Pronta' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Entrar, Loja Pronta' })).toHaveAccessibleDescription(
    /^Recomendado agora\. Sua loja na Shopee, passo a passo Etapa 1 de 3 Você conta sobre você Conte sobre você/,
  );
  // A Loja Pronta vem primeiro.
  await expect(page.getByRole('main').getByRole('link').first()).toContainText('Loja Pronta');
  // O bloco da Loja Pronta mostra a fase da loja.
  await expect(page.getByRole('link', { name: /Loja Pronta/ })).toContainText('Etapa 1 de 3');
  await expect(page.getByRole('link', { name: /Loja Pronta/ })).toContainText(
    'Você conta sobre você',
  );
  // E o que acontece agora, no lugar do resumo do produto.
  await expect(page.getByRole('link', { name: /Loja Pronta/ })).toContainText(
    'Conte sobre você e sua marca',
  );
  await expectNoA11yViolations(page);

  await page.getByRole('link', { name: /Sistema Loja Lucrativa/ }).click();
  await expect(page).toHaveURL(/\/sll$/);
  await expect(page.getByRole('heading', { name: SLL })).toBeVisible();
  await expectNoA11yViolations(page);

  // Sem barra: com os dois produtos, o link "Início" leva de volta pra escolha.
  await page.getByRole('link', { name: 'Início' }).click();
  await expect(page.getByRole('heading', { name: /Pra onde vamos/ })).toBeVisible();
  await page.goto('/loja-pronta');
  await expect(page.getByRole('heading', { name: LOJA_PRONTA })).toBeVisible();
  await expectNoA11yViolations(page);

  // De volta ao início, a última área aberta aparece como "Continuar". A visita é registrada
  // logo depois da resposta, então confere recarregando.
  await page.goto('/');
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole('link', { name: /^Continuar, Loja Pronta$/ })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  await expect(
    page.getByRole('link', { name: /^Ver o que vem aí, Sistema Loja Lucrativa/ }),
  ).toBeVisible();
  // A loja dela está na fase 1, que depende dela: o texto de cima diz isso, em vez do genérico
  // "Continue de onde parou".
  await expect(page.getByText('Sua loja está esperando por você.')).toBeVisible();

  // Na mesma sessão, a saudação não muda; num login seguinte, ela é recebida de volta.
  await page.goto('/sll');
  await expect(page.getByRole('heading', { name: SLL })).toBeVisible();
  await expect(page.getByText(/^Boas-vindas, E2E!/)).toBeVisible();
  await context.clearCookies();
  await signIn(page, studentEmail('doisprodutos'), PASSWORD, '/sll');
  await expect(page).toHaveURL(/\/sll$/);
  // Quem volta não é cumprimentada de novo (já foi, na escolha de área).
  await expect(page.getByText(/^Boas-vindas/)).toHaveCount(0);
  // Quem volta vê em qual produto está, acima do título.
  await expect(page.getByText('Sistema Loja Lucrativa (SLL)', { exact: true })).toBeVisible();
});

test('com um produto só: entra direto nele, sem tela de escolha', async ({ page }) => {
  await signIn(page, studentEmail('sosll'), PASSWORD);
  await expect(page).toHaveURL(/\/sll$/);
  await expect(page.getByRole('heading', { name: SLL })).toBeVisible();
  // Ela nunca passa pela escolha: o sair fica na própria área.
  await expect(page.getByRole('button', { name: 'Sair da conta' })).toBeVisible();
  // E não há pra onde voltar.
  await expect(page.getByRole('link', { name: 'Início' })).toHaveCount(0);

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

test('Loja Pronta mostra o que fazer agora e o caminho em 3 etapas', async ({ page }) => {
  await signIn(page, studentEmail('lojafase3'), PASSWORD);
  await expect(page).toHaveURL(/\/loja-pronta$/);
  // Sem marca ainda: o título é "Sua loja".
  await expect(page.getByRole('heading', { level: 1, name: 'Sua loja' })).toBeVisible();

  const stages = page.getByRole('list', { name: 'As etapas da sua loja' }).getByRole('listitem');
  await expect(stages).toHaveCount(3);
  await expect(stages.nth(0)).toContainText('(feita)');
  await expect(stages.nth(1)).toContainText('(feita)');
  await expect(stages.nth(2)).toHaveAttribute('aria-current', 'step');
  await expect(stages.nth(2)).toContainText('Passo 1 de 5: Conta na Shopee');
  // Fase ainda sem tela: avisa que está chegando, sem pedir nada.
  await expect(page.getByRole('heading', { name: 'Conta na Shopee' })).toBeVisible();
  await expect(page.getByText(/Avisamos no WhatsApp quando ela abrir/)).toBeVisible();
  await expect(page.getByRole('main').getByRole('link')).toHaveCount(0);
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
