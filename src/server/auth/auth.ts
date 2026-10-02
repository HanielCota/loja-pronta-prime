import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RESET_LINK_TTL_HOURS,
  VERIFICATION_LINK_TTL_HOURS,
} from '@/config/auth';
import { env } from '@/config/env';
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

  session: {
    expiresIn: 30 * ONE_DAY,
    updateAge: ONE_DAY,
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
