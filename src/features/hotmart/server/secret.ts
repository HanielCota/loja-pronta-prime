import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { env } from '@/config/env';

function key(): Buffer {
  // O segredo de autenticação já é obrigatório; uma chave derivada distinta protege a Hotmart.
  return Buffer.from(
    hkdfSync('sha256', env.BETTER_AUTH_SECRET, 'loja-pronta-prime', 'hotmart-hottok-v1', 32),
  );
}

export function encryptHottok(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptHottok(value: string): string {
  const [iv, tag, encrypted] = value.split('.');
  if (!iv || !tag || !encrypted) throw new Error('Token da Hotmart inválido.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function verifyHottok(received: string | null, expected: string): boolean {
  if (!received) return false;
  const one = Buffer.from(received);
  const two = Buffer.from(expected);
  return one.length === two.length && timingSafeEqual(one, two);
}
