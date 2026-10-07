import { Pool } from 'pg';

/** Senha de todas as alunas criadas pelos testes. */
export const PASSWORD = 'senha-teste-123';

export type StudentKind =
  | 'aluna'
  | 'naoconfirmada'
  | 'desativada'
  | 'redefinir'
  | 'comemora'
  | 'primeiroacesso'
  | 'primeiroacessosenha'
  | 'primeiroacessoreset'
  | 'inicio'
  | 'forcasenha'
  | 'primeiroacessoabas'
  | 'bloqueadadepois'
  | 'sosll'
  | 'sllprogress'
  | 'semproduto'
  | 'lojafase3'
  | 'voltaarea'
  | 'doisprodutos'
  | 'doisprodutosmontagem'
  | 'doisprodutosrota'
  | 'primeiroacessoescolha'
  | 'conversa'
  | 'conversaretoma'
  | 'conversateclado'
  | 'conversasemjs'
  | 'conversasemloja'
  | 'travadaip'
  | 'loginsemjs'
  | 'primeiroacessosair'
  | 'redefinirnaoconfirmada'
  | 'falharede'
  | 'apinome'
  | 'conversatoques'
  | 'conversacor'
  | 'shopeeconta'
  | 'shopeeloja'
  | 'marca'
  | 'marcateclado'
  | 'marcavoz'
  | 'marcafonte'
  | 'marcasemlogo'
  | 'perfilnome'
  | 'perfilsenha'
  | 'perfilfotodesktoplight'
  | 'perfilfotodesktopdark'
  | 'perfilfotocelularlight'
  | 'perfilfotocelulardark'
  | 'perfilfotoinvalida'
  | 'perfilfotogrande'
  | 'perfilfotosemjs'
  | 'perfilfotooutra'
  | 'revisaconversa'
  | 'revisamarca'
  | 'revisatravada'
  | 'mascotesono';

/** Id desta execução, definido no global-setup: cada execução usa alunas próprias. */
export function runId(): string {
  const id = process.env.E2E_RUN_ID;
  if (!id) throw new Error('E2E_RUN_ID ausente: o global-setup não rodou.');
  return id;
}

export function studentEmail(kind: StudentKind | string): string {
  return `e2e-${runId()}-${kind}@teste.com`;
}

let pool: Pool | undefined;

export function database(): Pool {
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

/** Um worker pode executar outro arquivo depois do afterAll: o próximo uso precisa de um pool novo. */
export async function closeDatabase(): Promise<void> {
  const current = pool;
  pool = undefined;
  await current?.end();
}

/** Token do link de redefinição mais recente da aluna (o "email" que ainda não é enviado). */
export async function latestResetToken(email: string): Promise<string | undefined> {
  const { rows } = await database().query<{ identifier: string }>(
    `select v.identifier from verification v
       join "user" u on u.id = v.value
      where u.email = $1 and v.identifier like 'reset-password:%'
      order by v.created_at desc
      limit 1`,
    [email],
  );
  return rows[0]?.identifier.replace('reset-password:', '');
}
