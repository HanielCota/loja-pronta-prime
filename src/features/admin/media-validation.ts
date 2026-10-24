const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];

const FILE_TYPES = {
  '.pdf': { contentType: 'application/pdf', signature: PDF_SIGNATURE },
  '.zip': { contentType: 'application/zip', signature: ZIP_SIGNATURE },
  '.docx': {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    signature: ZIP_SIGNATURE,
  },
  '.xlsx': {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    signature: ZIP_SIGNATURE,
  },
  '.pptx': {
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    signature: ZIP_SIGNATURE,
  },
  '.txt': { contentType: 'text/plain; charset=utf-8', signature: null },
  '.csv': { contentType: 'text/csv; charset=utf-8', signature: null },
} as const;

export type DownloadFileType = keyof typeof FILE_TYPES;

// Sem assinatura binária, o arquivo só passa se for texto UTF-8 de verdade.
function isSafePlainText(bytes: Uint8Array) {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // Uma página HTML de erro pode responder 200 e parecer um TXT/CSV para o navegador.
    return !(text.includes('\0') || /^\s*(?:<!doctype\s+html|<html\b)/i.test(text));
  } catch {
    return false;
  }
}

/** Aceita documentos conhecidos e confere o conteúdo em vez de confiar só no nome do arquivo. */
export function validateDownloadFile(fileName: string, bytes: Uint8Array) {
  const extension = `.${fileName.split('.').at(-1)?.toLowerCase() ?? ''}`;
  if (!Object.hasOwn(FILE_TYPES, extension)) return null;
  const type = FILE_TYPES[extension as DownloadFileType];

  if (type.signature && type.signature.some((byte, index) => bytes[index] !== byte)) return null;
  if (!type.signature && !isSafePlainText(bytes)) return null;

  return { extension: extension as DownloadFileType, contentType: type.contentType };
}
