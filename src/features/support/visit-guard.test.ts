import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  BLOCKED_DURING_VISIT,
  ENDS_VISIT,
  QUIET_DURING_VISIT,
  READ_ONLY_DURING_VISIT,
} from './visit-rules';

/**
 * Trava do "Entrar como aluna": toda Server Action da área da aluna passa por `runAsStudent`, e a
 * lista de bloqueadas não aponta pra nome que não existe mais (renomear reabriria a trava).
 */

const SRC = join(import.meta.dir, '..', '..');

/** Arquivos de Server Actions só da equipe: a visita nunca chega lá (a sessão é da aluna). */
const STAFF_ACTION_FILES = [
  'features/admin/server/',
  'features/assistant/server/admin-actions.ts',
  'features/bling/server/actions.ts',
  'features/hotmart/server/actions.ts',
  'features/leads/server/actions.ts',
  'features/support-admin/server/',
  'features/support-desk/server/',
];

/** Rotas da área da aluna que escrevem: todas passam por `visitForRoute`. */
const STUDENT_WRITE_ROUTES = [
  'app/api/presence/route.ts',
  'app/api/sll/progress/view/route.ts',
  'app/api/suporte/acesso/route.ts',
  'app/api/suporte/chamados/route.ts',
  'app/api/suporte/chamados/[numero]/mensagens/route.ts',
  'app/api/shopee/callback/route.ts',
  'app/(member)/suporte/whatsapp/[assunto]/route.ts',
];

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return filesUnder(path);
    return /\.tsx?$/.test(name) && !name.includes('.test.') ? [path] : [];
  });
}

const sourceFiles = filesUnder(SRC).map((path) => ({
  path: relative(SRC, path).replaceAll('\\', '/'),
  text: readFileSync(path, 'utf8'),
}));

const actionFiles = sourceFiles.filter((file) => /^\s*['"]use server['"]/.test(file.text));
const studentActionFiles = actionFiles.filter(
  (file) => !STAFF_ACTION_FILES.some((staff) => file.path.startsWith(staff)),
);
const transpiler = new Bun.Transpiler({ loader: 'ts' });

function escape(name: string): string {
  return name.replace(/[$]/g, '\\$');
}

/** A primeira coisa que a ação faz é `return runAsStudent('<nome>', ...)`. */
function isWrapped(text: string, name: string): boolean {
  const pattern = new RegExp(
    `export async function ${escape(name)}\\([\\s\\S]*?\\{\\s*return runAsStudent\\(\\s*'${escape(name)}',`,
  );
  return pattern.test(text);
}

/** Ação só da equipe que mora junto das da aluna: começa conferindo o administrador. */
function isStaffOnly(text: string, name: string): boolean {
  const pattern = new RegExp(
    `export async function ${escape(name)}\\([^{]*?\\)[^{]*?\\{\\s*(?:const [^=]+= )?await (?:requireAdmin|readStaffSession|requireStaff)\\(`,
  );
  return pattern.test(text);
}

describe('trava do "Entrar como aluna"', () => {
  test('acha as actions da área da aluna', () => {
    expect(studentActionFiles.length).toBeGreaterThan(20);
  });

  test('toda Server Action exportada da área da aluna passa por runAsStudent', () => {
    const unguarded = studentActionFiles.flatMap((file) =>
      transpiler
        .scan(file.text)
        .exports.filter((name) => !isWrapped(file.text, name) && !isStaffOnly(file.text, name))
        .map((name) => `${file.path}: ${name}`),
    );
    expect(unguarded).toEqual([]);
  });

  test('toda rota de escrita da área da aluna confere a visita', () => {
    for (const path of STUDENT_WRITE_ROUTES) {
      const file = sourceFiles.find((item) => item.path === path);
      expect(file?.text ?? `${path} não existe`).toContain('visitForRoute(');
    }
  });

  test('todo nome das regras ainda existe numa ação ou rota', () => {
    const known = new Set(
      sourceFiles.flatMap((file) =>
        [...file.text.matchAll(/(?:runAsStudent|visitForRoute)\(\s*'(\w+)'/g)].map(
          (match) => match[1],
        ),
      ),
    );
    const named = [
      ...Object.keys(BLOCKED_DURING_VISIT),
      ...QUIET_DURING_VISIT,
      ...READ_ONLY_DURING_VISIT,
      ...ENDS_VISIT,
    ];
    expect(named.filter((name) => !known.has(name))).toEqual([]);
  });
});
