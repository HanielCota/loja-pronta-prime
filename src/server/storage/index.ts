import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '@/config/env';

/**
 * Onde os arquivos do sistema ficam (hoje, o logo gerado). Quem usa só conhece `put` e `get` com
 * uma chave ("logos/<aluna>/<id>.png"): o bucket S3 em produção, ou uma pasta do projeto em dev
 * e nos testes. As chaves são sempre montadas pelo sistema, nunca vindas da URL.
 */
export type Storage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** O arquivo, ou `null` se não existe. */
  get(key: string): Promise<Uint8Array | null>;
};

/** Chave segura: letras, números, "-", "_", "." e "/" (sem "..", sem começar com "/"). */
const KEY = /^(?!\/)(?!.*\.\.)[\w./-]{1,200}$/;

function assertKey(key: string) {
  if (!KEY.test(key)) throw new Error('Chave de arquivo inválida');
}

function s3Storage(): Storage {
  const { S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = env;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error('Bucket S3 não configurado (veja .env.example)');
  }
  const client = new S3Client({
    region: env.S3_REGION,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  return {
    async put(key, body, contentType) {
      assertKey(key);
      await client.send(
        new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body, ContentType: contentType }),
      );
    },
    async get(key) {
      assertKey(key);
      try {
        const object = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
        return object.Body ? await object.Body.transformToByteArray() : null;
      } catch (error) {
        if (error instanceof NoSuchKey) return null;
        throw error;
      }
    },
  };
}

/** Uma pasta do projeto (.data/storage): só fora de produção. */
function diskStorage(): Storage {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Arquivos em pasta local não valem em produção: configure o bucket S3');
  }
  const root = path.join(process.cwd(), '.data', 'storage');
  const file = (key: string) => {
    assertKey(key);
    return path.join(root, ...key.split('/'));
  };
  return {
    async put(key, body) {
      const target = file(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(file(key)));
      } catch {
        return null;
      }
    },
  };
}

let instance: Storage | undefined;

/** O armazenamento configurado (criado uma vez). */
export function storage(): Storage {
  instance ??=
    (env.STORAGE_DRIVER ?? (env.S3_BUCKET ? 's3' : 'local')) === 's3' ? s3Storage() : diskStorage();
  return instance;
}
