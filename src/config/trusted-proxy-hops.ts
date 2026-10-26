import { z } from 'zod';

/**
 * TRUSTED_PROXY_HOPS: quantos proxies confiáveis ficam na frente do sistema. Vazio ou só espaços
 * conta como "não definida": convertido direto, `Number('')` vira 0 e desligaria o limite por IP
 * em silêncio, justo quando a variável foi esquecida pela metade no painel da hospedagem.
 */
export function trustedProxyHopsSchema(isProduction: boolean) {
  return z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined)
    .refine((value) => !isProduction || value !== undefined, {
      error: 'em produção, defina TRUSTED_PROXY_HOPS (0 sem proxy, 1 atrás de um proxy)',
    })
    .transform((value) => value ?? '1')
    .pipe(z.string().regex(/^[0-5]$/, { error: 'use um número inteiro de 0 a 5' }))
    .transform(Number);
}
