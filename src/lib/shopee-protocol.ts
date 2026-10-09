import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

/** Só aceita o caminho da API; a origem é escolhida pelo cliente de servidor. */
export function signShopeeRequest(
  partnerId: number,
  path: string,
  timestamp: number,
  key: string,
  shop?: { accessToken: string; shopId: number },
) {
  if (
    !Number.isSafeInteger(partnerId) ||
    partnerId <= 0 ||
    !Number.isSafeInteger(timestamp) ||
    timestamp <= 0 ||
    !/^\/api\/v2\/(?:[a-z_]+\/)+[a-z_]+$/.test(path) ||
    !key
  )
    throw new Error('Parâmetros de assinatura inválidos.');
  if (shop && (!shop.accessToken || !Number.isSafeInteger(shop.shopId) || shop.shopId <= 0))
    throw new Error('Loja inválida.');
  const base = `${partnerId}${path}${timestamp}${shop ? `${shop.accessToken}${shop.shopId}` : ''}`;
  return createHmac('sha256', key).update(base).digest('hex');
}

function tokenKey(key: string) {
  if (!/^[a-f0-9]{64}$/i.test(key))
    throw new Error('A chave de tokens precisa ter 32 bytes em hexadecimal.');
  return Buffer.from(key, 'hex');
}

/** O dono entra na autenticação da cifra para impedir troca de tokens entre contas. */
export function encryptShopeeToken(value: string, key: string, owner: string): string {
  if (!value || !owner) throw new Error('Token ou dono ausente.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', tokenKey(key), iv);
  cipher.setAAD(Buffer.from(owner));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('hex'),
    cipher.getAuthTag().toString('hex'),
    encrypted.toString('hex'),
  ].join('.');
}

export function decryptShopeeToken(value: string, key: string, owner: string): string {
  if (!owner || !/^v1\.[a-f0-9]{24}\.[a-f0-9]{32}\.(?:[a-f0-9]{2})+$/.test(value))
    throw new Error('Token armazenado inválido.');
  const [, iv, tag, encrypted] = value.split('.');
  const decipher = createDecipheriv('aes-256-gcm', tokenKey(key), Buffer.from(iv!, 'hex'));
  decipher.setAAD(Buffer.from(owner));
  decipher.setAuthTag(Buffer.from(tag!, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted!, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}
