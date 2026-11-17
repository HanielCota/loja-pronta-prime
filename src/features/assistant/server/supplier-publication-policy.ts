import { z } from 'zod';

const pilotSchema = z.strictObject({
  userId: z.string().trim().min(1).max(200),
  shopId: z.number().int().positive().safe(),
});

type SupplierPublicationPilot = z.infer<typeof pilotSchema>;

/** Undefined preserves the usual flow. Invalid configuration blocks the pilot. */
export function supplierPublicationPilot(): SupplierPublicationPilot | null | undefined {
  const raw = process.env.SHOPEE_SUPPLIER_PUBLICATION_PILOT;
  if (raw === undefined) {
    return undefined;
  }

  try {
    const parsed = pilotSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function matchesPilot(pilot: SupplierPublicationPilot | null, userId: string, shopId?: number) {
  return pilot?.userId === userId && (shopId === undefined || pilot.shopId === shopId);
}

export function canPrepareSupplierFeed(userId: string, shopId?: number) {
  const pilot = supplierPublicationPilot();
  return pilot === undefined || matchesPilot(pilot, userId, shopId);
}

export function canPublishSupplierOffers(userId: string, shopId?: number) {
  const pilot = supplierPublicationPilot();
  return pilot === undefined
    ? process.env.SHOPEE_PUBLICATION_ENABLED === 'true'
    : matchesPilot(pilot, userId, shopId);
}
