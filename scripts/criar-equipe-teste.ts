/**
 * Cria uma pessoa da EQUIPE de teste no banco de desenvolvimento (atendente, supervisor ou admin).
 * Em produção, a equipe entra pelo convite em /admin/suporte/equipe.
 *
 *   bun run dev:equipe <email> <senha> [--cargo=atendente|supervisor|admin] [--nome="Ana"]
 *
 * Sem --cargo, cria atendente.
 */
import { auth } from '@/server/auth/auth';

if (process.env.NODE_ENV === 'production') {
  console.error('Esse script é só pra desenvolvimento.');
  process.exit(1);
}

const ROLE_BY_CARGO = {
  atendente: 'support_agent',
  supervisor: 'support_supervisor',
  admin: 'admin',
} as const;

const args = process.argv.slice(2);
const [email, password] = args.filter((arg) => !arg.startsWith('--'));
const cargoFlag = args.find((arg) => arg.startsWith('--cargo='));
const nameFlag = args.find((arg) => arg.startsWith('--nome='));
const cargo = (cargoFlag ? cargoFlag.slice('--cargo='.length) : 'atendente') as keyof typeof ROLE_BY_CARGO;
const role = ROLE_BY_CARGO[cargo];

if (!email || !password || !role) {
  console.error(
    'Uso: bun run dev:equipe <email> <senha> [--cargo=atendente|supervisor|admin] [--nome="Ana"]',
  );
  process.exit(1);
}

const name = nameFlag ? nameFlag.slice('--nome='.length) : `Equipe ${cargo}`;

const { user } = await auth.api.createUser({
  body: {
    email,
    password,
    name,
    // O plugin admin só tipa os papéis que conhece; o campo guarda texto livre.
    role: role as 'admin',
    data: { emailVerified: true, mustChangePassword: false },
  },
});

console.log(`Pronto: ${user.email} (${cargo}).`);
process.exit(0);
