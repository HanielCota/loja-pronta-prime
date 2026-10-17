import { createHash } from 'node:crypto';
import { z } from 'zod';
import { publicationPayloadSchema, type PublicationPayload } from './model';

export const publicationSelectionSchema = z.tuple([
  z.string().min(1).max(100),
  z.string().min(1).max(100),
  z.string().regex(/^[a-f0-9]{64}$/),
]);
export type PublicationSelection = z.infer<typeof publicationSelectionSchema>;

/** A confirmação vale para a oferta exibida e para a mesma dona, loja e aplicativo. */
export function publicationOfferFingerprint(
  payload: PublicationPayload,
  owner: { userId: string; shopId: number; applicationId: string },
) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        owner.userId,
        owner.shopId,
        owner.applicationId,
        publicationPayloadSchema.parse(payload),
      ]),
    )
    .digest('hex');
}
