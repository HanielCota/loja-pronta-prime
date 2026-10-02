/**
 * Cria uma aluna de TESTE no banco de desenvolvimento.
 * Em produção, as contas nascem da integração com a Hotmart (docs/INTEGRACAO-HOTMART.md).
 *
 *   bun run dev:aluna <email> <senha> [--nao-confirmada] [--desativada] [--primeiro-acesso]
 */
import { auth } from '@/server/auth/auth';

if (process.env.NODE_ENV === 'production') {
  console.error('Esse script é só pra desenvolvimento.');
  process.exit(1);
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const [email, password] = args.filter((arg) => !arg.startsWith('--'));

if (!email || !password) {
  console.error(
    'Uso: bun run dev:aluna <email> <senha> [--nao-confirmada] [--desativada] [--primeiro-acesso]',
  );
  process.exit(1);
}

const { user } = await auth.api.createUser({
  body: {
    email,
    password,
    name: 'Aluna Teste',
    role: 'user',
    data: {
      emailVerified: !flags.has('--nao-confirmada'),
      banned: flags.has('--desativada'),
      // Sem a flag, a senha informada já vale como definitiva (não pede pra trocar no login).
      mustChangePassword: flags.has('--primeiro-acesso'),
    },
  },
});

console.info(`Aluna de teste criada (${user.id}).`);
process.exit(0);
