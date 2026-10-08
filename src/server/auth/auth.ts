import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { eq } from 'drizzle-orm';
import { admin } from 'better-auth/plugins';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RESET_LINK_TTL_HOURS,
  VERIFICATION_LINK_TTL_HOURS,
} from '@/config/auth';
import { env } from '@/config/env';
import { LEADS_ORIGIN } from '@/config/leads';
import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { sendPasswordResetEmail, sendVerificationEmail } from './emails';
import { reportAuthError } from './report-error';

const ONE_MINUTE = 60;
const ONE_HOUR = 60 * 60;
const ONE_DAY = 24 * ONE_HOUR;

export const auth = betterAuth({
  appName: 'Loja Pronta Prime',
  baseURL: env.BETTER_AUTH_URL,
  // Somente os dois endereços da aplicação; o cookie continua restrito ao host do acesso.
  trustedOrigins: [env.BETTER_AUTH_URL, LEADS_ORIGIN],
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),

  emailAndPassword: {
    enabled: true,
    // Não existe cadastro público: as contas são criadas pela integração com a Hotmart.
    disableSignUp: true,
    requireEmailVerification: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    resetPasswordTokenExpiresIn: RESET_LINK_TTL_HOURS * ONE_HOUR,
    revokeSessionsOnPasswordReset: true,
    // Quem redefine pelo link do email já escolheu a própria senha: não precisa trocar de novo.
    // E abrir o link prova que a caixa de email é dela: o email fica confirmado (sem isso, o
    // login seguinte pediria mais uma confirmação por email).
    onPasswordReset: async ({ user }) => {
      await db
        .update(schema.user)
        .set({ mustChangePassword: false, emailVerified: true })
        .where(eq(schema.user.id, user.id));
    },
    sendResetPassword: async ({ user, url }) => {
      // Sem await: o tempo de resposta não pode denunciar se o email existe.
      void sendPasswordResetEmail({ to: user.email, url }).catch((error: unknown) =>
        reportAuthError('envio do email de redefinição', error),
      );
    },
  },

  emailVerification: {
    // Quem tenta entrar sem ter confirmado o email recebe um link novo na hora;
    // sem isso a conta ficaria presa, porque a confirmação nunca chegaria.
    sendOnSignIn: true,
    expiresIn: VERIFICATION_LINK_TTL_HOURS * ONE_HOUR,
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationEmail({ to: user.email, url }).catch((error: unknown) =>
        reportAuthError('envio do email de confirmação', error),
      );
    },
  },

  user: {
    additionalFields: {
      /**
       * Toda conta nasce com senha temporária (enviada por email pela integração com a Hotmart),
       * então começa marcada: no primeiro login a aluna cria a própria senha (/primeiro-acesso).
       * `input: false`: ninguém altera isso por requisição; só o servidor.
       */
      mustChangePassword: { type: 'boolean', required: false, defaultValue: true, input: false },
      /**
       * Como ela quer ser chamada (perfil), separado do nome completo da compra: a saudação usa
       * este inteiro ("Ana Paula"), e o nome completo continua igual. Só o servidor grava.
       */
      preferredName: { type: 'string', required: false, input: false },
    },
  },

  session: {
    expiresIn: 30 * ONE_DAY,
    // A sessão só é lida nas páginas (componentes de servidor), que não conseguem regravar o
    // cookie: renovar só no banco deixaria banco e cookie com validades diferentes. Sem
    // renovação, os dois concordam: 30 dias a partir do login.
    disableSessionRefresh: true,
  },

  // As telas usam Server Actions (com limite próprio por email, em rate-limit.ts). As mesmas
  // ações via HTTP ficam desligadas pra não existir um caminho alternativo sem esse limite.
  // Continuam ativos: os links de email (GET /reset-password/:token, /verify-email), sessão e sair.
  disabledPaths: [
    '/sign-in/email',
    '/sign-up/email',
    '/request-password-reset',
    '/reset-password',
    '/send-verification-email',
    '/change-password',
    // Nada na plataforma usa estas: fechadas até existir uma tela (e regras) pra elas. Sem isso,
    // uma aluna logada trocaria o próprio nome (que aparece na saudação) pela API.
    '/update-user',
    '/change-email',
    '/delete-user',
    '/revoke-session',
    '/revoke-sessions',
    '/revoke-other-sessions',
    '/list-sessions',
    '/update-session',
    // Confere a senha de quem está logada: aberta, seria um jeito de chutar a senha sem o limite
    // de 5 por minuto da troca de senha (o "scope: server" dela não fecha o HTTP).
    '/verify-password',
  ],
  rateLimit: {
    enabled: true,
    window: ONE_MINUTE,
    max: 100,
  },

  advanced: {
    cookiePrefix: 'lojaprontaprime',
  },

  // nextCookies precisa ser o último: grava os cookies de sessão nas Server Actions.
  plugins: [admin(), nextCookies()],
});
