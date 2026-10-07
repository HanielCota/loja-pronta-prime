import { env } from '@/config/env';
import { isApplicationOrigin } from '@/lib/request-origin';

/** O proxy muda a URL interna do Next; a origem permitida continua sendo a URL pública do app. */
export function hasTrustedOrigin(request: Pick<Request, 'headers'>): boolean {
  return isApplicationOrigin(request.headers.get('origin'), env.BETTER_AUTH_URL);
}
