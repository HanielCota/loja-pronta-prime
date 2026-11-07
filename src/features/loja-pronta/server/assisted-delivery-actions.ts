'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireProductAction } from '@/features/products/server/access';
import { requireStaff } from '@/features/support/server/staff-guard';
import { runAsStudent } from '@/features/support/server/impersonation';
import { INITIAL_DELIVERY_SIZE, shopeeDeliveryShopId } from '../assisted-delivery';
import { ASSISTED_DELIVERY_PATH, DELIVERY_QUEUE_PATH } from '../delivery-paths';
import {
  cancelAssistedDelivery,
  claimAssistedDelivery,
  confirmAssistedItems,
  requestAssistedDelivery,
} from './assisted-delivery';

export async function submitAssistedDelivery(form: FormData) {
  return runAsStudent('submitAssistedDelivery', async () => {
    const { userId } = await requireProductAction('loja-pronta');
    const shopId = shopeeDeliveryShopId(String(form.get('shopUrl') ?? '').trim());
    const approval = String(form.get('approval') ?? '');
    if (!shopId || !/^[a-f0-9]{64}$/.test(approval))
      redirect(`${ASSISTED_DELIVERY_PATH}?resultado=invalid`);
    const saved = await requestAssistedDelivery(userId, shopId, approval).catch(() => false);
    revalidatePath(DELIVERY_QUEUE_PATH);
    redirect(`${ASSISTED_DELIVERY_PATH}?resultado=${saved ? 'sent' : 'unavailable'}`);
  });
}

export async function startAssistedDelivery(form: FormData) {
  const { user, session } = await requireStaff(DELIVERY_QUEUE_PATH, 'stores.deliver');
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success || session.impersonatedBy) redirect(DELIVERY_QUEUE_PATH);
  const saved =
    form.get('access') === 'confirmed' &&
    (await claimAssistedDelivery(id.data, user.id).catch(() => false));
  revalidatePath(DELIVERY_QUEUE_PATH);
  redirect(`${DELIVERY_QUEUE_PATH}/${id.data}?resultado=${saved ? 'started' : 'unavailable'}`);
}

export async function cancelOwnAssistedDelivery() {
  return runAsStudent('cancelOwnAssistedDelivery', async () => {
    const { userId } = await requireProductAction('loja-pronta');
    const canceled = await cancelAssistedDelivery(userId);
    revalidatePath(DELIVERY_QUEUE_PATH);
    redirect(canceled ? '/loja-pronta' : ASSISTED_DELIVERY_PATH);
  });
}

export async function saveAssistedDeliveryItems(form: FormData) {
  const { user, session } = await requireStaff(DELIVERY_QUEUE_PATH, 'stores.deliver');
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success || session.impersonatedBy) redirect(DELIVERY_QUEUE_PATH);
  const items = Array.from(
    { length: INITIAL_DELIVERY_SIZE },
    (_, index) => String(form.get(`item-${index}`) ?? '').trim() || null,
  );
  if (items.some((item) => item !== null && !/^[1-9]\d{0,15}$/.test(item)))
    redirect(`${DELIVERY_QUEUE_PATH}/${id.data}?resultado=invalid`);
  const saved = await confirmAssistedItems(
    id.data,
    user.id,
    items,
    form.get('brand') === 'confirmed',
  );
  revalidatePath(DELIVERY_QUEUE_PATH);
  revalidatePath('/loja-pronta');
  redirect(`${DELIVERY_QUEUE_PATH}/${id.data}?resultado=${saved ? 'saved' : 'invalid'}`);
}
