import { randomBytes } from 'node:crypto';
import type { ProductId } from '@/config/products';
import { auth } from '@/server/auth/auth';
import { database, PASSWORD, studentEmail, type StudentKind } from './support/students';

type Student = {
  kind: StudentKind;
  emailVerified: boolean;
  banned: boolean;
  temporaryPassword?: boolean;
  /** Produtos liberados (padrão: os dois). */
  products?: ProductId[];
  /** Fase da loja na Loja Pronta (sem valor, nenhuma loja cadastrada: conta como a primeira). */
  storePhase?: number;
};

const STUDENTS: Student[] = [
  { kind: 'aluna', emailVerified: true, banned: false },
  { kind: 'naoconfirmada', emailVerified: false, banned: false },
  { kind: 'desativada', emailVerified: true, banned: true },
  { kind: 'redefinir', emailVerified: true, banned: false },
  { kind: 'comemora', emailVerified: true, banned: false },
  // Própria dos testes do início (cada email tem limite de 5 logins por minuto).
  { kind: 'inicio', emailVerified: true, banned: false },
  // Com senha temporária: no login, vão pro primeiro acesso.
  { kind: 'primeiroacesso', emailVerified: true, banned: false, temporaryPassword: true },
  { kind: 'primeiroacessosenha', emailVerified: true, banned: false, temporaryPassword: true },
  { kind: 'primeiroacessoreset', emailVerified: true, banned: false, temporaryPassword: true },
  { kind: 'forcasenha', emailVerified: true, banned: false, temporaryPassword: true },
  { kind: 'primeiroacessoabas', emailVerified: true, banned: false, temporaryPassword: true },
  // Bloqueada no banco depois de entrar (como um reembolso faria).
  { kind: 'bloqueadadepois', emailVerified: true, banned: false },
  // Produtos: só um (entra direto na área) e nenhum (aviso de acesso não liberado).
  { kind: 'sosll', emailVerified: true, banned: false, products: ['sll'] },
  { kind: 'semproduto', emailVerified: true, banned: false, products: [] },
  { kind: 'doisprodutos', emailVerified: true, banned: false },
  { kind: 'voltaarea', emailVerified: true, banned: false },
  {
    kind: 'lojafase3',
    emailVerified: true,
    banned: false,
    products: ['loja-pronta'],
    storePhase: 3,
  },
  { kind: 'primeiroacessoescolha', emailVerified: true, banned: false, temporaryPassword: true },
  // Conversa inicial da Loja Pronta (cada uma no seu teste: as respostas ficam salvas).
  { kind: 'conversa', emailVerified: true, banned: false },
  { kind: 'conversaretoma', emailVerified: true, banned: false, products: ['loja-pronta'] },
  { kind: 'conversateclado', emailVerified: true, banned: false, products: ['loja-pronta'] },
  { kind: 'conversasemjs', emailVerified: true, banned: false, products: ['loja-pronta'] },
  { kind: 'conversasemloja', emailVerified: true, banned: false, products: ['sll'] },
  // Correções de acesso (e2e/auth-hardening.spec.ts).
  { kind: 'travadaip', emailVerified: true, banned: false },
  { kind: 'loginsemjs', emailVerified: true, banned: false },
  { kind: 'primeiroacessosair', emailVerified: true, banned: false, temporaryPassword: true },
  { kind: 'redefinirnaoconfirmada', emailVerified: false, banned: false },
  { kind: 'falharede', emailVerified: true, banned: false },
  { kind: 'apinome', emailVerified: true, banned: false },
];

/** Cria as alunas desta execução pela mesma API que a integração com a Hotmart vai usar. */
export default async function globalSetup() {
  process.env.E2E_RUN_ID = randomBytes(4).toString('hex');
  // Todos os testes saem do mesmo IP (e do mesmo limite de 30 logins/min): rodar o suite duas
  // vezes seguidas não pode herdar as tentativas da execução anterior.
  await database().query('delete from rate_limits');

  for (const student of STUDENTS) {
    const { user } = await auth.api.createUser({
      body: {
        email: studentEmail(student.kind),
        password: PASSWORD,
        name: `E2E ${student.kind}`,
        role: 'user',
        data: {
          emailVerified: student.emailVerified,
          banned: student.banned,
          mustChangePassword: student.temporaryPassword ?? false,
        },
      },
    });
    for (const product of student.products ?? ['sll', 'loja-pronta']) {
      await database().query('insert into student_products (user_id, product) values ($1, $2)', [
        user.id,
        product,
      ]);
    }
    if (student.storePhase) {
      await database().query('insert into stores (user_id, phase) values ($1, $2)', [
        user.id,
        student.storePhase,
      ]);
    }
  }
}
