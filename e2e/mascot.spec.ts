import { expect, test, type Locator, type Page } from '@playwright/test';
import { PASSWORD, studentEmail } from './support/students';

const mascot = (page: Page) => page.locator('[data-slot="mascot"]');

/** Lê uma variável CSS numérica do rosto (--gx, --gy, --lid0, --lid1...). */
function faceVar(page: Page, name: string) {
  return page
    .locator('[data-slot="mascot-face"]')
    .evaluate((face: HTMLElement, variable) => Number(face.style.getPropertyValue(variable)), name);
}

const gazeX = (page: Page) => faceVar(page, '--gx');
const gazeY = (page: Page) => faceVar(page, '--gy');
/** Pálpebras: 0 abertas, 1 fechadas (olho esquerdo e direito). */
const leftLid = (page: Page) => faceVar(page, '--lid0');
const rightLid = (page: Page) => faceVar(page, '--lid1');

function blush(page: Page) {
  return page.locator('[data-blush]').evaluate((g) => Number(g.getAttribute('opacity')));
}

/** Boca triste: a curva sobe no meio em vez de descer (controle acima da ponta). */
function isSad(page: Page) {
  return page.locator('[data-mouth]').evaluate((path) => {
    // d = "M x0 y0 Q cx cy ..." → compara y0 (índice 1) com cy (índice 3).
    const numbers = (path.getAttribute('d') ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    return (numbers[3] ?? 0) < (numbers[1] ?? 0);
  });
}

/** Espera uma animação começar no elemento (elas são curtas: confere a cada quadro). */
function animationStarts(locator: Locator, timeoutMs: number) {
  return locator.evaluate(
    (element, timeout) =>
      new Promise<boolean>((resolve) => {
        const deadline = performance.now() + timeout;
        const check = () => {
          if (element.getAnimations().length > 0) return resolve(true);
          if (performance.now() > deadline) return resolve(false);
          requestAnimationFrame(check);
        };
        check();
      }),
    timeoutMs,
  );
}

async function failLogin(page: Page, email: string) {
  await page.getByLabel('Email da compra').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('senha-errada-mascote');
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/entrar');
});

test('olha o email sendo digitado, fica feliz e acena quando o email fica completo', async ({
  page,
}) => {
  const email = page.getByLabel('Email da compra');
  await email.pressSequentially('maria@gmail.c');
  await expect.poll(() => gazeY(page)).toBeGreaterThan(0.5);
  await expect.poll(() => blush(page)).toBeGreaterThan(0.9);

  const nod = animationStarts(mascot(page), 1_500);
  await email.pressSequentially('om');
  expect(await nod).toBe(true);
});

test('fecha os olhos na senha e espia com um olho só ao mostrar', async ({ page }) => {
  const password = page.getByLabel('Senha', { exact: true });
  await password.fill('segredo123');
  await expect.poll(() => leftLid(page)).toBeGreaterThan(0.95);
  await expect.poll(() => rightLid(page)).toBeGreaterThan(0.95);

  await page.getByRole('button', { name: 'Mostrar senha' }).click();
  await password.focus();
  await expect.poll(() => rightLid(page)).toBeLessThan(0.05);
  await expect.poll(() => leftLid(page)).toBeGreaterThan(0.95);
  await expect.poll(() => gazeY(page)).toBeGreaterThan(0.5);
});

test('fecha a cara com senha errada, perdoa ao digitar e fecha de novo no erro seguinte', async ({
  page,
}) => {
  await failLogin(page, studentEmail('mascote-erro'));
  await expect(page.locator('[data-error-code="invalid_credentials"]')).toBeVisible();
  await expect(mascot(page)).toHaveAttribute('data-expression', 'grumpy');
  await expect.poll(() => isSad(page)).toBe(true);

  // Saindo do campo de senha (olhos fechados), dá pra ver os olhos semicerrados.
  await page.getByLabel('Email da compra').focus();
  await expect.poll(() => leftLid(page)).toBeGreaterThan(0.35);

  await page.getByLabel('Email da compra').press('End');
  await page.getByLabel('Email da compra').pressSequentially('x');
  await expect(mascot(page)).toHaveAttribute('data-expression', 'happy');

  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(mascot(page)).toHaveAttribute('data-expression', 'grumpy');
});

test('fica preocupado (sem cara feia) quando a conta está desativada', async ({ page }) => {
  await page.getByLabel('Email da compra').fill(studentEmail('desativada'));
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.locator('[data-error-code="account_disabled"]')).toBeVisible();
  await expect(mascot(page)).toHaveAttribute('data-expression', 'worried');
});

test('comemora quando o login dá certo', async ({ page }) => {
  await page.getByLabel('Email da compra').fill(studentEmail('comemora'));
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(mascot(page)).toHaveAttribute('data-expression', 'celebrate');
});

test('arregala os olhos com Caps Lock ligado', async ({ page }) => {
  const password = page.getByLabel('Senha', { exact: true });
  await password.focus();
  await password.dispatchEvent('keydown', { key: 'A', modifierCapsLock: true });
  await expect(mascot(page)).toHaveAttribute('data-expression', 'surprised');
  await password.dispatchEvent('keydown', { key: 'a', modifierCapsLock: false });
  await expect(mascot(page)).not.toHaveAttribute('data-expression', 'surprised');
});

test('desconfia de email digitado errado até a correção', async ({ page }) => {
  const email = page.getByLabel('Email da compra');
  await email.fill('maria@gmial.com');
  await email.blur();
  await expect(mascot(page)).toHaveAttribute('data-expression', 'skeptical');
  await page.getByRole('button', { name: /Você quis dizer/ }).click();
  await expect(mascot(page)).not.toHaveAttribute('data-expression', 'skeptical');
});

test('ri quando é tocado', async ({ page }) => {
  await mascot(page).click();
  await expect(mascot(page)).toHaveAttribute('data-expression', 'happy');
});

test('dorme aos 10 segundos sem interação e acorda abrindo os olhos devagar', async ({ page }) => {
  await page.clock.install();
  await page.goto('/entrar');
  await page.clock.fastForward('00:08');
  await expect(mascot(page)).toHaveAttribute('data-expression', 'sleepy');
  await page.clock.fastForward('00:03');
  await expect(mascot(page)).toHaveAttribute('data-expression', 'asleep');
  await page.clock.runFor(3_000);
  await expect.poll(() => leftLid(page)).toBeGreaterThan(0.95);

  // Acordando: primeiro sonolento, com os olhos ainda quase fechados, depois abertos.
  await page.mouse.move(40, 40);
  await expect(mascot(page)).toHaveAttribute('data-expression', 'sleepy');
  await page.clock.runFor(150);
  expect(await leftLid(page)).toBeGreaterThan(0.75);
  await page.clock.runFor(4_000);
  await expect(mascot(page)).toHaveAttribute('data-expression', 'neutral');
  await expect.poll(() => leftLid(page)).toBeLessThan(0.05);
});

test('pisca de tempos em tempos', async ({ page }) => {
  expect(await animationStarts(page.locator('[data-lid]').first(), 8_000)).toBe(true);
});

test('com movimento reduzido, muda o olhar sem animar', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/entrar');
  await page.getByLabel('Email da compra').focus();
  await page.getByLabel('Senha', { exact: true }).focus();
  // Sem mola: já está no destino no próximo instante, sem passar pelos valores intermediários.
  await expect.poll(() => gazeX(page), { intervals: [50] }).toBe(-0.95);
});

test('página que não existe mostra o mascote preocupado e o caminho de volta', async ({ page }) => {
  const response = await page.goto('/pagina-que-nao-existe');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Essa página não existe' })).toBeVisible();
  await expect(mascot(page)).toHaveAttribute('data-expression', 'worried');
  await page.getByRole('link', { name: 'Ir pro login' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
});

test('não quebra com o preenchimento automático do navegador', async ({ page }) => {
  // Chrome e gerenciadores de senha disparam "keydown"/"keyup" que não são eventos de teclado.
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const field of [
    page.getByLabel('Email da compra'),
    page.getByLabel('Senha', { exact: true }),
  ]) {
    await field.evaluate((input) => {
      input.dispatchEvent(new Event('keydown', { bubbles: true }));
      input.dispatchEvent(new Event('keyup', { bubbles: true }));
    });
  }
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});

test('a arte do mascote usa endereço com hash (mudou a arte, muda o endereço)', async ({
  page,
}) => {
  // Com nome fixo, caches antigos mostravam a arte velha por baixo (ex.: sobrancelha duplicada).
  const base = await mascot(page)
    .locator('img')
    .evaluate((img: HTMLImageElement) => decodeURIComponent(img.currentSrc));
  expect(base).toMatch(/\/_next\/static\/media\/mascote-base\.[\w-]+\.png/);

  const lidSkin = await page
    .locator('[data-lid]')
    .first()
    .evaluate((lid: HTMLElement) => decodeURIComponent(lid.style.backgroundImage));
  expect(lidSkin).toMatch(/\/_next\/static\/media\/mascote-olhos-fechados\.[\w-]+\.png/);
});

test('dormindo com a senha visível, fecha os dois olhos (não fica espiando)', async ({ page }) => {
  await page.clock.install();
  await page.goto('/entrar');
  const password = page.getByLabel('Senha', { exact: true });
  await password.fill('segredo123');
  await page.getByRole('button', { name: 'Mostrar senha' }).click();
  await password.focus();
  await expect.poll(() => rightLid(page)).toBeLessThan(0.05);

  await page.clock.fastForward('00:11');
  await expect(mascot(page)).toHaveAttribute('data-expression', 'asleep');
  await page.clock.runFor(3_000);
  await expect.poll(() => rightLid(page)).toBeGreaterThan(0.95);
  await expect.poll(() => leftLid(page)).toBeGreaterThan(0.95);
});

test('arrastar pra fora do mascote cancela o toque sem rir', async ({ page }) => {
  const box = await mascot(page).boundingBox();
  if (!box) throw new Error('mascote sem caixa');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 80, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await expect(mascot(page)).not.toHaveAttribute('data-expression', 'happy');
});

test('abre preocupado quando o login avisa que a sessão expirou', async ({ page }) => {
  await page.goto('/entrar?motivo=sessao-expirada');
  await expect(page.locator('[data-error-code="session_expired"]')).toBeVisible();
  await expect(mascot(page)).toHaveAttribute('data-expression', 'worried');
});
