import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';
import { getStudentProducts } from '@/features/products/server/access';
import { parseProgressLocation } from '@/features/sll/progress-rules';
import { visitForRoute } from '@/features/support/server/impersonation';
import { recordSllLessonView } from '@/features/sll/server/progress-actions';
import { hasTrustedOrigin } from '@/server/request/origin';
import { readLimitedBody, RequestBodyTooLargeError } from '@/lib/request-body';

const headers = { 'Cache-Control': 'private, no-store' };
const failure = (message: string, status: number) =>
  Response.json({ saved: false, message }, { status, headers });

/** Registrar a abertura não envia uma resposta de Server Action que altera o estado do roteador. */
export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return failure('Pedido inválido.', 403);
  const session = await getActiveSession();
  if (!session || needsFirstPassword(session.user))
    return failure('Entre na sua conta de novo.', 401);
  // A equipe dentro da conta da aluna não muda o "continue de onde parou" dela.
  if ((await visitForRoute('recordSllLessonView')).status !== 'student')
    return new Response(null, { status: 204, headers });
  if (!(await getStudentProducts(session.user.id)).products.includes('sll'))
    return failure('Este curso não está disponível para esta conta.', 403);
  let location;
  try {
    const data = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(await readLimitedBody(request, 2048)),
    );
    location = parseProgressLocation(data?.trackId, data?.lessonId);
  } catch (error) {
    return failure(
      'Não foi possível identificar esta aula.',
      error instanceof RequestBodyTooLargeError ? 413 : 400,
    );
  }
  if (!location) return failure('Não foi possível identificar esta aula.', 400);
  try {
    const result = await recordSllLessonView(location.trackId, location.lessonId);
    return Response.json(result, { status: result.saved ? 200 : 409, headers });
  } catch {
    return failure('Não foi possível registrar a abertura da aula. Tente de novo.', 503);
  }
}
