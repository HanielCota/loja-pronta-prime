import { expect, test } from '@playwright/test';

// Roda no perfil "mobile" (Pixel 7): a maioria das alunas acessa pelo celular.
const PAGES = ['/entrar', '/recuperar-senha', '/redefinir-senha?error=INVALID_TOKEN'];

for (const path of PAGES) {
  test(`${path} cabe na tela e tem alvos de toque de 44px`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeAttached();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);

    const small = await page
      .locator('main')
      .locator('a, button, input:not([type="hidden"])')
      .evaluateAll((elements) =>
        elements
          .map((el) => ({
            el: el.outerHTML.slice(0, 60),
            height: el.getBoundingClientRect().height,
          }))
          .filter((item) => item.height < 44),
      );
    expect(small).toEqual([]);
  });
}

test('visual sem padrões do navegador nos campos', async ({ page }) => {
  await page.goto('/entrar');
  const email = page.getByLabel('Email da compra');
  const style = await email.evaluate((input) => {
    const css = getComputedStyle(input);
    return {
      appearance: css.appearance,
      caret: css.caretColor,
      font: css.fontFamily,
      size: css.fontSize,
    };
  });
  expect(style.appearance).toBe('none');
  expect(style.caret).toBe('rgb(69, 46, 154)');
  expect(style.font).toContain('Manrope');
  // 16px ou mais: abaixo disso o iPhone dá zoom ao focar o campo.
  expect(parseFloat(style.size)).toBeGreaterThanOrEqual(16);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f5f5f7');
});

test('celular deitado: email e senha aparecem sem rolar', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('/entrar');
  for (const field of [
    page.getByLabel('Email da compra'),
    page.getByLabel('Senha', { exact: true }),
  ]) {
    const box = await field.boundingBox();
    expect(box && box.y + box.height).toBeLessThanOrEqual(375);
  }
});

test('email longo desce inteiro pra linha de baixo, sem quebrar no meio à toa', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/entrar');
  await page.getByLabel('Email da compra').fill('maria.silva@gmial.com');
  await page.getByLabel('Senha', { exact: true }).focus();
  const email = page.getByRole('button', { name: /Você quis dizer/ }).locator('strong');
  // Uma linha só: o email inteiro cabe na linha de baixo.
  const lines = await email.evaluate((el) => el.getClientRects().length);
  expect(lines).toBe(1);
});
