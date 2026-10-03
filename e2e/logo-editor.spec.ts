import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

const canvas = (page: Page) => page.getByRole('img', { name: /^Seu logo, com/ });
const layers = (page: Page) => page.getByRole('region', { name: 'Camadas' }).getByRole('button');
/** Os elementos desenhados no quadro (aparecem depois que as letras do logo carregam). */
const drawn = (page: Page) => canvas(page).locator(':scope > g[transform]:not([aria-hidden])');
/** O lugar (e o giro) do elemento na posição `index` das camadas de trás pra frente. */
const placement = (page: Page, index: number) =>
  canvas(page).locator(':scope > g[transform]').nth(index).getAttribute('transform');

test.describe('no computador', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('editor livre: escolhe, arrasta, gira, apaga, desfaz e salva', async ({ page }) => {
    await signIn(page, studentEmail('editorlivre'), PASSWORD, '/loja-pronta/marca/ajustar');
    await page.getByRole('link', { name: /Editar livremente/ }).click();
    await expect(page).toHaveURL(/\/loja-pronta\/marca\/editor$/);
    await expect(drawn(page)).toHaveCount(2);
    await page.getByRole('radio', { name: 'Camadas' }).check({ force: true });
    await expect(layers(page)).toHaveCount(2);
    await expectNoA11yViolations(page);

    // Pelas camadas (o caminho do teclado), o nome; o painel mostra ele.
    await page.getByRole('button', { name: 'Nome da loja', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Nome da loja/ })).toBeVisible();

    // Arrastar no quadro muda o lugar.
    const before = await placement(page, 1);
    const box = (await canvas(page).boundingBox())!;
    const unit = box.width / 1000;
    const name = page.getByRole('button', { name: 'Nome da loja', exact: true });
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

    // Delete apaga; Ctrl+Z traz de volta (mesmo com o foco fora do editor).
    await name.focus();
    await page.keyboard.press('Delete');
    await expect(layers(page)).toHaveCount(1);
    await page.keyboard.press('Control+z');
    await expect(layers(page)).toHaveCount(2);

    // Salva sozinho; o logo salvo (o que vira PNG) já é o do editor.
    await expect(page.getByText('Tudo salvo')).toBeVisible({ timeout: 10_000 });
    const saved = await page.request.get('/loja-pronta/marca/logo.svg?v=1');
    expect(await saved.text()).toContain('rotate(15)');

    await page.getByRole('button', { name: 'Salvar e continuar' }).click();
    await expect(page).toHaveURL(/\/loja-pronta\/marca\/descricao$/);

    // De volta ao Modo fácil, o aviso de que salvar ali troca o logo.
    await page.goto('/loja-pronta/marca/ajustar');
    await expect(page.getByText(/montado no editor livre/)).toBeVisible();
  });
});

test.describe('biblioteca, no computador', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('adiciona desenho, forma e texto, busca e recomeça de um modelo', async ({ page }) => {
    await signIn(page, studentEmail('editorbiblioteca'), PASSWORD, '/loja-pronta/marca/editor');
    await expect(drawn(page)).toHaveCount(2);

    // Um desenho dos recomendados (ela vende pra pets), já escolhido e cheio.
    await page.getByRole('button', { name: 'Adicionar Osso' }).first().click();
    await expect(drawn(page)).toHaveCount(3);
    await expect(page.getByRole('heading', { name: /Desenho: Osso/ })).toBeVisible();
    await page.getByLabel('Desenho cheio').check();

    // Uma forma.
    await page.getByRole('button', { name: 'Adicionar Faixa' }).click();
    await expect(drawn(page)).toHaveCount(4);

    // A busca ignora acento.
    await page.getByLabel('Buscar desenhos').fill('maca');
    await expect(page.getByRole('button', { name: 'Adicionar Maçã' })).toBeVisible();

    // Um texto dela, que dá pra corrigir depois.
    await page.getByRole('radio', { name: 'Texto' }).check({ force: true });
    await page.getByLabel('Escreva um texto').fill('desde 2020');
    await page.getByRole('button', { name: 'Adicionar texto' }).click();
    await page.getByLabel('O que está escrito').fill('desde 2021');
    await expect(page.getByRole('heading', { name: /Texto: desde 2021/ })).toBeVisible();
    await expect(drawn(page)).toHaveCount(5);
    await expectNoA11yViolations(page);

    // Recomeçar de um modelo troca tudo; Ctrl+Z traz o de antes.
    await page.getByRole('radio', { name: 'Modelos' }).check({ force: true });
    await page.getByRole('button', { name: 'Recomeçar do modelo 3' }).click();
    await expect(drawn(page)).not.toHaveCount(5);
    await page.keyboard.press('Control+z');
    await expect(drawn(page)).toHaveCount(5);
    await expect(page.getByText('Tudo salvo')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('no celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('o editor livre explica que é pro computador e leva pro Modo fácil', async ({ page }) => {
    await signIn(page, studentEmail('editorlivre'), PASSWORD, '/loja-pronta/marca/editor');
    await expect(page.getByText(/funciona no computador/)).toBeVisible();
    await page.getByRole('link', { name: 'Voltar pro Modo fácil' }).click();
    await expect(page).toHaveURL(/\/loja-pronta\/marca\/ajustar$/);
  });
});
