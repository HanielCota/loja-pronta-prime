import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { storage } from '@/server/storage';
import {
  attachmentStorageKey,
  detectAttachmentType,
  isHeic,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIDE,
  safeFileName,
  type AttachmentMime,
  type AttachmentRefusal,
} from '../attachments';
import type { StoredAttachment } from './tickets';

export class AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentError';
  }
}

/** Os arquivos do formulário (campo `anexos`), sem os vazios que o navegador manda sem escolha. */
export function filesFromForm(form: FormData): File[] {
  return form
    .getAll('anexos')
    .filter((value): value is File => value instanceof File && value.size > 0 && value.name !== '');
}

async function checkImage(bytes: Uint8Array) {
  try {
    const metadata = await sharp(bytes, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    return width > 0 && height > 0 && width <= MAX_IMAGE_SIDE && height <= MAX_IMAGE_SIDE;
  } catch {
    return false;
  }
}

export type RefusedAttachment = { name: string; reason: AttachmentRefusal };

const STORAGE_FAILED = 'Não foi possível guardar os arquivos agora. Tente de novo em alguns minutos ou envie sem anexo.';

type PreparedAttachment = { bytes: Uint8Array; mime: AttachmentMime; fileName: string; key: string };

/** Confere um arquivo sozinho: o motivo da recusa, ou o arquivo pronto pra gravar. */
async function prepareAttachment(folder: string, file: File): Promise<PreparedAttachment | AttachmentRefusal> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) return 'empty';
  if (isHeic(bytes, file.name)) return 'heic';
  const mime = detectAttachmentType(bytes);
  if (!mime) return 'type';
  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) return 'size';
  if (mime !== 'application/pdf' && !(await checkImage(bytes))) return 'broken';
  return { bytes, mime, fileName: safeFileName(file.name, mime), key: attachmentStorageKey(folder, randomUUID(), mime) };
}

/**
 * Confere e grava os anexos no bucket, um por um: um arquivo ruim fica de fora com o motivo e não
 * derruba os outros. Quem chama já conferiu o chamado e, se o banco falhar depois, apaga o que foi
 * gravado (`removeStoredAttachments`). Falha do bucket vira `AttachmentError` com uma frase simples:
 * a mensagem do provedor (em inglês, com detalhe da configuração) nunca chega à tela.
 */
export async function storeAttachments(
  folder: string,
  files: readonly File[],
): Promise<{ stored: StoredAttachment[]; refused: RefusedAttachment[] }> {
  const prepared: PreparedAttachment[] = [];
  const refused: RefusedAttachment[] = [];
  for (const file of files) {
    if (prepared.length >= MAX_ATTACHMENTS) {
      refused.push({ name: file.name, reason: 'too-many' });
      continue;
    }
    const result = await prepareAttachment(folder, file);
    if (typeof result === 'string') {
      refused.push({ name: file.name, reason: result });
      continue;
    }
    prepared.push(result);
  }
  const stored: StoredAttachment[] = [];
  try {
    for (const item of prepared) {
      await storage().put(item.key, item.bytes, item.mime);
      stored.push({
        storageKey: item.key,
        fileName: item.fileName,
        mimeType: item.mime,
        sizeBytes: item.bytes.byteLength,
      });
    }
  } catch (error) {
    await removeStoredAttachments(stored);
    console.error(`[support] anexo não gravado no bucket: ${error instanceof Error ? error.name : 'erro'}`);
    throw new AttachmentError(STORAGE_FAILED);
  }
  return { stored, refused };
}

/** A frase de erro que pode ir pra tela: só as nossas; o resto vira uma frase genérica. */
export function attachmentErrorMessage(error: unknown): string {
  if (error instanceof AttachmentError) return error.message;
  console.error(`[support] anexos falharam: ${error instanceof Error ? error.name : 'erro'}`);
  return 'Não foi possível enviar os arquivos agora. Tente de novo.';
}

export async function removeStoredAttachments(files: readonly StoredAttachment[]) {
  await Promise.all(files.map((file) => storage().remove(file.storageKey).catch(() => undefined)));
}
