import { headers } from 'next/headers';
import { env } from '@/config/env';

/**
 * IP de quem fez a requisição, como visto pelo proxy mais externo em que confiamos.
 *
 * Cada proxy acrescenta ao fim do X-Forwarded-For o endereço de quem falou com ele. Com N proxies
 * confiáveis (TRUSTED_PROXY_HOPS), o IP do cliente é a N-ésima entrada a partir do fim; as
 * anteriores vêm do próprio cliente e podem ser inventadas a cada tentativa.
 *
 * Sem proxy (0), não há em quem confiar: o Next só preenche o cabeçalho quando ele não vem na
 * requisição, então um valor enviado pelo cliente passaria direto. Nesse caso o IP fica
 * desconhecido e só valem os limites por conta.
 */
export async function getClientIp(): Promise<string | undefined> {
  const hops = env.TRUSTED_PROXY_HOPS;
  if (hops === 0) return undefined;
  const requestHeaders = await headers();
  const chain = requestHeaders
    .get('x-forwarded-for')
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return chain?.at(-hops) || undefined;
}
