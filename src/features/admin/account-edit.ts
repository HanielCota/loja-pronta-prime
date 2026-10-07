import { z } from 'zod';

export type AccountEdit = {
  name: string;
  preferredName: string | null;
  email: string;
  admin: boolean;
  mustChangePassword: boolean;
};

const accountEditSchema = z.object({
  name: z.string().trim().min(2).max(120),
  preferredName: z.string().trim().max(60),
  email: z.email().trim().toLowerCase().max(254),
  role: z.enum(['student', 'admin']),
  mustChangePassword: z.enum(['yes', 'no']),
});

/** Lê o formulário da conta; devolve null quando algum campo não serve. */
export function parseAccountEdit(data: FormData): AccountEdit | null {
  const parsed = accountEditSchema.safeParse({
    name: data.get('name'),
    preferredName: data.get('preferredName') ?? '',
    email: typeof data.get('email') === 'string' ? String(data.get('email')).trim() : undefined,
    role: data.get('role'),
    mustChangePassword: data.get('mustChangePassword'),
  });
  if (!parsed.success) return null;
  return {
    name: parsed.data.name,
    preferredName: parsed.data.preferredName || null,
    email: parsed.data.email,
    admin: parsed.data.role === 'admin',
    mustChangePassword: parsed.data.mustChangePassword === 'yes',
  };
}

/**
 * Liga ou desliga só a função admin, sem perder outras que o Better Auth tenha guardado (ele
 * separa por vírgula). Sem nenhuma função, volta a ser null, como numa conta nova.
 */
export function withAdminRole(role: string | null | undefined, admin: boolean): string | null {
  const others = (role ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item && item !== 'admin' && item !== 'user');
  const roles = admin ? ['admin', ...others] : others;
  return roles.length ? roles.join(',') : null;
}
