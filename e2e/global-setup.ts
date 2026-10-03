import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
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
  /** Conversa inicial já enviada (com respostas de exemplo): a loja está na fase da marca. */
  conversationSent?: boolean;
  /** Marca já confirmada (nome, um logo de exemplo e um texto de exemplo). */
  brandDone?: boolean;
  /** Marca começada: só o nome (está no chat do logo). */
  brandStarted?: boolean;
  /**
   * Marca confirmada antes do chat do logo (nome e texto, sem imagem: o logo antigo saiu na
   * migração). Só o logo reabre, em qualquer fase.
   */
  brandDoneWithoutLogo?: boolean;
};

/** Respostas de exemplo da conversa, pras alunas que já começam na fase da marca. */
const SENT_ANSWERS = {
  vendas: 'Nunca vendi',
  motivacao: ['Renda extra'],
  dificuldade: 'Escolher bons produtos',
  categorias: ['Pets'],
  tempo: 'Até 3 horas',
  nome: 'Patinhas da Ana',
  estilo: 'Divertido',
  cor: 'Verde',
  sentimento: ['Acolhidas'],
  toque: '',
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
  { kind: 'conversatoques', emailVerified: true, banned: false, products: ['loja-pronta'] },
  // Correções de acesso (e2e/auth-hardening.spec.ts).
  { kind: 'travadaip', emailVerified: true, banned: false },
  { kind: 'loginsemjs', emailVerified: true, banned: false },
  { kind: 'primeiroacessosair', emailVerified: true, banned: false, temporaryPassword: true },
  { kind: 'redefinirnaoconfirmada', emailVerified: false, banned: false },
  { kind: 'falharede', emailVerified: true, banned: false },
  { kind: 'apinome', emailVerified: true, banned: false },
  // Perfil (e2e/profile.spec.ts): cada uma no seu teste, porque nome e senha mudam.
  { kind: 'perfilnome', emailVerified: true, banned: false },
  { kind: 'perfilsenha', emailVerified: true, banned: false },
  // Rever fases feitas (e2e/revise.spec.ts): a conversa enviada; a marca confirmada; e uma loja já
  // publicada, em que nada reabre.
  {
    kind: 'revisaconversa',
    emailVerified: true,
    banned: false,
    products: ['loja-pronta'],
    storePhase: 2,
    conversationSent: true,
  },
  {
    kind: 'revisamarca',
    emailVerified: true,
    banned: false,
    products: ['loja-pronta'],
    storePhase: 3,
    conversationSent: true,
    brandDone: true,
  },
  {
    kind: 'revisatravada',
    emailVerified: true,
    banned: false,
    products: ['loja-pronta'],
    storePhase: 6,
    conversationSent: true,
    brandDone: true,
  },
  {
    kind: 'marcasemlogo',
    emailVerified: true,
    banned: false,
    products: ['loja-pronta'],
    storePhase: 6,
    conversationSent: true,
    brandDoneWithoutLogo: true,
  },
  // Marca da loja (fase 2): a conversa já enviada.
  {
    kind: 'marca',
    emailVerified: true,
    banned: false,
    products: ['loja-pronta'],
    storePhase: 2,
    conversationSent: true,
  },
  {
    kind: 'marcateclado',
    emailVerified: true,
    banned: false,
    products: ['loja-pronta'],
    storePhase: 2,
    conversationSent: true,
  },
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
        // Um nome de verdade na frente: a saudação descarta o que não parece nome (names.ts).
        name: `Ana ${student.kind}`,
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
    if (student.conversationSent) {
      await database().query(
        `insert into store_onboarding (user_id, answers, whatsapp, completed_at)
         values ($1, $2, '11987654321', now())`,
        [user.id, JSON.stringify(SENT_ANSWERS)],
      );
    }
    if (student.brandStarted) {
      await database().query(
        `insert into store_brand (user_id, name) values ($1, 'Patinhas da Ana')`,
        [user.id],
      );
    }
    if (student.brandDoneWithoutLogo) {
      await database().query(
        `insert into store_brand (user_id, name, description, completed_at)
         values ($1, 'Patinhas da Ana', 'Tudo pro seu pet, com carinho.', now())`,
        [user.id],
      );
    }
    if (student.brandDone) {
      await database().query(
        `insert into store_brand (user_id, name, logo_image, description, completed_at)
         values ($1, 'Patinhas da Ana', $2, 'Tudo pro seu pet, com carinho.', now())`,
        [user.id, await seedLogo(user.id)],
      );
    }
  }
}

/** Um PNG de exemplo (8×8 rosa), como o logo criado no chat. */
const SAMPLE_LOGO =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4/+M/VsQwKoEXAQB3h5ZJ6UMsdwAAAABJRU5ErkJggg==';

/**
 * Guarda o logo de exemplo na pasta local (o servidor dos testes roda com STORAGE_DRIVER=local) e
 * devolve a chave, no mesmo formato das do chat (logos/<aluna>/<id>.png).
 */
async function seedLogo(userId: string): Promise<string> {
  const key = `logos/${userId.replace(/[^\w-]/g, '')}/e2e-logo-0001.png`;
  const file = path.join(process.cwd(), '.data', 'storage', ...key.split('/'));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(SAMPLE_LOGO, 'base64'));
  return key;
}
