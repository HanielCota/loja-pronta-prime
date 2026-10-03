import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

const step = (id: string) => new RegExp(`/loja-pronta/conversa/${id}(\\?.*)?$`);

/** Responde as perguntas de "Sobre você" (as 5 primeiras), tocando nas opções. */
async function answerAboutYou(page: Page) {
  await page.getByText('Já vendi um pouco').click();
  await expect(page).toHaveURL(step('motivacao'));
  await page.getByText('Renda extra').click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('dificuldade'));
  await page.getByText('Medo de errar').click();
  await expect(page).toHaveURL(step('categorias'));
  await page.getByText('Beleza').click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('tempo'));
  await page.getByText('De 3 a 7 horas').click();
  await expect(page).toHaveURL(step('nome'));
}

test('conversa inicial completa: perguntas, revisão com edição, WhatsApp e loja na fase 2', async ({
  page,
}) => {
  // Percorre a conversa inteira, com checagens de acessibilidade no caminho: é longo de propósito.
  test.slow();
  await signIn(page, studentEmail('conversa'), PASSWORD, '/loja-pronta');
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await expect(
    page.getByRole('heading', { name: 'Conte pra gente sobre você e a sua marca' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('link', { name: 'Começar a conversa' }).click();

  // Pergunta 1: o título da página é a pergunta, e tocar numa opção já avança.
  await expect(page).toHaveURL(step('vendas'));
  await expect(page).toHaveTitle(/Pergunta 1 de 10/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Você já vendeu pela internet?');
  await expect(page.getByRole('radiogroup').or(page.getByRole('group'))).toHaveAccessibleName(
    'Você já vendeu pela internet?',
  );
  await expectNoA11yViolations(page);
  await page.getByText('Já vendi um pouco').click();

  // Várias opções: sem nenhuma, avisa na hora (sem ir ao servidor).
  await expect(page).toHaveURL(step('motivacao'));
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    'Escolha pelo menos uma opção.',
  );
  await expect(page).toHaveURL(step('motivacao'));
  await page.getByText('Renda extra').click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page).toHaveURL(step('dificuldade'));
  await page.getByText('Medo de errar').click();

  // Até 3: na terceira, as outras travam e o contador explica.
  await expect(page).toHaveURL(step('categorias'));
  for (const label of ['Beleza', 'Pets', 'Cozinha']) await page.getByText(label).click();
  await expect(page.getByText('Você escolheu 3 de 3. Pra trocar, desmarque uma.')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Fitness' })).toBeDisabled();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page).toHaveURL(step('tempo'));
  await page.getByText('De 3 a 7 horas').click();

  // Sua marca.
  await expect(page).toHaveURL(step('nome'));
  await page.getByLabel('Nome da loja').fill('  Ateliê   da Aluna ');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('estilo'));
  await page.getByText('Delicado').click();
  await expect(page).toHaveURL(step('cor'));
  await expectNoA11yViolations(page);
  await page.getByText('Lilás').click();
  await expect(page).toHaveURL(step('sentimento'));
  await page.getByText('Acolhidas').click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('toque'));
  // Opcional: sem texto, o botão diz "Pular".
  await page.getByRole('button', { name: 'Pular' }).click();

  // Revisão: as respostas como foram salvas (nome sem espaços sobrando).
  await expect(page).toHaveURL(step('revisao'));
  await expect(page.getByText('Ateliê da Aluna', { exact: true })).toBeVisible();
  await expect(page.getByText('Beleza, Pets, Cozinha')).toBeVisible();
  await expect(page.getByText('Nada em especial')).toBeVisible();
  // Cada grupo da revisão é uma região com nome.
  await expect(page.getByRole('region', { name: 'Sobre você' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Sua marca' })).toBeVisible();
  await expectNoA11yViolations(page);

  // Editar volta pra revisão, já com a resposta nova.
  await page.getByRole('link', { name: 'Editar cor principal' }).click();
  await expect(page).toHaveURL(/\/conversa\/cor\?editar=1$/);
  await expect(page.getByRole('radio', { name: 'Lilás' })).toBeChecked();
  await page.getByText('Verde').click();
  await expect(page).toHaveURL(step('revisao'));
  await expect(page.getByText('Verde', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Está tudo certo' }).click();

  // WhatsApp: número incompleto avisa; com +55 e máscara, aceita.
  await expect(page).toHaveURL(step('whatsapp'));
  await expectNoA11yViolations(page);
  await page.getByLabel('Seu WhatsApp, com DDD').fill('98765');
  await page.getByRole('button', { name: 'Enviar respostas' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Confira o número');
  await page.getByLabel('Seu WhatsApp, com DDD').fill('+55 (11) 98765-4321');
  await page.getByRole('button', { name: 'Enviar respostas' }).click();

  await expect(page).toHaveURL(/\/loja-pronta\/conversa\/pronto$/);
  await expect(page.getByRole('heading', { name: /Agora é com a gente/ })).toBeVisible();
  // O número que ela digitou aparece (dá pra perceber um erro).
  await expect(page.getByText('(11) 98765-4321')).toBeVisible();
  await expectNoA11yViolations(page);

  // A loja foi pra fase 2, com a equipe.
  await page.getByRole('link', { name: 'Ver a minha loja' }).click();
  await expect(page.getByRole('heading', { name: 'Fase 2 de 7' })).toBeVisible();
  // A jornada concorda com o cartão: a conversa concluída, a fase 2 como a atual.
  const phases = page
    .getByRole('list', { name: 'Todas as fases da sua loja' })
    .getByRole('listitem');
  await expect(phases.nth(0)).toContainText('(concluída)');
  await expect(phases.nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('heading', { name: 'Estamos criando a sua marca' })).toBeVisible();

  // Enviada, a conversa não abre de novo.
  await page.goto('/loja-pronta/conversa/vendas');
  await expect(page).toHaveURL(/\/loja-pronta$/);

  // Na escolha, com a loja nas mãos da equipe: o texto diz que ela será chamada, e nenhum cartão
  // é "recomendado" (o curso ainda não abriu).
  await page.goto('/');
  await expect(page.getByText(/Sua loja está com a nossa equipe/)).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Sistema Loja Lucrativa/ }),
  ).not.toHaveAccessibleDescription(/Recomendado/);
});

test('continua de onde parou e não deixa pular perguntas', async ({ page }) => {
  await signIn(page, studentEmail('conversaretoma'), PASSWORD, '/loja-pronta/conversa');
  await expect(page).toHaveURL(step('vendas'));
  await page.getByText('Nunca vendi').click();
  await expect(page).toHaveURL(step('motivacao'));

  // "Continuar depois" volta pra área, que oferece continuar.
  await page.getByRole('link', { name: 'Continuar depois' }).click();
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await page.getByRole('link', { name: 'Continuar a conversa' }).click();
  await expect(page).toHaveURL(step('motivacao'));

  // Pular pelo endereço leva de volta pra pergunta que falta; a revisão também.
  await page.goto('/loja-pronta/conversa/tempo');
  await expect(page).toHaveURL(step('motivacao'));
  await page.goto('/loja-pronta/conversa/revisao');
  await expect(page).toHaveURL(step('motivacao'));

  // Voltar mostra a resposta já salva.
  await page.getByRole('link', { name: 'Voltar' }).click();
  await expect(page).toHaveURL(step('vendas'));
  await expect(page.getByRole('radio', { name: 'Nunca vendi' })).toBeChecked();

  // Etapa que não existe.
  const response = await page.goto('/loja-pronta/conversa/inventada');
  expect(response?.status()).toBe(404);

  // A tela de "pronto" só depois do envio.
  await page.goto('/loja-pronta/conversa/pronto');
  await expect(page).toHaveURL(step('motivacao'));
});

test('pelo teclado, trocar a opção com as setas não avança sozinho', async ({ page }) => {
  await signIn(page, studentEmail('conversateclado'), PASSWORD, '/loja-pronta/conversa');
  await expect(page).toHaveURL(step('vendas'));

  // Só teclado: Tab até a primeira opção, espaço marca, seta troca.
  await page.getByRole('radio', { name: 'Nunca vendi' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio', { name: 'Nunca vendi' })).toBeChecked();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Já vendi um pouco' })).toBeChecked();
  // Espera mais que o atraso do avanço automático: continua na mesma pergunta.
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(step('vendas'));

  await page.getByRole('button', { name: 'Continuar' }).press('Enter');
  await expect(page).toHaveURL(step('motivacao'));

  // Nome: "Ainda não sei" desativa o campo e conta como resposta.
  await page.goto('/loja-pronta/conversa/vendas');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await answerAboutYou(page);
  await page.getByText('Ainda não sei, me ajudem').click();
  await expect(page.getByRole('checkbox', { name: 'Ainda não sei, me ajudem' })).toBeChecked();
  await expect(page.getByLabel('Nome da loja')).toBeDisabled();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('estilo'));
});

test('dois toques rápidos em opções diferentes: um envio só, com a última escolha', async ({
  page,
}) => {
  await signIn(page, studentEmail('conversatoques'), PASSWORD, '/loja-pronta/conversa');
  await expect(page).toHaveURL(step('vendas'));

  let posts = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/loja-pronta/conversa/')) posts += 1;
  });
  await page.getByText('Nunca vendi').click();
  await page.getByText('Já vendo hoje').click();
  await expect(page).toHaveURL(step('motivacao'));
  expect(posts).toBe(1);

  await page.getByRole('link', { name: 'Voltar' }).click();
  await expect(page.getByRole('radio', { name: 'Já vendo hoje' })).toBeChecked();
});

test.describe('sem JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('a conversa funciona com formulários comuns e o servidor confere', async ({ page }) => {
    // Vai da primeira pergunta até o fim: longo de propósito.
    test.slow();
    await signIn(page, studentEmail('conversasemjs'), PASSWORD, '/loja-pronta/conversa');
    await expect(page).toHaveURL(step('vendas'));

    // Sem escolha: o servidor recusa e a pergunta continua.
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText('Escolha uma opção.')).toBeVisible();

    await page.getByText('Já vendo hoje').click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page).toHaveURL(step('motivacao'));

    await page.getByText('Renda extra').click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page).toHaveURL(step('dificuldade'));

    // Até o fim, só com formulários comuns.
    const choose = async (label: string, next: string) => {
      await page.locator('label', { hasText: label }).click();
      await page.getByRole('button', { name: /Continuar|Pular/ }).click();
      await expect(page).toHaveURL(step(next));
    };
    await choose('Falta de tempo', 'categorias');
    await choose('Pets', 'tempo');
    await choose('Até 3 horas', 'nome');
    await page.getByLabel('Nome da loja').fill('Loja Sem JS');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await choose('Moderno', 'cor');
    await choose('Deixo com a equipe', 'sentimento');
    await choose('Seguras', 'toque');
    await page.getByLabel(/Seu toque pessoal/).fill('Um girassol');
    await page.getByRole('button', { name: /Continuar|Pular/ }).click();
    await expect(page).toHaveURL(step('revisao'));
    await expect(page.getByText('Um girassol')).toBeVisible();

    await page.getByRole('link', { name: 'Está tudo certo' }).click();
    await page.getByLabel('Seu WhatsApp, com DDD').fill('21 3456-7890');
    await page.getByRole('button', { name: 'Enviar respostas' }).click();
    await expect(page).toHaveURL(/\/loja-pronta\/conversa\/pronto$/);
    await expect(page.getByText('(21) 3456-7890')).toBeVisible();
    // Só com a Loja Pronta: nada sobre o SLL.
    await expect(page.getByText(/SLL/)).toHaveCount(0);
  });
});

test('quem não pode fazer a conversa não chega nela', async ({ page }) => {
  // Loja já depois da fase 1.
  await signIn(page, studentEmail('lojafase3'), PASSWORD, '/loja-pronta/conversa/vendas');
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await expect(page.getByRole('link', { name: /a conversa/ })).toHaveCount(0);
});

test('sem a Loja Pronta, a conversa leva pra área que ela tem', async ({ page }) => {
  await signIn(page, studentEmail('conversasemloja'), PASSWORD, '/loja-pronta/conversa');
  await expect(page).toHaveURL(/\/sll$/);
});
