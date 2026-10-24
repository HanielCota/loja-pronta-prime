/** De quanto em quanto tempo a página aberta avisa que a aluna continua ali. */
export const HEARTBEAT_MS = 30_000;

/** Sem aviso por esse tempo, ela sai da lista de online (três avisos perdidos, com folga). */
export const ONLINE_WINDOW_MS = 90_000;

const MAX_PATH_LENGTH = 200;

/**
 * Só aceita um caminho interno simples, sem a busca e sem o fragmento: o que vem do navegador
 * não é confiável, e a busca pode levar dados que não interessam aqui.
 */
export function normalizePresencePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const path = value.split(/[?#]/)[0] ?? '';
  if (!path.startsWith('/') || path.startsWith('//') || path.length > MAX_PATH_LENGTH) return null;
  if (!/^[\w\-/.~%]+$/.test(path)) return null;
  return path;
}

export type PresencePlace = {
  /** A área (SLL, Loja Pronta, Perfil); null num caminho que não conhecemos. */
  area: string | null;
  page: string;
  /** Na aula, o id dela, pra mostrar o título. */
  lessonId?: string;
};

const SLL_PAGES: [RegExp, string][] = [
  [/^\/sll\/?$/, 'Painel'],
  [/^\/sll\/comece-aqui/, 'Comece aqui'],
  [/^\/sll\/metodo\/etapa\//, 'Uma etapa do Método'],
  [/^\/sll\/metodo/, 'Método'],
  [/^\/sll\/cursos\/[^/]+/, 'Um curso complementar'],
  [/^\/sll\/cursos/, 'Cursos complementares'],
  [/^\/sll\/minhas-lojas\/adicionar/, 'Adicionando uma loja'],
  [/^\/sll\/minhas-lojas/, 'Minhas lojas'],
  [/^\/sll\/recursos\/materiais/, 'Materiais'],
  [/^\/sll\/recursos\/assistentes\//, 'Um assistente'],
  [/^\/sll\/recursos/, 'Recursos'],
];

const STORE_PAGES: [RegExp, string][] = [
  [/^\/loja-pronta\/?$/, 'Início da loja'],
  [/^\/loja-pronta\/conversa/, 'Conversa inicial'],
  [/^\/loja-pronta\/marca\/pronta/, 'Marca pronta'],
  [/^\/loja-pronta\/marca/, 'Estúdio do logo'],
  [/^\/loja-pronta\/shopee/, 'Shopee'],
];

/** Traduz o caminho guardado em "onde ela está", em palavras. */
export function describePresence(path: string): PresencePlace {
  const lesson = /^\/sll\/aula\/([0-9a-f-]{36})\/?$/i.exec(path);
  if (lesson?.[1]) return { area: 'SLL', page: 'Assistindo uma aula', lessonId: lesson[1] };
  for (const [pattern, page] of SLL_PAGES) if (pattern.test(path)) return { area: 'SLL', page };
  for (const [pattern, page] of STORE_PAGES)
    if (pattern.test(path)) return { area: 'Loja Pronta', page };
  if (path.startsWith('/perfil')) return { area: 'Perfil', page: 'Ajustes da conta' };
  return { area: null, page: path };
}

/** "Agora", "Há 3 min" ou a data: quanto tempo desde o último aviso. */
export function formatLastSeen(lastSeenAt: Date, now: Date): string {
  const seconds = Math.max(0, Math.round((now.getTime() - lastSeenAt.getTime()) / 1000));
  if (seconds < 60) return 'Agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(lastSeenAt);
}

export function isOnline(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() <= ONLINE_WINDOW_MS;
}
