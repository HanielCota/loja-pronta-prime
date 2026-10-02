import { headers } from 'next/headers';

/**
 * IP de quem fez a requisição, como visto pelo proxy da hospedagem.
 *
 * Usa a ÚLTIMA entrada do X-Forwarded-For: é a que o proxy acrescenta. As anteriores vêm do
 * próprio cliente e podem ser inventadas a cada tentativa. Se houver mais de um proxy na
 * frente do sistema, ajuste aqui. Sem proxy, o próprio Next preenche o cabeçalho com o endereço
 * da conexão, então o IP é o de quem se conectou direto.
 */
export async function getClientIp(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  return forwardedFor || requestHeaders.get('x-real-ip')?.trim() || undefined;
}
