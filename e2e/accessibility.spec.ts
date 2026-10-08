import { expect, test } from '@playwright/test';
import { expectNoA11yViolations as expectNoViolations } from './support/auth';

// Roda no computador e no celular.

const PAGES = [
  '/entrar',
  '/entrar?motivo=sessao-expirada',
  '/recuperar-senha',
  '/redefinir-senha?error=INVALID_TOKEN',
  '/pagina-que-nao-existe',
];

for (const path of PAGES) {
  test(`${path} sem problemas de acessibilidade`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expectNoViolations(page);
  });
}

for (const theme of ['light', 'dark']) {
  test(`login com erros (campos e servidor) sem problemas de acessibilidade: ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
    await page.goto('/entrar');
    await page.getByRole('button', { name: 'Entrar' }).click();
    // Enviar vazio leva o foco pro primeiro campo com erro.
    await expect(page.getByLabel('Email da compra')).toBeFocused();
    await expectNoViolations(page);

    await page.getByLabel('Email da compra').fill('ninguem-a11y@exemplo.com');
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada-a11y');
    await page.getByRole('button', { name: 'Entrar' }).click();
    const alert = page.locator('[data-error-code]');
    await expect(alert).toBeVisible();
    // O alerta entra com fade: mede o contraste depois da animação, com o texto já opaco.
    await alert.evaluate((el) =>
      Promise.all(el.getAnimations().map((animation) => animation.finished)),
    );
    // O formulário aponta pro alerta (aria-describedby com id que existe).
    await expect(page.locator('form')).toHaveAccessibleDescription(/.+/);
    await expectNoViolations(page);
    // O balão e sua ação também precisam caber com zoom de 400% e nos dois temas.
    await page.setViewportSize({ width: 320, height: 640 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await expectNoViolations(page);
  });
}

test('a sugestão de email é anunciada por uma região que já existia antes dela', async ({
  page,
}) => {
  await page.goto('/entrar');
  // Regiões criadas junto com o texto costumam não ser anunciadas: a dela já está lá, vazia.
  const regions = page.locator('[aria-live="polite"]');
  const before = await regions.count();
  expect(before).toBeGreaterThan(0);

  await page.getByLabel('Email da compra').fill('maria@gmial.com');
  await page.getByLabel('Senha', { exact: true }).focus();
  await expect(page.getByRole('button', { name: /Você quis dizer/ })).toBeVisible();
  await expect(regions.filter({ hasText: 'Você quis dizer maria@gmail.com?' })).toHaveCount(1);
  expect(await regions.count()).toBe(before);
});

test('o foco do teclado é um contorno sólido de 2px nos botões e nos campos', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('link', { name: 'Esqueceu ou não recebeu a senha?' }).focus();
  await page.keyboard.press('Tab');
  const button = page.getByRole('button', { name: 'Entrar' });
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS('outline-style', 'solid');
  await expect(button).toHaveCSS('outline-width', '2px');
  await expect(button).toHaveCSS('outline-color', 'rgb(69, 46, 154)');

  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  const password = page.getByLabel('Senha', { exact: true });
  await expect(password).toBeFocused();
  await expect(password).toHaveCSS('border-color', 'rgb(69, 46, 154)');
  await expect(password).toHaveCSS('box-shadow', /rgb\(69, 46, 154\) 0px 0px 0px 1px/);
});

test('com 320px de largura não há rolagem lateral', async ({ page }) => {
  // 320px = tela de 1280px com zoom de 400% (critério de reflow da WCAG).
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/entrar');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test.describe('alto contraste do Windows', () => {
  test.use({ forcedColors: 'active' });

  test('o botão principal e o cartão continuam desenhados (com borda)', async ({ page }) => {
    await page.goto('/entrar');
    const borderOf = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((element) => getComputedStyle(element).borderTopWidth);
    expect(await borderOf('button[type="submit"]')).not.toBe('0px');
    expect(await borderOf('main section')).not.toBe('0px');
    // O mascote é uma ilustração: mantém as próprias cores (as pupilas não somem).
    const adjust = await page
      .locator('[data-slot="mascot"]')
      .first()
      .evaluate((element) => getComputedStyle(element).forcedColorAdjust);
    expect(adjust).toBe('none');
  });
});
