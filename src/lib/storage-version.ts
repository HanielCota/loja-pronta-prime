/**
 * Versão pública de um arquivo do bucket: o nome final é único a cada envio, então muda a URL
 * quando a imagem é trocada (e o navegador pode guardar a antiga sem risco) sem expor as pastas.
 */
export function storageKeyVersion(storageKey: string): string {
  return storageKey.split('/').at(-1) ?? storageKey;
}

/** Cabeçalho de cache pra imagem privada cujo endereço já carrega a versão conferida. */
export const VERSIONED_PRIVATE_IMAGE_CACHE = 'private, max-age=31536000, immutable';
