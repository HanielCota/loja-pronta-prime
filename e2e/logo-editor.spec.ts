import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

const canvas = (page: Page) => page.getByRole('img', { name: /^Seu logo, com/ });
const layers = (page: Page) =>
  page.getByRole('region', { name: 'Partes do logo' }).getByRole('button');
/** Os elementos desenhados no quadro (aparecem depois que as letras do logo carregam). */
const drawn = (page: Page) => canvas(page).locator(':scope > g[transform]:not([aria-hidden])');
/** O lugar (e o giro) do elemento na posição `index` das camadas de trás pra frente. */
const placement = (page: Page, index: number) =>
  canvas(page).locator(':scope > g[transform]').nth(index).getAttribute('transform');
/** Um item do menu do editor (Estilo, Modelos, Desenhos, Textos, Partes, Versões). */
const tool = (page: Page, name: string) =>
  page.getByRole('group', { name: 'Ferramentas do logo' }).getByRole('radio', { name });

test.describe('no computador', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('editor: escolhe, arrasta, gira, apaga, desfaz e salva', async ({ page }) => {
    await signIn(page, studentEmail('editorlivre'), PASSWORD, '/loja-pronta/marca/ajustar');
    await expect(page).toHaveURL(/\/loja-pronta\/marca\/ajustar$/);
    await expect(drawn(page)).toHaveCount(2);
    // Abre no Estilo.
    await expect(tool(page, 'Estilo')).toBeChecked();
    await expectNoA11yViolations(page);

    // Pela lista de partes (o caminho do teclado), o nome; o painel mostra só ele.
    await tool(page, 'Partes').check({ force: true });
    await expect(layers(page)).toHaveCount(2);
    await page.getByRole('button', { name: 'Nome da loja', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nome da loja' })).toBeVisible();
    await expectNoA11yViolations(page);

    // Arrastar no quadro muda o lugar.
    const before = await placement(page, 1);
    const box = (await canvas(page).boundingBox())!;
    const unit = box.width / 1000;
    const nameBox = (await canvas(page).locator(':scope > g[transform]').nth(1).boundingBox())!;
    await page.mouse.move(nameBox.x + nameBox.width / 2, nameBox.y + nameBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      nameBox.x + nameBox.width / 2 + 40 * unit,
      nameBox.y + nameBox.height / 2 + 60 * unit,
      { steps: 6 },
    );
    await page.mouse.up();
    expect(await placement(page, 1)).not.toBe(before);

    // O giro pelo número.
    await page.getByLabel('Giro (°)').fill('15');
    expect(await placement(page, 1)).toContain('rotate(15)');

    // Apagar volta pra lista de partes; Ctrl+Z traz de volta.
    await page.getByRole('button', { name: 'Apagar' }).click();
    await expect(layers(page)).toHaveCount(1);
    await page.keyboard.press('Control+z');
    await expect(layers(page)).toHaveCount(2);

    // Salva sozinho; o logo salvo (o que vira PNG) já é o do editor.
    await expect(page.getByText('Tudo salvo')).toBeAttached({ timeout: 10_000 });
    const saved = await page.request.get('/loja-pronta/marca/logo.svg?v=1');
    expect(await saved.text()).toContain('rotate(15)');

    await page.getByRole('button', { name: 'Gostei, continuar' }).click();
    await expect(page).toHaveURL(/\/loja-pronta\/marca\/descricao$/);
  });
});

test.describe('biblioteca, no computador', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('adiciona desenho, forma e texto, busca e recomeça de um modelo', async ({ page }) => {
    await signIn(page, studentEmail('editorbiblioteca'), PASSWORD, '/loja-pronta/marca/ajustar');
    await expect(drawn(page)).toHaveCount(2);

    // Um desenho a mais, já escolhido e cheio; "Pronto" volta pros desenhos.
    await tool(page, 'Desenhos').check({ force: true });
    await page.getByLabel('Buscar desenhos').fill('osso');
    await page.getByRole('button', { name: 'Adicionar Osso' }).click();
    await expect(drawn(page)).toHaveCount(3);
    await expect(page.getByRole('heading', { name: /Desenho: Osso/ })).toBeVisible();
    await page.getByLabel('Desenho cheio').check();
    await page.getByRole('button', { name: 'Pronto' }).click();

    // Uma forma.
    await page.getByLabel('Buscar desenhos').fill('');
    await page.getByRole('button', { name: 'Adicionar Faixa' }).click();
    await expect(drawn(page)).toHaveCount(4);
    await page.getByRole('button', { name: 'Pronto' }).click();

    // A busca ignora acento.
    await page.getByLabel('Buscar desenhos').fill('maca');
    await expect(page.getByRole('button', { name: 'Adicionar Maçã' })).toBeVisible();

    // Um texto dela, que dá pra corrigir depois.
    await tool(page, 'Textos').check({ force: true });
    await page.getByLabel('Escreva um texto').fill('desde 2020');
    await page.getByRole('button', { name: 'Adicionar texto' }).click();
    await page.getByLabel('O que está escrito').fill('desde 2021');
    await expect(page.getByRole('heading', { name: /Texto: desde 2021/ })).toBeVisible();
    await expect(drawn(page)).toHaveCount(5);
    await expectNoA11yViolations(page);

    // Um modelo arruma tudo de novo; Desfazer traz o de antes.
    await tool(page, 'Modelos').check({ force: true });
    await page.getByRole('button', { name: 'Selo redondo', exact: true }).click();
    await expect(drawn(page)).not.toHaveCount(5);
    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect(drawn(page)).toHaveCount(5);
    await expect(page.getByText('Tudo salvo')).toBeAttached({ timeout: 10_000 });
  });
});

test.describe('conferir, no computador', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('versões, contraste, ver como fica e ajuda', async ({ page }) => {
    await signIn(page, studentEmail('editorvariacoes'), PASSWORD, '/loja-pronta/marca/ajustar');
    await expect(drawn(page)).toHaveCount(2);

    // Ver como fica abre por cima e fecha com Esc.
    await page.getByRole('button', { name: 'Ver como fica' }).click();
    const dialog = page.getByRole('dialog', { name: 'Como seu logo aparece' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Bem pequeno (32px)')).toBeVisible();
    await expectNoA11yViolations(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // A ajuda explica gestos e atalhos.
    await page.getByRole('button', { name: 'Ajuda' }).click();
    const help = page.getByRole('dialog', { name: 'Como usar o editor' });
    await expect(help.getByText('Ctrl + Shift + Z')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(help).toBeHidden();

    // Uma cópia guardada; mexer na do quadro não muda a guardada.
    await tool(page, 'Versões').check({ force: true });
    await page.getByRole('button', { name: 'Guardar uma cópia' }).click();

    // Texto branco no fundo branco: o aviso aparece.
    await tool(page, 'Partes').check({ force: true });
    await page.getByRole('button', { name: 'Nome da loja', exact: true }).click();
    await page.getByRole('radio', { name: 'Branco' }).check({ force: true });
    await expect(page.getByText(/Pouco contraste/)).toBeVisible();

    // Trocar pra guardada traz o nome na cor de antes (sem o aviso).
    await tool(page, 'Versões').check({ force: true });
    await page.getByRole('button', { name: 'Trocar pra versão 1' }).click();
    await tool(page, 'Partes').check({ force: true });
    await page.getByRole('button', { name: 'Nome da loja', exact: true }).click();
    await expect(page.getByText(/Pouco contraste/)).toHaveCount(0);

    // As duas versões ficam salvas.
    await expect(page.getByText('Tudo salvo')).toBeAttached({ timeout: 10_000 });
    await page.reload();
    await tool(page, 'Versões').check({ force: true });
    await expect(page.getByRole('button', { name: 'Trocar pra versão 1' })).toBeVisible();
  });
});

test.describe('ajuda pra acertar, no computador', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('ideias prontas, recomeçar e a conferência antes de seguir', async ({ page }) => {
    await signIn(page, studentEmail('editorideias'), PASSWORD, '/loja-pronta/marca/ajustar');
    await expect(drawn(page)).toHaveCount(2);
    const logo = () => canvas(page).innerHTML();

    // "Me mostra ideias prontas" leva às ideias; uma ideia troca o logo inteiro.
    await page.getByRole('button', { name: 'Me mostra ideias prontas' }).click();
    await expect(tool(page, 'Modelos')).toBeChecked();
    const ideas = page.getByRole('region', { name: 'Ideias prontas pra você' }).getByRole('button');
    await expect(ideas.first()).toBeVisible();
    const first = await ideas.first().getAttribute('aria-label');
    await page.getByRole('button', { name: 'Outras ideias' }).click();
    await expect(ideas.first()).not.toHaveAttribute('aria-label', first!);
    const before = await logo();
    await ideas.nth(2).click();
    await expect.poll(logo).not.toBe(before);
    await expectNoA11yViolations(page);

    // Recomeçar do zero volta ao primeiro modelo; Desfazer traz a ideia.
    const idea = await logo();
    await page.getByRole('button', { name: 'Recomeçar do zero' }).click();
    await expect.poll(logo).not.toBe(idea);
    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect.poll(logo).toBe(idea);

    // O nome enorme e torto sai do círculo da Shopee: a conferência segura e conserta.
    await tool(page, 'Partes').check({ force: true });
    await page.getByRole('button', { name: 'Nome da loja', exact: true }).click();
    await page.getByLabel('Tamanho').last().fill('380');
    await page.getByLabel('Giro (°)').fill('20');
    await page.getByRole('button', { name: 'Pronto' }).click();
    await page.getByRole('button', { name: 'Gostei, continuar' }).click();
    const check = page.getByRole('dialog', { name: 'Antes de seguir, vale arrumar' });
    await expect(check.getByText(/cortado no círculo da Shopee/)).toBeVisible();
    await expect(page).toHaveURL(/\/marca\/ajustar$/);
    await expectNoA11yViolations(page);
    await check.getByRole('button', { name: 'Trazer pra dentro' }).click();
    const ok = page.getByRole('dialog', { name: 'Tudo certo com seu logo!' });
    await expect(ok).toBeVisible();
    await expect(page.getByText('Tudo salvo')).toBeAttached({ timeout: 10_000 });
    await ok.getByRole('button', { name: 'Gostei, continuar' }).click();
    await expect(page).toHaveURL(/\/loja-pronta\/marca\/descricao$/);
  });
});

test.describe('no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('o editor funciona: adicionar abre o painel da parte', async ({ page }) => {
    await signIn(page, studentEmail('editorcelular'), PASSWORD, '/loja-pronta/marca/ajustar');
    await expect(drawn(page)).not.toHaveCount(0);
    await expectNoA11yViolations(page);

    // Tocar num desenho adiciona e já mostra o painel dele.
    await tool(page, 'Desenhos').check({ force: true });
    await page.getByRole('button', { name: 'Adicionar Coração' }).first().tap();
    await expect(page.getByRole('heading', { name: /Desenho: Coração/ })).toBeVisible();
    await page.getByLabel('Tamanho').last().fill('300');
    await expectNoA11yViolations(page);

    // O botão principal fica preso embaixo da tela.
    await expect(page.getByText('Tudo salvo')).toBeAttached({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Gostei, continuar' })).toBeInViewport();
    await page.getByRole('button', { name: 'Gostei, continuar' }).tap();
    await expect(page).toHaveURL(/\/loja-pronta\/marca\/(descricao|revisao)$/);
  });
});
