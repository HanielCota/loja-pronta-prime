import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { env } from '@/config/env';

function key(): Buffer {
  // Chave derivada só pra este uso: vazar a senha de um membro não ajuda a abrir outro segredo.
  return Buffer.from(
    hkdfSync(
      'sha256',
      env.BETTER_AUTH_SECRET,
      'loja-pronta-prime',
      'assisted-delivery-member-v1',
      32,
    ),
  );
}

/** A senha fica presa à aluna e à loja: copiada pra outra entrega, ela não abre. */
function owner(userId: string, shopId: string) {
  return Buffer.from(`assisted-delivery:${userId}:${shopId}`);
}

export function encryptMemberPassword(value: string, userId: string, shopId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(owner(userId, shopId));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptMemberPassword(value: string, userId: string, shopId: string): string {
  const [iv, tag, encrypted] = value.split('.');
  if (!iv || !tag || !encrypted) throw new Error('Senha do membro inválida.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  decipher.setAAD(owner(userId, shopId));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
