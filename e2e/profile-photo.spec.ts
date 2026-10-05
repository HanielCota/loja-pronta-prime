import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { PROFILE_PHOTO_MAX_BYTES } from '@/config/profile-photo';
import { profilePhotoId, profilePhotoKey } from '@/features/auth/profile-photo';
import { storage } from '@/server/storage';
import { expectNoA11yViolations, signIn } from './support/auth';
import { database, PASSWORD, studentEmail } from './support/students';

for (const mobile of [false, true]) {
  for (const theme of ['light', 'dark'] as const) {
    const kind = `perfilfoto${mobile ? 'celular' : 'desktop'}${theme}`;
    test(`envia, troca e remove a foto: ${mobile ? 'celular' : 'computador'}, ${theme}`, async ({
      page,
      request,
    }) => {
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      );
      await page.emulateMedia({ colorScheme: theme });
      const email = studentEmail(kind);
      await signIn(page, email, PASSWORD, '/perfil');
      await expect(page).toHaveURL(/\/perfil$/);
      const row = page.getByRole('button', { name: /Foto de perfil/ });
      await row.click();
      await expectNoA11yViolations(page);
      await page.getByLabel('Escolha sua foto').setInputFiles('public/brand/mascote.png');
      await page.getByRole('button', { name: 'Salvar foto', exact: true }).click();
      await expect(row).toContainText('Foto salva');
      await expect(row).toBeFocused();
      const photo = page.locator('main img[src^="/perfil/foto/"]');
      await expect(photo).toBeVisible();
      const firstUrl = (await photo.getAttribute('src'))!;
      await expect(page.getByRole('button', { name: 'Sua conta' }).locator('img')).toHaveAttribute(
        'src',
        firstUrl,
      );
      const response = await page.request.get(firstUrl);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe('image/webp');
      const metadata = await sharp(await response.body()).metadata();
      expect([metadata.width, metadata.height]).toEqual([512, 512]);
      // Sem sessão e com a sessão de outra aluna, a foto permanece privada.
      expect((await request.get(firstUrl)).status()).toBe(404);
      const other = await page
        .context()
        .browser()!
        .newContext({ baseURL: new URL(page.url()).origin });
      const otherPage = await other.newPage();
      await signIn(otherPage, studentEmail('aluna'), PASSWORD, '/perfil');
      await expect(otherPage).toHaveURL(/\/perfil$/);
      expect((await other.request.get(firstUrl)).status()).toBe(404);
      await other.close();

      await page.reload();
      await expect(photo).toHaveAttribute('src', firstUrl);
      await row.click();
      await expectNoA11yViolations(page);
      await page.getByLabel('Escolha sua foto').setInputFiles('public/brand/mascote.png');
      await page.getByRole('button', { name: 'Salvar foto', exact: true }).click();
      await expect(row).toContainText('Foto salva');
      await expect(photo).not.toHaveAttribute('src', firstUrl);
      const secondUrl = (await photo.getAttribute('src'))!;
      const { rows } = await database().query<{ id: string }>(
        'select id from "user" where email = $1',
        [email],
      );
      const userId = rows[0]!.id;
      expect(await storage().get(profilePhotoKey(userId, profilePhotoId(firstUrl)!))).toBeNull();
      expect((await page.request.get(firstUrl)).status()).toBe(404);
      // A foto também acompanha a navegação para outra área.
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Sua conta' }).locator('img')).toHaveAttribute(
        'src',
        secondUrl,
      );
      await page.goto('/perfil');
      await row.click();
      await page.getByRole('button', { name: 'Remover foto', exact: true }).click();
      await expect(row).toContainText('Foto removida');
      await expect(photo).toHaveCount(0);
      expect(await storage().get(profilePhotoKey(userId, profilePhotoId(secondUrl)!))).toBeNull();
      await page.reload();
      await expect(row).toContainText('Suas iniciais');
      await expectNoA11yViolations(page);
    });
  }
}

test('recusa arquivos falsos, grandes ou pequenos, sem substituir a foto', async ({ page }) => {
  await signIn(page, studentEmail('perfilfotoinvalida'), PASSWORD, '/perfil');
  await expect(page).toHaveURL(/\/perfil$/);
  const row = page.getByRole('button', { name: /Foto de perfil/ });
  await row.click();
  const file = page.getByLabel('Escolha sua foto');
  await file.setInputFiles('public/brand/mascote.png');
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click();
  await expect(row).toContainText('Foto salva');
  const photo = page.locator('main img[src^="/perfil/foto/"]');
  const savedUrl = (await photo.getAttribute('src'))!;
  await row.click();
  await file.setInputFiles({
    name: 'falsa.png',
    mimeType: 'image/png',
    buffer: Buffer.from('não é uma imagem'),
  });
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click();
  await expect(page.locator('#perfil-foto-erro')).toContainText('Não deu pra abrir essa foto');
  await expect(file).toHaveAttribute('aria-invalid', 'true');
  await file.setInputFiles({
    name: 'grande.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(PROFILE_PHOTO_MAX_BYTES + 1),
  });
  // Acima de 5 MB, o navegador tenta reduzir antes de enviar; o que não é imagem para ali.
  await expect(page.locator('#perfil-foto-erro')).toContainText('Não deu pra abrir essa foto');
  await expect(photo).toHaveAttribute('src', savedUrl);
});

test('foto do celular acima de 6 MB é reduzida no navegador e salva', async ({ page }) => {
  // Ruído não comprime: um PNG de verdade com uns 11 MB, acima do limite das Server Actions.
  const width = 2400;
  const height = 1600;
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (Math.random() * 256) | 0;
  const buffer = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .png({ compressionLevel: 0 })
    .toBuffer();
  expect(buffer.length).toBeGreaterThan(6 * 1024 * 1024);
  await signIn(page, studentEmail('perfilfotogrande'), PASSWORD, '/perfil');
  await expect(page).toHaveURL(/\/perfil$/);
  const row = page.getByRole('button', { name: /Foto de perfil/ });
  await row.click();
  await page
    .getByLabel('Escolha sua foto')
    .setInputFiles({ name: 'celular.png', mimeType: 'image/png', buffer });
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click();
  await expect(row).toContainText('Foto salva', { timeout: 30_000 });
  await expect(page.locator('main img[src^="/perfil/foto/"]')).toBeVisible();
});

test('envia e remove a foto sem JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await signIn(page, studentEmail('perfilfotosemjs'), PASSWORD, '/perfil');
  await expect(page).toHaveURL(/\/perfil$/);
  await page.getByLabel('Escolha sua foto').setInputFiles('public/brand/mascote.png');
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click();
  await expect(page.locator('main img[src^="/perfil/foto/"]')).toBeVisible();
  await page.getByRole('button', { name: 'Remover foto', exact: true }).click();
  await expect(page.locator('main img[src^="/perfil/foto/"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Foto de perfil/ })).toContainText('Suas iniciais');
  await context.close();
});
