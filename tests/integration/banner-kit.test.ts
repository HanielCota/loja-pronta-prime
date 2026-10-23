import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '@/server/db';
import { user, storeBrand } from '@/server/db/schema';
import {
  saveBannerKit,
  approveBannerKit,
  readBannerKit,
} from '@/features/brand/banner-kit/server/kit';
import { renderBanner } from '@/features/brand/banner-kit/server/render';
import { brandFingerprint } from '@/features/brand/server/fingerprint';
import { kitIsApproved } from '@/features/brand/banner-kit/model';

const ids: string[] = [];
afterAll(async () => {
  for (const id of ids) await db.delete(user).where(eq(user.id, id));
  await db.$client.end();
});
async function account() {
  const id = randomUUID();
  ids.push(id);
  await db.insert(user).values({ id, name: 'Banner owner', email: `${id}@example.invalid` });
  await db
    .insert(storeBrand)
    .values({
      userId: id,
      name: 'Minha loja',
      description: 'Descrição',
      logoImage: `logos/${id}/one.png`,
      completedAt: new Date(),
    });
  return id;
}
const draft = {
  title: 'Bem-vinda à nossa loja',
  subtitle: 'Conheça nossa seleção',
  palette: 'violet' as const,
};

test('approval is owner-specific and invalidated by edits, brand changes and concurrent drafts', async () => {
  const id = await account();
  const other = await account();
  expect(await saveBannerKit(id, null, draft)).toBe(true);
  const kit = (await readBannerKit(id))!;
  expect(await approveBannerKit(other, kit.revision)).toBe(false);
  expect(await approveBannerKit(id, kit.revision)).toBe(true);
  const [brand] = await db.select().from(storeBrand).where(eq(storeBrand.userId, id));
  expect(kitIsApproved((await readBannerKit(id))!, brandFingerprint(brand!))).toBe(true);
  expect(await saveBannerKit(id, kit.revision, { ...draft, title: 'Nova frase' })).toBe(true);
  expect(await saveBannerKit(id, kit.revision, draft)).toBe(false);
  expect(await approveBannerKit(id, kit.revision)).toBe(false);
  const updated = (await readBannerKit(id))!;
  expect(updated.approvedAt).toBeNull();
  expect(await approveBannerKit(id, updated.revision)).toBe(true);
  await db.update(storeBrand).set({ name: 'Outra marca' }).where(eq(storeBrand.userId, id));
  const [changed] = await db.select().from(storeBrand).where(eq(storeBrand.userId, id));
  expect(kitIsApproved((await readBannerKit(id))!, brandFingerprint(changed!))).toBe(false);
  expect(await approveBannerKit(id, updated.revision)).toBe(false);
});

test('exported banners are real PNGs with the expected dimensions for every palette', async () => {
  const logo = await sharp({
    create: { width: 64, height: 64, channels: 4, background: '#452e9a' },
  })
    .png()
    .toBuffer();
  for (const palette of ['violet', 'rose', 'ocean', 'forest'] as const) {
    for (const variant of ['welcome', 'selection'] as const) {
      const png = await renderBanner(
        { ...draft, palette, title: 'A'.repeat(48), subtitle: 'B'.repeat(80) },
        'Uma loja com nome comprido',
        logo,
        variant,
      );
      const metadata = await sharp(png).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(750);
      expect(metadata.height).toBe(variant === 'welcome' ? 300 : 500);
      expect(png.length).toBeLessThan(2_000_000);
    }
  }
});
