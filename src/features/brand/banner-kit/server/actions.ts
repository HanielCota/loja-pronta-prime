'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireProductAction } from '@/features/products/server/access';
import { BANNER_KIT_PATH, bannerDraftSchema } from '../model';
import { approveBannerKit, saveBannerKit } from './kit';

export async function saveBanners(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  const draft = bannerDraftSchema.safeParse(Object.fromEntries(form));
  if (!draft.success) redirect(`${BANNER_KIT_PATH}?resultado=invalid`);
  const revision = String(form.get('revision') ?? '') || null;
  const saved = await saveBannerKit(userId, revision, draft.data);
  revalidatePath(BANNER_KIT_PATH);
  redirect(`${BANNER_KIT_PATH}?resultado=${saved ? 'saved' : 'changed'}`);
}

export async function approveBanners(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('loja-pronta');
  if (form.get('confirmed') !== 'true') redirect(`${BANNER_KIT_PATH}?resultado=invalid`);
  const approved = await approveBannerKit(userId, String(form.get('revision') ?? ''));
  revalidatePath(BANNER_KIT_PATH);
  redirect(`${BANNER_KIT_PATH}?resultado=${approved ? 'approved' : 'changed'}`);
}
