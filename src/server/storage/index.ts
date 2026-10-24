import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { env } from '@/config/env';
import { CONNECTION_TIMEOUT_MS, REQUEST_TIMEOUT_MS, uploadTimeoutMs } from './timeouts';

/**
 * Onde os arquivos do sistema ficam (os logos e os vídeos): o bucket S3, em dev e em produção.
 * Quem usa só conhece as operações abaixo, com uma chave ("logos/<aluna>/<id>.png"). As chaves
 * são sempre montadas pelo sistema, nunca vindas da URL.
 */
export type Storage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** O arquivo, ou `null` se não existe. */
  get(key: string): Promise<Uint8Array | null>;
  /**
   * Um pedaço do arquivo (ou ele todo), pra tocar vídeo: o navegador pede trechos (`range`, como
   * o cabeçalho Range: "bytes=0-") pra avançar e voltar. Não existe: `null`.
   */
  stream(key: string, range?: string): Promise<StoredStream | null>;
  /** Apaga um arquivo (não existir não é erro). */
  remove(key: string): Promise<void>;
  /** Apaga tudo que começa com o prefixo (ex.: "logos/<aluna>/"). */
  removeAll(prefix: string): Promise<void>;
};

export type StoredStream = {
  body: ReadableStream;
  /** Bytes deste pedaço. */
  length: number;
  /** "bytes 0-999/5000", quando é um pedaço. */
  contentRange: string | undefined;
  contentType: string | undefined;
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
    // Sem limite, um bucket que não responde prende a requisição (e o worker) para sempre. O
    // prazo vale até a resposta começar: um vídeo pausado continua lendo o corpo sem cair. O
    // envio ganha mais tempo conforme o tamanho (veja `put`).
    requestHandler: {
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      requestTimeout: REQUEST_TIMEOUT_MS,
      throwOnRequestTimeout: true,
    },
  });
  return {
    async put(key, body, contentType) {
      assertKey(key);
      await client.send(
        new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }),
        // O bucket só responde depois de receber o arquivo inteiro: 15 s não mandam um vídeo.
        { requestTimeout: uploadTimeoutMs(body.byteLength) },
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
    async stream(key, range) {
      assertKey(key);
      try {
        const object = await client.send(
          new GetObjectCommand({ Bucket, Key: key, ...(range ? { Range: range } : {}) }),
        );
        if (!object.Body) return null;
        return {
          body: object.Body.transformToWebStream(),
          length: object.ContentLength ?? 0,
          contentRange: object.ContentRange,
          contentType: object.ContentType,
        };
      } catch (error) {
        if (error instanceof NoSuchKey) return null;
        throw error;
      }
    },
    async remove(key) {
      assertKey(key);
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
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
