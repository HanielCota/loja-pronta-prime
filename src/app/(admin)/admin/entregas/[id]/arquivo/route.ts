import { z } from 'zod';
import { readStaffSession } from '@/features/staff/server/staff-guard';
import {
  deliveryWorkbook,
  eligibleDelivery,
} from '@/features/loja-pronta/server/assisted-delivery';
import { storage } from '@/server/storage';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await readStaffSession('stores.deliver');
  const { id } = await params;
  if (!staff || staff.session.impersonatedBy || !z.uuid().safeParse(id).success)
    return new Response('Não encontrado.', { status: 404 });
  const delivery = await eligibleDelivery(id);
  if (!delivery || delivery.operatorId !== staff.user.id || delivery.completedAt)
    return new Response('Não encontrado.', { status: 404 });
  const logo = new URL(request.url).searchParams.get('tipo') === 'logo';
  const bytes = await (
    logo ? storage().get(delivery.brand.logoImage) : deliveryWorkbook(delivery)
  ).catch(() => null);
  if (!bytes)
    return new Response('Arquivo indisponível. Volte para a entrega e confira os dados.', {
      status: 409,
    });
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Type': logo
        ? 'image/png'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${logo ? 'logo' : 'produtos-shopee'}-${delivery.shopId}.${logo ? 'png' : 'xlsx'}"`,
    },
  });
}
