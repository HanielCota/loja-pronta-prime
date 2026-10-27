import { z } from 'zod';
import { isStaffRole } from './staff-access';

export type VisitTarget = {
  id: string;
  role: string | null;
  banned: boolean | null;
  mustChangePassword: boolean | null;
};

/**
 * Por que a equipe não pode entrar nesta conta, ou `null` se pode. Conta da equipe nunca (o papel
 * pode vir junto de outros, "user,support_agent"), nem a própria, nem conta bloqueada; e a aluna
 * que ainda não criou a senha só mostraria a tela de criar senha, que fica bloqueada na visita.
 */
export function visitRefusalReason(target: VisitTarget | null, staffId: string): string | null {
  if (!target) return 'Conta não encontrada.';
  if (target.id === staffId) return 'Essa é a sua própria conta.';
  if (isStaffRole(target.role)) return 'Contas da equipe não podem ser acessadas.';
  if (target.banned) return 'A conta está bloqueada.';
  if (target.mustChangePassword !== false) return 'A aluna ainda não criou a senha.';
  return null;
}

/** Áreas da aluna onde a visita pode começar. */
const STUDENT_AREAS = ['/loja-pronta', '/sll', '/suporte', '/perfil', '/ze-mauro'];

/**
 * A página onde a visita começa, só se for da área da aluna (um endereço solto viraria um
 * redirecionamento aberto). Qualquer outra coisa abre no início.
 */
export function visitDestination(raw: string | null | undefined): string {
  if (!raw || raw.length > 200) return '/';
  if (!/^\/[\w\-/]*$/.test(raw) || raw.includes('//')) return '/';
  const inArea = STUDENT_AREAS.some((area) => raw === area || raw.startsWith(`${area}/`));
  if (!inArea) return '/';
  return raw;
}

/** O que o botão "Entrar como aluna" manda. */
export const startVisitSchema = z.object({
  aluna: z.string().trim().min(1).max(64),
  destino: z.string().trim().max(200).optional(),
});

/**
 * O número do chamado que motivou a visita, ou `null`. Só dígitos e até 9 deles: cabe no
 * `integer` do Postgres e recusa "1e3", "0x10", espaços e negativos.
 */
export function ticketNumberOf(raw: unknown): number | null {
  if (typeof raw !== 'string' || !/^[1-9]\d{0,8}$/.test(raw)) return null;
  return Number(raw);
}

/** O e-mail do chamado público ainda não foi confirmado: não dá pra saber se a conta é dela. */
export const UNCONFIRMED_TICKET_REFUSAL = 'O e-mail do chamado ainda não foi confirmado.';
