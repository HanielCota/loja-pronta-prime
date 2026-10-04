import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { env } from '@/config/env';

/**
 * Onde os arquivos do sistema ficam (hoje, o logo gerado): o bucket S3, em dev e em produção.
 * Quem usa só conhece `put`, `get` e `removeAll` com uma chave ("logos/<aluna>/<id>.png"). As
 * chaves são sempre montadas pelo sistema, nunca vindas da URL.
 */
export type Storage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** O arquivo, ou `null` se não existe. */
  get(key: string): Promise<Uint8Array | null>;
  /** Apaga tudo que começa com o prefixo (ex.: "logos/<aluna>/"). */
  removeAll(prefix: string): Promise<void>;
};

/** Chave segura: letras, números, "-", "_", "." e "/" (sem "..", sem começar com "/"). */
const KEY = /^(?!\/)(?!.*\.\.)[\w./-]{1,200}$/;

function assertKey(key: string) {
  if (!KEY.test(key)) throw new Error('Chave de arquivo inválida');
}

function s3Storage(): Storage {
  const Bucket = env.S3_BUCKET;
  const client = new S3Client({
    region: env.S3_REGION,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  });
  return {
    async put(key, body, contentType) {
      assertKey(key);
      await client.send(
        new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }),
      );
    },
    async get(key) {
      assertKey(key);
      try {
        const object = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        return object.Body ? await object.Body.transformToByteArray() : null;
      } catch (error) {
        if (error instanceof NoSuchKey) return null;
        throw error;
      }
    },
    async removeAll(prefix) {
      // Um prefixo vazio ou curto demais apagaria o bucket inteiro: só pastas de verdade.
      assertKey(prefix);
      if (!prefix.endsWith('/') || prefix.split('/').length < 3) {
        throw new Error('Prefixo de arquivos inválido');
      }
      let ContinuationToken: string | undefined;
      do {
        const page = await client.send(
          new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken }),
        );
        const keys = (page.Contents ?? []).flatMap((item) => (item.Key ? [{ Key: item.Key }] : []));
        if (keys.length) {
          await client.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys } }));
        }
        ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (ContinuationToken);
    },
  };
}

let instance: Storage | undefined;

/** O bucket configurado (o cliente é criado uma vez). */
export function storage(): Storage {
  instance ??= s3Storage();
  return instance;
}
