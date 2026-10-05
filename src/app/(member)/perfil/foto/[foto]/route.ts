import { profilePhotoId, profilePhotoKey } from '@/features/auth/profile-photo';
import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';
import { storage } from '@/server/storage';

/** Sem cache também no "não encontrado": a foto pode aparecer logo depois de salva. */
function notFound() {
  return new Response('Não encontrado', { status: 404, headers: { 'Cache-Control': 'no-store' } });
}

/** Foto privada: a sessão só alcança a foto atual da própria conta. */
export async function GET(_request: Request, { params }: { params: Promise<{ foto: string }> }) {
  const session = await getActiveSession();
  const { foto } = await params;
  if (!session || needsFirstPassword(session.user) || profilePhotoId(session.user.image) !== foto) {
    return notFound();
  }
  const bytes = await storage().get(profilePhotoKey(session.user.id, foto));
  if (!bytes) return notFound();
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
