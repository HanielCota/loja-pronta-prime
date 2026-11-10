/**
 * Versão pública de um arquivo do bucket: o nome final é único a cada envio, então muda a URL
 * quando a imagem é trocada (e o navegador pode guardar a antiga sem risco) sem expor as pastas.
 */
export function storageKeyVersion(storageKey: string): string {
  return storageKey.slice(storageKey.lastIndexOf('/') + 1);
}

/** Cabeçalho de cache pra imagem privada cujo endereço já carrega a versão conferida. */
export const VERSIONED_PRIVATE_IMAGE_CACHE = 'private, max-age=31536000, immutable';

/**
 * A foto de perfil aparece no menu de toda página, mas também fica num aparelho que outra pessoa
 * pode usar depois de sair da conta: guarda por um dia, não por um ano.
 */
export const PROFILE_PHOTO_CACHE = 'private, max-age=86400';

/** Junta a versão ao endereço da rota; sem versão, fica o endereço antigo (sem cache longo). */
export function versionedSrc(path: string, version: string | null | undefined): string {
  return version ? `${path}?v=${encodeURIComponent(version)}` : path;
}
