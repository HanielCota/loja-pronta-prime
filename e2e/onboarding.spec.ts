import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

const step = (id: string) => new RegExp(`/loja-pronta/conversa/${id}(\\?.*)?$`);

/** Responde as perguntas de "Sobre você" (as 2 primeiras), tocando nas opções. */
async function answerAboutYou(page: Page) {
  await page.getByText('Já vendi, mas parei').click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('categorias'));
  await page.getByText('Beleza').click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('sua-marca'));
  await page.getByRole('link', { name: 'Bora começar' }).click();
  await expect(page).toHaveURL(step('estilo'));
}

test('conversa inicial completa: perguntas, revisão com edição, WhatsApp e loja na fase 2', async ({
  page,
}) => {
  // Percorre a conversa inteira, com checagens de acessibilidade no caminho: é longo de propósito.
  test.slow();
  await signIn(page, studentEmail('conversa'), PASSWORD, '/loja-pronta');
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await expect(page.getByRole('heading', { name: 'Conte sobre você e sua loja' })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('link', { name: 'Começar a conversa' }).click();

  // Pergunta 1: escolher uma opção só avança ao confirmar no botão.
  await expect(page).toHaveURL(step('vendas'));
  await expect(page).toHaveTitle(/Pergunta 1 de 6/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Você já vendeu pela internet?');
  await expect(page.getByRole('radiogroup').or(page.getByRole('group'))).toHaveAccessibleName(
    'Você já vendeu pela internet?',
  );
  await expectNoA11yViolations(page);
  await page.getByText('Já vendi, mas parei').click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Várias opções: sem nenhuma, avisa na hora (sem ir ao servidor).
  await expect(page).toHaveURL(step('categorias'));
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    'Escolha pelo menos uma opção.',
  );
  await expect(page).toHaveURL(step('categorias'));

  // Até 3: na terceira, as outras travam e o contador explica.
  for (const label of ['Beleza', 'Pets', 'Cozinha']) await page.getByText(label).click();
  await expect(page.getByText('Você escolheu 3 de 3. Pra trocar, desmarque uma.')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Fitness' })).toBeDisabled();
  await expectNoA11yViolations(page);
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar' }).click();

  // A passagem pra marca: o que já foi, o que vem agora (sem contar como pergunta).
  await expect(page).toHaveURL(step('sua-marca'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Agora, a cara da sua loja');
  await expect(page.getByRole('listitem').filter({ hasText: 'Te conhecemos' })).toContainText(
    '(feito)',
  );
  await expectNoA11yViolations(page);
  await page.getByRole('link', { name: 'Bora começar' }).click();

  // Sua marca (o nome ela escolhe depois, na marca, com sugestões).
  await expect(page).toHaveURL(step('estilo'));
  await page.getByText('Delicado').click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('cor'));
  await expectNoA11yViolations(page);
  await page.getByText('Lilás').click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('sentimento'));
  await page.getByText('Acolhimento').click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('toque'));
  // Opcional: sem texto, o botão diz "Pular".
  await page.getByRole('button', { name: 'Pular' }).click();

  // Revisão: as respostas como foram salvas.
  await expect(page).toHaveURL(step('revisao'));
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
  await page.getByRole('button', { name: 'Salvar e voltar' }).click();
  await expect(page).toHaveURL(step('revisao'));
  await expect(page.getByText('Verde', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Está tudo certo' }).click();

  // WhatsApp: o número se organiza enquanto ela digita, e a dica diz quanto falta; incompleto,
  // não envia. Colado com +55, o 55 sai sozinho e o número aparece pra ela conferir.
  await expect(page).toHaveURL(step('whatsapp'));
  await expectNoA11yViolations(page);
  const whatsapp = page.getByLabel('Seu WhatsApp, com DDD');
  await whatsapp.fill('1198765');
  await expect(whatsapp).toHaveValue('(11) 9876-5');
  await expect(page.getByText('Faltam 4 números')).toBeVisible();
  await page.getByRole('button', { name: 'Enviar respostas' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Confira o número');
  await whatsapp.fill('+55 (11) 98765-4321');
  await expect(whatsapp).toHaveValue('(11) 98765-4321');
  // O texto aparece embaixo do campo (e, escondido, no aviso pro leitor de tela).
  await expect(page.getByText('Número completo').first()).toBeVisible();
  await expect(page.getByText('Confira seu número: (11) 98765-4321')).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Enviar respostas' }).click();

  await expect(page).toHaveURL(/\/loja-pronta\/conversa\/pronto$/);
  await expect(page.getByRole('heading', { name: /Agora vem a sua marca/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Criar minha marca/ })).toBeVisible();
  // O número que ela digitou aparece (dá pra perceber um erro).
  await expect(page.getByText('(11) 98765-4321')).toBeVisible();
  await expectNoA11yViolations(page);

  // A loja foi pra fase 2: a vez da marca.
  await page.getByRole('link', { name: 'Fazer depois' }).click();
  // O caminho concorda com o destaque: a conversa feita, a marca como a etapa atual.
  const stages = page.getByRole('list', { name: 'As etapas da sua loja' }).getByRole('listitem');
  await expect(stages.nth(0)).toContainText('(feita)');
  await expect(stages.nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('heading', { name: 'Crie a marca da sua loja' })).toBeVisible();

  // Enviada, a conversa reabre só pra rever: a pergunta salva volta pra revisão (e2e/revise.spec.ts).
  await page.goto('/loja-pronta/conversa/vendas');
  await expect(page.getByRole('button', { name: 'Salvar e voltar' })).toBeVisible();

  // Na escolha, a marca depende dela: a Loja Pronta é a recomendada, e o curso (que ainda não
  // abriu) não.
  await page.goto('/');
  await expect(page.getByText('Sua loja está esperando por você.')).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Sistema Loja Lucrativa/ }),
  ).not.toHaveAccessibleDescription(/Recomendado/);
});

test('continua de onde parou e não deixa pular perguntas', async ({ page }) => {
  await signIn(page, studentEmail('conversaretoma'), PASSWORD, '/loja-pronta/conversa');
  await expect(page).toHaveURL(step('vendas'));
  await page.getByText('Nunca vendi').click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('categorias'));

  // "Terminar depois" volta pra área, que oferece continuar.
  await page.getByRole('link', { name: 'Terminar depois' }).click();
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await page.getByRole('link', { name: 'Continuar a conversa' }).click();
  await expect(page).toHaveURL(step('categorias'));

  // Pular pelo endereço leva de volta pra pergunta que falta; a revisão também.
  await page.goto('/loja-pronta/conversa/estilo');
  await expect(page).toHaveURL(step('categorias'));
  // Link de uma pergunta que saiu da conversa: volta pra onde ela parou.
  await page.goto('/loja-pronta/conversa/nome');
  await expect(page).toHaveURL(step('categorias'));
  await page.goto('/loja-pronta/conversa/revisao');
  await expect(page).toHaveURL(step('categorias'));

  // Voltar mostra a resposta já salva.
  await page.getByRole('link', { name: 'Voltar' }).click();
  await expect(page).toHaveURL(step('vendas'));
  await expect(page.getByRole('radio', { name: 'Nunca vendi' })).toBeChecked();

  // Etapa que não existe.
  const response = await page.goto('/loja-pronta/conversa/inventada');
  expect(response?.status()).toBe(404);

  // A tela de "pronto" só depois do envio.
  await page.goto('/loja-pronta/conversa/pronto');
  await expect(page).toHaveURL(step('categorias'));
});

test('pelo teclado, trocar a opção com as setas não avança sozinho', async ({ page }) => {
  await signIn(page, studentEmail('conversateclado'), PASSWORD, '/loja-pronta/conversa');
  await expect(page).toHaveURL(step('vendas'));

  // Só teclado: Tab até a primeira opção, espaço marca, seta troca.
  await page.getByRole('radio', { name: 'Vendo em outro lugar' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio', { name: 'Vendo em outro lugar' })).toBeChecked();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Já vendi, mas parei' })).toBeChecked();
  // Espera mais que o atraso do avanço automático: continua na mesma pergunta.
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(step('vendas'));

  await page.getByRole('button', { name: 'Continuar' }).press('Enter');
  await expect(page).toHaveURL(step('categorias'));
});

test('clique duplo numa opção não avança até tocar em Continuar', async ({ page }) => {
  await signIn(page, studentEmail('conversatoques'), PASSWORD, '/loja-pronta/conversa');
  await expect(page).toHaveURL(step('vendas'));

  let posts = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/loja-pronta/conversa/')) posts += 1;
  });

  await page
    .locator('label')
    .filter({ has: page.getByRole('radio', { name: 'Nunca vendi' }) })
    .dblclick();
  await expect(page.getByRole('radio', { name: 'Nunca vendi' })).toBeChecked();
  await expect(page).toHaveURL(step('vendas'));
  expect(posts).toBe(0);

  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('categorias'));
  expect(posts).toBe(1);

  await page.getByRole('link', { name: 'Voltar' }).click();
  await expect(page.getByRole('radio', { name: 'Nunca vendi' })).toBeChecked();
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

    await page.getByText('Vendo em outro lugar').click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page).toHaveURL(step('categorias'));

    // Até o fim, só com formulários comuns.
    const choose = async (label: string, next: string) => {
      await page.locator('label', { hasText: label }).click();
      await page.getByRole('button', { name: /Continuar|Pular/ }).click();
      await expect(page).toHaveURL(step(next));
    };
    await choose('Pets', 'sua-marca');
    await page.getByRole('link', { name: 'Bora começar' }).click();
    await expect(page).toHaveURL(step('estilo'));
    await choose('Moderno', 'cor');
    await choose('Escolho depois', 'sentimento');
    await choose('Confiança', 'toque');
    await page.getByLabel(/Seu toque pessoal/).fill('Um girassol');
    await page.getByRole('button', { name: /Continuar|Pular/ }).click();
    await expect(page).toHaveURL(step('revisao'));
    await expect(page.getByText('Um girassol')).toBeVisible();

    await page.getByRole('link', { name: 'Está tudo certo' }).click();
    await page.getByLabel('Seu WhatsApp, com DDD').fill('21 98765-4321');
    await page.getByRole('button', { name: 'Enviar respostas' }).click();
    await expect(page).toHaveURL(/\/loja-pronta\/conversa\/pronto$/);
    await expect(page.getByText('(21) 98765-4321')).toBeVisible();
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

test('"Outra cor": abre o seletor, não segue sozinha e guarda a cor escolhida', async ({
  page,
}) => {
  await signIn(page, studentEmail('conversacor'), PASSWORD, '/loja-pronta/conversa');
  await expect(page).toHaveURL(step('vendas'));
  await answerAboutYou(page);
  await page.getByText('Natural').click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('cor'));

  await page.getByText('Outra cor', { exact: true }).click();
  const picker = page.getByRole('textbox', { name: 'Escolha a sua cor:' });
  await expect(picker).toBeVisible();
  // Espera mais que o avanço automático das outras cores: continua aqui.
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(step('cor'));
  await picker.fill('#e0218a');
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(step('sentimento'));

  // Voltou: a cor dela continua marcada, no seletor.
  await page.getByRole('link', { name: 'Voltar' }).click();
  await expect(page.getByRole('button', { name: 'Outra cor' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(picker).toHaveValue('#e0218a');
});
