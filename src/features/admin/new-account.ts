import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/config/auth';
import { PRODUCT_IDS, type ProductId } from '@/config/products';

/** Como a pessoa entra pela primeira vez. */
export type NewAccountAccess = 'email' | 'password';

export type NewAccount = {
  name: string;
  email: string;
  admin: boolean;
  products: ProductId[];
  access: NewAccountAccess;
  /** Só com `access: 'password'`: a senha temporária, que ela troca no primeiro acesso. */
  password: string | null;
};

export type NewAccountErrors = Partial<Record<'name' | 'email' | 'password' | 'form', string>>;

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase().max(254),
  role: z.enum(['student', 'admin']),
  access: z.enum(['email', 'password']),
});

/**
 * Lê o formulário de conta nova. Devolve a conta ou, campo a campo, o que precisa de correção
 * (pra mostrar cada erro ao lado do campo dele).
 */
export function parseNewAccount(
  data: FormData,
): { ok: true; account: NewAccount } | { ok: false; errors: NewAccountErrors } {
  const raw = {
    name: data.get('name'),
    email: typeof data.get('email') === 'string' ? String(data.get('email')).trim() : undefined,
    role: data.get('role'),
    access: data.get('access'),
  };
  const parsed = schema.safeParse(raw);
  const errors: NewAccountErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === 'name') {
        errors.name = 'Escreva o nome completo (2 a 120 letras).';
        continue;
      }
      if (field === 'email') {
        errors.email = 'Escreva um email válido.';
        continue;
      }
      errors.form = 'Confira as escolhas e tente de novo.';
    }
  }

  const access = parsed.success ? parsed.data.access : null;
  const passwordValue = data.get('password');
  const password = typeof passwordValue === 'string' ? passwordValue : '';
  if (access === 'password') {
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      errors.password = `A senha temporária precisa ter de ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres.`;
    }
  }

  if (!parsed.success || Object.keys(errors).length) return { ok: false, errors };

  const products = PRODUCT_IDS.filter((id) => data.getAll('products').includes(id));
  return {
    ok: true,
    account: {
      name: parsed.data.name,
      email: parsed.data.email,
      admin: parsed.data.role === 'admin',
      products,
      access: parsed.data.access,
      password: parsed.data.access === 'password' ? password : null,
    },
  };
}
