import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { allowedRemoteUrl, isPublicAddress } from '../remote-address';

export async function downloadPublicFile(
  value: string,
  hosts: string[],
  limit: number,
  token?: string,
) {
  const url = allowedRemoteUrl(value, hosts);
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((row) => !isPublicAddress(row.address)))
    throw new Error('Destino remoto não permitido.');
  const pinned = addresses[0]!;
  return new Promise<{ bytes: Buffer; contentType: string }>((resolve, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        headers: { Accept: '*/*', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family),
      },
      (response) => {
        if (
          response.statusCode !== 200 ||
          Number(response.headers['content-length'] ?? 0) > limit
        ) {
          response.resume();
          reject(new Error('Arquivo remoto indisponível.'));
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > limit) req.destroy(new Error('Arquivo remoto grande demais.'));
          else chunks.push(chunk);
        });
        response.once('error', reject);
        response.once('end', () =>
          resolve({
            bytes: Buffer.concat(chunks),
            contentType: String(response.headers['content-type'] ?? ''),
          }),
        );
      },
    );
    const timer = setTimeout(() => req.destroy(new Error('Tempo de download excedido.')), 20_000);
    req.once('close', () => clearTimeout(timer));
    req.once('error', () => reject(new Error('Não foi possível baixar o arquivo.')));
    req.end();
  });
}
