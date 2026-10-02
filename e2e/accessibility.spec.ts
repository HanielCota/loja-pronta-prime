import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Roda no computador e no celular. Regras: WCAG 2.2 A/AA e boas práticas do axe.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
}

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

test('login com erros (campos e servidor) sem problemas de acessibilidade', async ({ page }) => {
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
});

test('a sugestão de email fica numa região anunciada pelo leitor de tela', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('Email da compra').fill('maria@gmial.com');
  await page.getByLabel('Senha', { exact: true }).focus();
  const suggestion = page.getByRole('button', { name: /Você quis dizer/ });
  await expect(suggestion).toBeVisible();
  await expect(page.locator('[aria-live="polite"]').filter({ has: suggestion })).toHaveCount(1);
});

test('o foco do teclado é um contorno sólido de 2px nos botões e nos campos', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('link', { name: 'Esqueci ou não recebi a senha' }).focus();
  await page.keyboard.press('Tab');
  const button = page.getByRole('button', { name: 'Entrar' });
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS('outline-style', 'solid');
  await expect(button).toHaveCSS('outline-width', '2px');
  await expect(button).toHaveCSS('outline-color', 'rgb(0, 113, 227)');

  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  const password = page.getByLabel('Senha', { exact: true });
  await expect(password).toBeFocused();
  await expect(password).toHaveCSS('border-color', 'rgb(0, 113, 227)');
  await expect(password).toHaveCSS('box-shadow', /rgb\(0, 113, 227\) 0px 0px 0px 1px/);
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
