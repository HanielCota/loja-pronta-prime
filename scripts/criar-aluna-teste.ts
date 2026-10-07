/**
 * Cria uma aluna de TESTE no banco de desenvolvimento.
 * Em produção, as contas nascem da integração com a Hotmart (docs/INTEGRACAO-HOTMART.md).
 *
 *   bun run dev:aluna <email> <senha> [--nao-confirmada] [--desativada] [--primeiro-acesso]
 *                     [--so-sll | --so-loja-pronta | --sem-produto] [--fase=<1 a 7>] [--marca]
 *
 * Produtos: sem opção, a aluna tem os dois (e vê a tela de escolha de área).
 * Fase: em que fase está a loja dela na Loja Pronta (sem opção, a primeira).
 * --marca: conversa inicial já enviada (com respostas de exemplo): ela cai na fase da marca.
 */
import type { ProductId } from '@/config/products';
import { STORE_PHASES } from '@/config/store-phases';
import { auth } from '@/server/auth/auth';
import { db } from '@/server/db';
import { manualProductGrants, storeOnboarding, stores, studentProducts } from '@/server/db/schema';

if (process.env.NODE_ENV === 'production') {
  console.error('Esse script é só pra desenvolvimento.');
  process.exit(1);
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const [email, password] = args.filter((arg) => !arg.startsWith('--'));

const phaseFlag = args.find((arg) => arg.startsWith('--fase='));
if (phaseFlag && flags.has('--marca')) {
  console.error('Use --marca ou --fase, não os dois: --marca já põe a loja na fase da marca (2).');
  process.exit(1);
}
const phase = phaseFlag ? Number(phaseFlag.slice('--fase='.length)) : 1;

if (!email || !password || !Number.isInteger(phase) || phase < 1 || phase > STORE_PHASES.length) {
  console.error(
    'Uso: bun run dev:aluna <email> <senha> [--nao-confirmada] [--desativada] [--primeiro-acesso] [--so-sll | --so-loja-pronta | --sem-produto] [--fase=<1 a 7>] [--marca]',
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

const products: ProductId[] = flags.has('--sem-produto')
  ? []
  : flags.has('--so-sll')
    ? ['sll']
    : flags.has('--so-loja-pronta')
      ? ['loja-pronta']
      : ['sll', 'loja-pronta'];
if (products.length) {
  await db
    .insert(studentProducts)
    .values(products.map((product) => ({ userId: user.id, product })));
  await db
    .insert(manualProductGrants)
    .values(products.map((product) => ({ userId: user.id, product })));
}

if (products.includes('loja-pronta')) {
  const marca = flags.has('--marca');
  await db.insert(stores).values({ userId: user.id, phase: marca ? 2 : phase });
  if (marca) {
    await db.insert(storeOnboarding).values({
      userId: user.id,
      answers: {
        vendas: 'Nunca vendi',
        estilo: 'Delicado',
        cor: 'Rosa',
        sentimento: ['Acolhimento', 'Sofisticação'],
        toque: '',
      },
      whatsapp: '11987654321',
      completedAt: new Date(),
    });
  }
}

console.info(`Aluna de teste criada (${user.id}), produtos: ${products.join(', ') || 'nenhum'}.`);
process.exit(0);
