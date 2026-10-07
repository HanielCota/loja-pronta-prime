import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

// O título do painel do SLL é a saudação ("Boas-vindas, Ana!" na primeira visita, depois "Olá").
const SLL = /^(Boas-vindas|Olá)/;

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
  await expect(page.getByRole('link', { name: 'Entrar, Loja Pronta' })).toBeVisible();
});

test('com os dois produtos: escolhe uma área e depois a outra', async ({ page, context }) => {
  // Passa pelas duas áreas, pela escolha e por um novo login: longo de propósito.
  test.slow();
  await signIn(page, studentEmail('doisprodutos'), PASSWORD);
  await expect(page.getByRole('heading', { name: /Pra onde vamos/ })).toBeVisible();
  // No topo, a marca e a conta; sem voltar (já é o início) e sem rodapé competindo com os produtos.
  await expect(page.getByRole('banner').getByRole('button', { name: 'Sua conta' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Você está em' }).getByRole('link', { name: 'Início' }),
  ).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  // Leitor de tela: cada produto é um título, o link se chama pelo que faz e o resto do cartão
  // (incluindo qual é o recomendado) vem como descrição.
  await expect(page.getByRole('heading', { level: 2, name: 'Loja Pronta' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Entrar, Loja Pronta' })).toHaveAccessibleDescription(
    /^Recomendado agora\. Sua loja na Shopee, passo a passo Etapa 1 de 3 Conte sobre você e sua loja Responda a algumas perguntas sobre suas preferências e seus planos/,
  );
  // A Loja Pronta vem primeiro.
  await expect(page.getByRole('main').getByRole('link').first()).toContainText('Loja Pronta');
  // O bloco da Loja Pronta mostra a fase da loja.
  await expect(page.getByRole('link', { name: 'Entrar, Loja Pronta' })).toContainText(
    'Etapa 1 de 3',
  );
  await expect(page.getByRole('link', { name: 'Entrar, Loja Pronta' })).toContainText(
    'Conte sobre você e sua loja',
  );
  // E o que acontece agora, no lugar do resumo do produto.
  await expect(page.getByRole('link', { name: 'Entrar, Loja Pronta' })).toContainText(
    'Responda a algumas perguntas sobre suas preferências e seus planos.',
  );
  await expectNoA11yViolations(page);

  await page.getByRole('link', { name: /Sistema Loja Lucrativa/ }).click();
  await expect(page).toHaveURL(/\/sll$/);
  await expect(page.getByRole('heading', { level: 1, name: SLL })).toBeVisible();
  await expectNoA11yViolations(page);

  // Com os dois produtos, dá pra trocar de área direto, sem passar pela escolha: no SLL, pelo pé
  // do menu lateral; na Loja Pronta, pelas abas da barra do topo.
  const areas = page.getByRole('navigation', { name: 'Suas áreas' });
  await areas.getByRole('link', { name: 'Ir pra Minha loja' }).click();
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await expect(areas.getByRole('link', { name: 'Minha loja' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  // A marca no topo continua levando pra escolha.
  await page.getByRole('banner').getByRole('link', { name: 'Loja Pronta Prime' }).click();
  await expect(page.getByRole('heading', { name: /Pra onde vamos/ })).toBeVisible();
  await page.goto('/loja-pronta');
  // A escolha já disse "Oi": a área não cumprimenta de novo.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Vamos montar sua loja?', exact: true }),
  ).toBeVisible();
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
    page.getByRole('link', { name: /^Acessar o SLL, Sistema Loja Lucrativa/ }),
  ).toBeVisible();
  // A loja dela está na fase 1, que depende dela: o texto de cima diz isso, em vez do genérico
  // "Continue de onde parou".
  await expect(page.getByText('Sua loja está esperando por você.')).toBeVisible();

  // Na mesma sessão, a saudação não muda; num login seguinte, ela é recebida de volta.
  await page.goto('/sll');
  await expect(page.getByRole('heading', { level: 1, name: SLL })).toBeVisible();
  await expect(page.getByText(/^Boas-vindas, Ana!/)).toBeVisible();
  await context.clearCookies();
  await signIn(page, studentEmail('doisprodutos'), PASSWORD, '/sll');
  await expect(page).toHaveURL(/\/sll$/);
  // Quem volta não é cumprimentada de novo (já foi, na escolha de área).
  await expect(page.getByText(/^Boas-vindas/)).toHaveCount(0);
  // E continua podendo ir pra outra área pelo menu lateral.
  await expect(
    page
      .getByRole('navigation', { name: 'Suas áreas' })
      .getByRole('link', { name: 'Ir pra Minha loja' }),
  ).toBeVisible();
});

test('com um produto só: entra direto nele, sem tela de escolha', async ({ page }) => {
  await signIn(page, studentEmail('sosll'), PASSWORD);
  await expect(page).toHaveURL(/\/sll$/);
  await expect(page.getByRole('heading', { level: 1, name: SLL })).toBeVisible();
  // Ela nunca passa pela escolha: a conta (e o sair) fica no pé do menu da própria área.
  await page.getByRole('button', { name: 'Sua conta' }).click();
  await expect(page.getByRole('menuitem', { name: 'Sair da conta' })).toBeVisible();
  await page.keyboard.press('Escape');
  // E não há pra onde voltar nem outra área pra trocar.
  await expect(
    page.getByRole('navigation', { name: 'Você está em' }).getByRole('link', { name: 'Início' }),
  ).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Suas áreas' })).toHaveCount(0);

  // A área do produto que ela não tem leva de volta (e o início manda pro produto dela).
  await page.goto('/loja-pronta');
  await expect(page).toHaveURL(/\/sll$/);
});

test('menu da marca mostra a área única e permite voltar à conversa', async ({ page }) => {
  await signIn(page, studentEmail('marca'), PASSWORD);
  await expect(page).toHaveURL(/\/loja-pronta$/);

  await page.getByRole('banner').getByRole('link', { name: 'Loja Pronta Prime' }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page.getByRole('heading', { name: /Pra onde vamos/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^(Entrar|Continuar), Loja Pronta$/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Sistema Loja Lucrativa/ })).toHaveCount(0);
  await expectNoA11yViolations(page);

  await page.getByRole('link', { name: /^(Entrar|Continuar), Loja Pronta$/ }).click();
  await page.getByRole('link', { name: 'Ver e editar: Conte sobre você e sua loja' }).click();
  await expect(page).toHaveURL(/\/loja-pronta\/conversa/);
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
  // Sem marca ainda: o título chama pra montar a loja. Com um produto só, esta é a primeira tela
  // dela, e a saudação fica aqui.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Oi, Ana! Vamos montar sua loja?' }),
  ).toBeVisible();

  const stages = page.getByRole('list', { name: 'As etapas da sua loja' }).getByRole('listitem');
  await expect(stages).toHaveCount(3);
  await expect(stages.nth(0)).toContainText('Feita');
  await expect(stages.nth(1)).toContainText('Feita');
  await expect(stages.nth(2)).toHaveAttribute('aria-current', 'step');
  await expect(stages.nth(2)).toContainText('Etapa 3 · Você está aqui');
  await expect(stages.nth(2)).toContainText('Passo 1 de 5: Conta na Shopee');
  // A conta na Shopee: um botão só, pro passo a passo (e2e/shopee.spec.ts).
  await expect(page.getByRole('heading', { name: 'Conta na Shopee' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Abrir minha conta na Shopee' })).toHaveAttribute(
    'href',
    '/loja-pronta/shopee',
  );
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
