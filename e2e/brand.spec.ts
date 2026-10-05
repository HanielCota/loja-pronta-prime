import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { choose, createLogo, expectLogo, goOn, pickAll, tweakLogo } from './support/logo-studio';
import { PASSWORD, studentEmail } from './support/students';

const step = (name: string) => new RegExp(`/loja-pronta/marca/${name}(\\?.*)?$`);

/**
 * Tudo de verdade: o logo é desenhado pela OpenAI e guardado no bucket. Os testes que criam logo
 * esperam a IA (minutos) e custam centavos.
 */

/** Prévia do logo carregada de verdade (a imagem guardada). */
async function expectLogoLoaded(page: Page, alt: RegExp) {
  const image = page.getByRole('img', { name: alt }).first();
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
}

test('marca completa: nome, estúdio do logo, texto, revisão com mudança e logo pra baixar', async ({
  page,
}) => {
  test.setTimeout(600_000);
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
  await expect(page.getByText('Passou 13 letras do limite da Shopee.').first()).toBeVisible();
  await name.press('Enter');
  await expect(page.getByText('Use até 30 letras. Esse nome tem 43.').first()).toBeVisible();
  await expect(name).toBeFocused();
  await page.getByText('Patinhas da Ana', { exact: true }).click();
  await expect(name).toHaveValue('Patinhas da Ana');
  await page.getByRole('button', { name: 'Continuar com “Patinhas da Ana”' }).click();

  // Logo: uma escolha por tela, vendo o rascunho; o resumo; a IA cria; ela compara e escolhe.
  await expect(page).toHaveURL(step('logo'));
  await expect(page.getByRole('heading', { name: 'Como você imagina o logo?' })).toBeFocused();
  await expect(
    page.getByRole('img', { name: 'Rascunho do logo da Patinhas da Ana' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
  // Sem escolher, não segue (e diz o que fazer).
  await goOn(page);
  await expect(page.getByText('Toque numa opção pra continuar.')).toBeVisible();
  await choose(page, 'Com um desenho');
  await goOn(page);
  // Os desenhos do que ela vende (Pets) vêm primeiro, com a sugestão dita pro leitor de tela.
  await expect(
    page.getByRole('heading', { name: 'Qual desenho combina com a Patinhas da Ana?' }),
  ).toBeFocused();
  await expect(
    page.getByRole('radio', { name: 'Patinha', exact: true }),
  ).toHaveAccessibleDescription('Sugestão');
  await choose(page, 'Patinha');
  await goOn(page);
  // A cor que ela escolheu na conversa (verde) é a sugestão.
  await expect(page.getByRole('radio', { name: 'Verde natural' })).toHaveAccessibleDescription(
    /Sugestão/,
  );
  await choose(page, 'Rosa e dourado');
  await goOn(page);
  // Do jeito dela: o que ela escreve vira a escolha da tela.
  await page.getByRole('button', { name: 'Não achei o que queria. Escrever do meu jeito' }).click();
  const own = page.getByLabel('Escreva do seu jeito');
  await expect(own).toBeFocused();
  await own.fill('letra de caneta, bem fina');
  await own.press('Enter');
  await expect(page.getByText('Você escreveu: “letra de caneta, bem fina”')).toBeVisible();
  await expectNoA11yViolations(page);
  await goOn(page);
  await pickAll(page, ['Branco', 'Chapado']);
  // O resumo, escolha por escolha; saiu e voltou, as escolhas continuam lá (elas são guardadas a
  // cada "Continuar", sem a tela esperar: recarrega até a última chegar).
  await expect(async () => {
    await page.reload();
    await expect(
      page.getByRole('definition').filter({ hasText: '“letra de caneta, bem fina”' }),
    ).toBeVisible({ timeout: 2000 });
    await expect(page.getByRole('definition').filter({ hasText: 'Chapado' })).toBeVisible({
      timeout: 2000,
    });
  }).toPass({ timeout: 15_000 });
  await expect(page.getByText('Você ainda pode criar 4 logos.')).toBeVisible();
  await expectNoA11yViolations(page);
  // "Mudar" volta direto na escolha; confirmar retorna ao resumo sem repetir outras perguntas.
  await page.getByRole('button', { name: 'Mudar cores' }).click();
  await expect(page.getByRole('heading', { name: 'Quais cores?' })).toBeFocused();
  await choose(page, 'Lilás e rosa');
  await page.getByRole('button', { name: 'Confirmar mudança' }).click();
  await expect(page.getByRole('heading', { name: 'Confira e crie o seu logo' })).toBeFocused();
  await expect(page.getByRole('definition').filter({ hasText: 'Lilás e rosa' })).toBeVisible();
  // "Voltar" cancela uma edição ainda não confirmada.
  await page.getByRole('button', { name: 'Mudar cores' }).click();
  await choose(page, 'Azul e céu');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.getByRole('definition').filter({ hasText: 'Lilás e rosa' })).toBeVisible();
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole('definition').filter({ hasText: 'Lilás e rosa' })).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 15_000 });

  await createLogo(page, 1);
  await expect(
    page.getByRole('heading', { name: 'Gostou? Veja como fica na sua loja' }),
  ).toBeFocused();
  await expect(page.getByText('No perfil da Shopee', { exact: true })).toBeVisible();
  await expectNoA11yViolations(page);
  // Um ajuste de um toque cria a versão nova direto; "Seus logos" troca entre eles.
  await tweakLogo(page, 'Mais simples', 2);
  await expect(page.getByText('Você ainda pode criar 2 logos.')).toBeVisible();
  const gallery = page.getByRole('group', { name: 'Seus logos (2)' });
  await gallery.getByRole('button', { name: 'Logo 1', exact: true }).click();
  await expect(gallery.getByRole('button', { name: 'Logo 1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expectLogo(page, 1);
  await page.getByRole('button', { name: 'Usar o logo 1' }).click();

  // Texto: já vem um pronto no cartão; um jeito de falar troca o texto, "Outro texto" traz
  // outra versão do mesmo jeito, e vazio não segue.
  await expect(page).toHaveURL(step('descricao'));
  const description = page.getByLabel('Texto da loja');
  await expect(description).toHaveValue(/Patinhas da Ana/);
  await expect(page.getByRole('radio', { name: 'Carinhoso' })).toBeChecked();
  await expectNoA11yViolations(page);
  await page.getByText('Direto', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Direto' })).toBeChecked();
  const direct = await description.inputValue();
  await page.getByRole('button', { name: /^Outro texto/ }).click();
  await expect(description).not.toHaveValue(direct);
  await expect(page.getByRole('radio', { name: 'Direto' })).toBeChecked();
  await page.getByRole('button', { name: 'Apagar' }).click();
  await page.getByRole('button', { name: 'Continuar com esse texto' }).click();
  await expect(page.getByText('Escolha um dos textos ou escreva o seu.').first()).toBeVisible();
  await expect(description).toBeFocused();
  await page.getByText('Direto', { exact: true }).click();
  await page.getByRole('button', { name: 'Continuar com esse texto' }).click();

  // Revisão: mudar o nome volta pra revisão, já com o novo.
  await expect(page).toHaveURL(step('revisao'));
  await expectLogoLoaded(page, /^Logo da loja Patinhas da Ana/);
  await expectNoA11yViolations(page);
  await page.getByRole('link', { name: 'Mudar o nome' }).click();
  await expect(page).toHaveURL(/\/marca\/nome\?editar=1$/);
  await page.getByLabel('Nome da loja').fill('Gatinhos & Cia');
  await page.getByRole('button', { name: 'Continuar com “Gatinhos & Cia”' }).click();
  // O logo traz o nome escrito: ela volta pro estúdio, que avisa e oferece criar outro.
  await expect(page).toHaveURL(/\/marca\/logo\?editar=1&antigo=Patinhas/);
  await expect(page.getByText('Você mudou o nome pra Gatinhos & Cia')).toBeVisible();
  await createLogo(page, 3);
  await page.getByRole('button', { name: 'Usar o logo 3' }).click();
  await expect(page).toHaveURL(step('revisao'));
  // O texto da loja já veio com o nome novo.
  await expect(page.getByRole('main')).toContainText('Gatinhos & Cia');
  await expect(page.getByRole('main')).not.toContainText('Patinhas da Ana');

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

test('estúdio do logo pelo teclado: setas escolhem, "Só o nome" pula o desenho', async ({
  page,
}) => {
  await signIn(page, studentEmail('marcateclado'), PASSWORD, '/loja-pronta/marca');
  await expect(page).toHaveURL(step('nome'));
  await page.getByRole('button', { name: /^Continuar com/ }).press('Enter');
  await expect(page).toHaveURL(step('logo'));

  // As opções são botões de rádio: as setas trocam (o rascunho muda junto).
  await page.getByRole('radio', { name: 'Com um desenho' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Só o nome' })).toBeChecked();
  await page.getByRole('button', { name: 'Continuar' }).press('Enter');
  // Sem desenho, são 5 perguntas, e a próxima já é a das cores.
  await expect(page.getByRole('heading', { name: 'Quais cores?' })).toBeFocused();
  await expect(page.getByText('Pergunta 2 de 5')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Escolhas do logo' })).not.toContainText(
    'Desenho',
  );
  // Falar em vez de escrever (o Chrome tem reconhecimento de voz).
  await page.getByRole('button', { name: 'Não achei o que queria. Escrever do meu jeito' }).click();
  await expect(page.getByRole('button', { name: 'Falar em vez de escrever' })).toBeVisible();
  // Voltar pela barra das telas: a escolha feita continua marcada.
  await page.getByRole('button', { name: 'Tipo: Só o nome. Mudar' }).click();
  await expect(page.getByRole('heading', { name: 'Como você imagina o logo?' })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Só o nome' })).toBeChecked();
});

test('microfone: grava, para e coloca a transcrição no campo para revisão', async ({ page }) => {
  test.setTimeout(90_000);
  // O navegador de teste não tem microfone: simula só a captura, preservando a tela real.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => {} }] }) },
    });
    class TestRecorder extends EventTarget {
      static isTypeSupported() {
        return true;
      }
      mimeType = 'audio/webm';
      state = 'inactive';
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        const chunk = new Event('dataavailable');
        Object.defineProperty(chunk, 'data', {
          value: new Blob(['fala'], { type: this.mimeType }),
        });
        this.dispatchEvent(chunk);
        this.dispatchEvent(new Event('stop'));
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: TestRecorder });
  });
  let received = false;
  let failNetwork = false;
  await page.route('**/loja-pronta/marca/transcrever', async (route) => {
    received = route.request().method() === 'POST';
    if (failNetwork) {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: 'um gatinho com laço' }),
    });
  });
  await signIn(page, studentEmail('marcavoz'), PASSWORD, '/loja-pronta/marca');
  await expect(page).toHaveURL(/\/loja-pronta\/marca\/(nome|logo)$/, { timeout: 20_000 });
  if (page.url().endsWith('/nome')) {
    await page.getByRole('button', { name: /^Continuar com/ }).click();
  }
  await expect(page).toHaveURL(step('logo'), { timeout: 20_000 });
  if (await page.getByRole('radio', { name: 'Com um desenho' }).count()) {
    await choose(page, 'Com um desenho');
    await goOn(page);
  }
  await page.getByRole('button', { name: 'Não achei o que queria. Escrever do meu jeito' }).click();
  await page.getByRole('button', { name: 'Falar em vez de escrever' }).click();
  await expect(page.getByRole('button', { name: 'Parar gravação e transcrever' })).toBeVisible();
  await page.getByRole('button', { name: 'Parar gravação e transcrever' }).click();
  await expect(page.getByRole('textbox', { name: 'Escreva do seu jeito' })).toHaveValue(
    'um gatinho com laço',
  );
  expect(received).toBe(true);
  await page.getByRole('button', { name: 'Usar', exact: true }).click();
  await expect(page.getByText('Você escreveu:')).toContainText('um gatinho com laço');
  await expectNoA11yViolations(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Falar em vez de escrever' })).toBeVisible();
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expectNoA11yViolations(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('negado', 'NotAllowedError');
    };
  });
  await page.getByRole('button', { name: 'Falar em vez de escrever' }).click();
  await expect(page.getByText('Libere o microfone pra este site e tente de novo.')).toBeVisible();
  // Sem internet, conserva o que ela já escreveu e mostra uma frase simples.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => {} }] }) },
    });
  });
  failNetwork = true;
  await page.getByRole('button', { name: 'Falar em vez de escrever' }).click();
  await page.getByRole('button', { name: 'Parar gravação e transcrever' }).click();
  await expect(page.getByText('Não consegui transcrever. Tente de novo ou escreva.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Escreva do seu jeito' })).toHaveValue(
    'um gatinho com laço',
  );
  // A rota real recusa arquivo que não é áudio, antes de chamar a OpenAI.
  const invalid = await page.request.post('/loja-pronta/marca/transcrever', {
    headers: { origin: new URL(page.url()).origin },
    multipart: {
      audio: { name: 'fala.txt', mimeType: 'text/plain', buffer: Buffer.from('não é áudio') },
    },
  });
  expect(invalid.status()).toBe(415);
  const oversized = await page.request.post('/loja-pronta/marca/transcrever', {
    headers: { origin: new URL(page.url()).origin },
    multipart: {
      audio: {
        name: 'fala.webm',
        mimeType: 'audio/webm',
        buffer: Buffer.alloc(3 * 1024 * 1024 + 25_000),
      },
    },
  });
  expect(oversized.status()).toBe(413);
});

test('a marca só abre depois da conversa; o logo é só da dona', async ({ page }) => {
  // Conversa ainda não enviada: volta pra área.
  await signIn(page, studentEmail('conversaretoma'), PASSWORD, '/loja-pronta/marca');
  await expect(page).toHaveURL(/\/loja-pronta(\/conversa\/\w+)?$/);
  for (const path of ['/loja-pronta/marca/logo.png', '/loja-pronta/marca/imagens/e2e-logo-0001']) {
    expect((await page.request.get(path)).status()).toBe(404);
  }
});

test('marca confirmada antes do estúdio, sem logo: só o logo reabre, mesmo com a loja publicada', async ({
  page,
}) => {
  await signIn(page, studentEmail('marcasemlogo'), PASSWORD, '/loja-pronta/marca');
  await expect(page).toHaveURL(step('logo'));
  // Os outros passos continuam fechados: levam pro logo.
  for (const other of ['nome', 'descricao', 'revisao']) {
    await page.goto(`/loja-pronta/marca/${other}`);
    await expect(page).toHaveURL(step('logo'));
  }
  // "Já tem um logo?": a imagem dela entra no estúdio (sem gastar criação), pronta pra usar.
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Enviar a imagem do meu logo' }).click(),
  ]);
  await chooser.setFiles('public/brand/mascote.png');
  await expectLogo(page, 1);
  await expect(page.getByText('O logo que você mandou')).toBeVisible();
  // Logo dela: sem ajustes de um toque (eles redesenham pela IA).
  await expect(page.getByRole('button', { name: 'Mais simples', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Usar o logo 1' }).click();
  // Escolheu: volta pro painel, com o logo; a marca fecha de novo.
  await expect(page).toHaveURL(/\/loja-pronta$/);
  await page.goto('/loja-pronta/marca/logo');
  await expect(page).toHaveURL(/\/loja-pronta$/);
});
