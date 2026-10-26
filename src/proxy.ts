import { NextResponse, type NextRequest } from 'next/server';

const LEGACY_HOSTS = new Set(['lojaprontaprime.com', 'www.lojaprontaprime.com']);
const OAUTH_CALLBACKS = new Set(['/api/shopee/callback', '/api/bling/callback']);

export function proxy(request: NextRequest) {
  const host = (request.headers.get('host') ?? request.nextUrl.host)
    .toLowerCase()
    .replace(/:\d+$/, '');
  if (!LEGACY_HOSTS.has(host)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const authentication = pathname === '/api/auth' || pathname.startsWith('/api/auth/');
  const callback = OAUTH_CALLBACKS.has(pathname);
  const api = pathname === '/api' || pathname.startsWith('/api/');
  // Hotmart and other machine clients continue using their existing endpoints directly.
  if (api && !authentication && !callback) return NextResponse.next();

  const destination = new URL('https://membros.escalashop.com.br');
  destination.pathname = pathname;
  destination.search = search;
  const response = NextResponse.redirect(destination, authentication || callback ? 307 : 308);
  // Attach these to the actual response: next.config redirects can omit configured headers.
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export const config = { matcher: '/:path*' };
