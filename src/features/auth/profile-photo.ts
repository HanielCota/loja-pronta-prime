const PHOTO_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const PHOTO_PATH = '/perfil/foto/';

/** A URL não expõe a pasta do bucket nem permite escolher a conta de outra pessoa. */
export function profilePhotoUrl(id: string): string {
  if (!PHOTO_ID.test(id)) throw new Error('Id de foto inválido');
  return `${PHOTO_PATH}${id}`;
}

/** Só reconhece fotos criadas por este fluxo, inclusive ao apagar uma foto antiga. */
export function profilePhotoId(url: string | null | undefined): string | null {
  if (!url?.startsWith(PHOTO_PATH)) return null;
  const id = url.slice(PHOTO_PATH.length);
  return PHOTO_ID.test(id) ? id : null;
}

export function profilePhotoKey(userId: string, id: string): string {
  profilePhotoUrl(id);
  return `avatars/${userId.replace(/[^\w-]/g, '')}/${id}.webp`;
}
