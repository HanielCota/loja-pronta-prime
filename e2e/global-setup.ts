import { randomBytes } from 'node:crypto';
import { auth } from '@/server/auth/auth';
import { PASSWORD, studentEmail, type StudentKind } from './support/students';

type Student = {
  kind: StudentKind;
  emailVerified: boolean;
  banned: boolean;
  temporaryPassword?: boolean;
};

const STUDENTS: Student[] = [
  { kind: 'aluna', emailVerified: true, banned: false },
  { kind: 'naoconfirmada', emailVerified: false, banned: false },
  { kind: 'desativada', emailVerified: true, banned: true },
  { kind: 'redefinir', emailVerified: true, banned: false },
  { kind: 'comemora', emailVerified: true, banned: false },
  // Com senha temporária: no login, vão pro primeiro acesso.
  { kind: 'primeiroacesso', emailVerified: true, banned: false, temporaryPassword: true },
  { kind: 'primeiroacessosenha', emailVerified: true, banned: false, temporaryPassword: true },
  { kind: 'primeiroacessoreset', emailVerified: true, banned: false, temporaryPassword: true },
];

/** Cria as alunas desta execução pela mesma API que a integração com a Hotmart vai usar. */
export default async function globalSetup() {
  process.env.E2E_RUN_ID = randomBytes(4).toString('hex');

  for (const student of STUDENTS) {
    await auth.api.createUser({
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
  }
}
