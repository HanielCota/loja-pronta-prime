/**
 * Anexos do chamado: até 3 arquivos de 5 MB, só PNG, JPEG, WEBP e PDF, conferidos pelos bytes do
 * arquivo (a extensão e o tipo que o navegador diz podem mentir). Vale no navegador (pra recusar
 * antes de enviar) e no servidor (que é quem decide).
 */

export const MAX_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
/** O formulário inteiro: 3 arquivos + texto, com folga pro cabeçalho de cada parte. */
export const MAX_ATTACHMENT_REQUEST_BYTES = MAX_ATTACHMENTS * MAX_ATTACHMENT_BYTES + 256 * 1024;
export const MAX_IMAGE_PIXELS = 64_000_000;
export const MAX_IMAGE_SIDE = 16_384;

export const ATTACHMENT_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
} as const;
export type AttachmentMime = keyof typeof ATTACHMENT_TYPES;

export const ATTACHMENT_ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf';

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(text: string): number[] {
  return [...text].map((character) => character.charCodeAt(0));
}

/** O tipo de verdade, pelos primeiros bytes. `null`: não é um tipo aceito. */
export function detectAttachmentType(bytes: Uint8Array): AttachmentMime | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp';
  if (startsWith(bytes, ascii('%PDF-'))) return 'application/pdf';
  return null;
}

/** Foto do iPhone (HEIC/HEIF): recusada com uma frase própria, porque é o caso mais comum. */
export function isHeic(bytes: Uint8Array, fileName: string): boolean {
  if (/\.hei[cf]$/i.test(fileName)) return true;
  if (!startsWith(bytes, ascii('ftyp'), 4)) return false;
  const brand = String.fromCharCode(...bytes.slice(8, 12));
  return ['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'].includes(brand);
}

/** Nome que pode ir pra chave do bucket e pro cabeçalho do download. */
export function safeFileName(name: string, mime: AttachmentMime): string {
  const base = (name.split(/[\\/]/).at(-1) ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\.[^.]*$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'anexo'}.${ATTACHMENT_TYPES[mime]}`;
}

export type AttachmentRefusal =
  | 'duplicate'
  | 'heic'
  | 'type'
  | 'size'
  | 'empty'
  | 'broken'
  | 'too-many';

export const REFUSAL_MESSAGES: Readonly<Record<AttachmentRefusal, (name: string) => string>> = {
  duplicate: (name) => `${name} já está anexado.`,
  heic: (name) => `${name} é uma foto do iPhone (HEIC). Tire um print dela e envie o print.`,
  type: (name) => `${name} não pode ser enviado. Envie PNG, JPG, WEBP ou PDF.`,
  size: (name) => `${name} passa de 5 MB. Envie um arquivo menor ou um print.`,
  empty: (name) => `${name} está vazio.`,
  broken: (name) => `${name} é uma imagem grande demais ou estragada.`,
  'too-many': (name) => `${name} ficou de fora: dá pra enviar até ${MAX_ATTACHMENTS} arquivos.`,
};

export type CandidateFile = { name: string; size: number; key: string; head: Uint8Array };

/**
 * Decide, arquivo por arquivo, o que entra: repetido, HEIC, tipo errado, grande demais ou além
 * do limite de 3 ficam de fora, cada um com a sua frase.
 */
export function selectAttachments(
  current: readonly { key: string }[],
  incoming: readonly CandidateFile[],
): { accepted: CandidateFile[]; refused: { name: string; reason: AttachmentRefusal }[] } {
  const accepted: CandidateFile[] = [];
  const refused: { name: string; reason: AttachmentRefusal }[] = [];
  const seen = new Set(current.map((item) => item.key));
  for (const file of incoming) {
    const reason = refusalFor(file, seen, current.length + accepted.length);
    if (reason) {
      refused.push({ name: file.name, reason });
      continue;
    }
    seen.add(file.key);
    accepted.push(file);
  }
  return { accepted, refused };
}

function refusalFor(file: CandidateFile, seen: Set<string>, count: number): AttachmentRefusal | null {
  if (seen.has(file.key)) return 'duplicate';
  if (file.size === 0) return 'empty';
  if (isHeic(file.head, file.name)) return 'heic';
  if (!detectAttachmentType(file.head)) return 'type';
  if (file.size > MAX_ATTACHMENT_BYTES) return 'size';
  if (count >= MAX_ATTACHMENTS) return 'too-many';
  return null;
}

/**
 * A frase dos arquivos que ficaram de fora quando a mensagem foi enviada com os outros. `null`:
 * nenhum ficou de fora.
 */
export function refusedFilesNotice(refused: readonly { name: string; reason: AttachmentRefusal }[]): string | null {
  if (refused.length === 0) return null;
  return refused.map((file) => REFUSAL_MESSAGES[file.reason](file.name)).join(' ');
}

/** A chave do arquivo no bucket: só a pasta, um id e a extensão (nada que a aluna escreveu). */
export function attachmentStorageKey(folder: string, id: string, mime: AttachmentMime): string {
  return `support/${folder}/${id}.${ATTACHMENT_TYPES[mime]}`;
}
