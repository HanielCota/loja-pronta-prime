'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireProductAction } from '@/features/products/server/access';
import { requireStaff } from '@/features/staff/server/staff-guard';
import { requireAdmin } from '@/features/admin/server/access';
import { hasAdminRole } from '@/features/admin/access';
import { runAsStudent } from '@/features/staff/server/impersonation';
import {
  INITIAL_DELIVERY_SIZE,
  parseMemberAccess,
  shopeeDeliveryShopId,
} from '../assisted-delivery';
import { ASSISTED_DELIVERY_PATH, DELIVERY_QUEUE_PATH } from '../delivery-paths';
import {
  cancelAssistedDelivery,
  claimAssistedDelivery,
  confirmAssistedItems,
  releaseAssistedDelivery,
  requestAssistedDelivery,
} from './assisted-delivery';

export async function submitAssistedDelivery(form: FormData) {
  return runAsStudent('submitAssistedDelivery', async () => {
    const { userId } = await requireProductAction('loja-pronta');
    const shopId = shopeeDeliveryShopId(String(form.get('shopUrl') ?? '').trim());
    const approval = String(form.get('approval') ?? '');
    if (!shopId || !/^[a-f0-9]{64}$/.test(approval))
      redirect(`${ASSISTED_DELIVERY_PATH}?resultado=invalid`);
    // A revisão de produtos restantes não pede o acesso de novo; o primeiro pedido pede.
    const needsAccess = form.has('memberLogin');
    const access = parseMemberAccess(form.get('memberLogin'), form.get('memberPassword'));
    if (needsAccess && !access) redirect(`${ASSISTED_DELIVERY_PATH}?resultado=access`);
    const saved = await requestAssistedDelivery(
      userId,
      shopId,
      approval,
      access ?? undefined,
    ).catch(() => false);
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
    String(form.get('reconciliation') ?? ''),
    items,
    form.get('brand') === 'confirmed',
    hasAdminRole(user.role),
  );
  revalidatePath(DELIVERY_QUEUE_PATH);
  revalidatePath('/loja-pronta');
  redirect(`${DELIVERY_QUEUE_PATH}/${id.data}?resultado=${saved ? 'saved' : 'invalid'}`);
}

export async function recoverAssistedDelivery(form: FormData) {
  await requireAdmin(DELIVERY_QUEUE_PATH);
  const id = z.uuid().safeParse(form.get('id'));
  const expected = String(form.get('reconciliation') ?? '');
  const mode = form.get('mode');
  if (!id.success || (mode !== 'release' && mode !== 'review')) redirect(DELIVERY_QUEUE_PATH);
  const saved =
    form.get('reconciled') === 'yes' &&
    (await releaseAssistedDelivery(id.data, expected, mode === 'review'));
  revalidatePath(DELIVERY_QUEUE_PATH);
  revalidatePath(ASSISTED_DELIVERY_PATH);
  redirect(
    `${DELIVERY_QUEUE_PATH}/${id.data}?resultado=${saved ? 'recovered' : 'recovery-unavailable'}`,
  );
}
