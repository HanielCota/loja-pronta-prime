import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/config/auth';
import { VALIDATION_MESSAGES } from './messages';

/** Regras compartilhadas entre o navegador e o servidor. */
export const emailSchema = z
  .string({ error: VALIDATION_MESSAGES.emailRequired })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: VALIDATION_MESSAGES.emailInvalid }));

const password = z
  .string({ error: VALIDATION_MESSAGES.passwordRequired })
  .min(PASSWORD_MIN_LENGTH, { error: VALIDATION_MESSAGES.passwordTooShort })
  .max(PASSWORD_MAX_LENGTH, { error: VALIDATION_MESSAGES.passwordTooLong });

export const loginSchema = z.object({
  email: emailSchema,
  password,
  next: z.string().optional(),
});

export const recoverSchema = z.object({
  email: emailSchema,
  next: z.string().optional(),
});

export const firstPasswordSchema = z.object({
  password,
  next: z.string().optional(),
});

/** Trocar a senha logada (perfil): a atual confirma que é ela mesma quem está no aparelho. */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ error: VALIDATION_MESSAGES.currentPasswordRequired })
    .max(PASSWORD_MAX_LENGTH, { error: VALIDATION_MESSAGES.passwordTooLong }),
  password,
});

/** Como ela quer ser chamada: curto, pra caber na saudação do título sem virar um parágrafo. */
export const NAME_MAX_LENGTH = 30;

export const profileNameSchema = z.object({
  name: z
    .string({ error: VALIDATION_MESSAGES.nameRequired })
    .trim()
    .min(1, { error: VALIDATION_MESSAGES.nameRequired })
    .max(NAME_MAX_LENGTH, { error: VALIDATION_MESSAGES.nameTooLong }),
});

export const resetPasswordSchema = z.object({
  password,
  token: z.string({ error: VALIDATION_MESSAGES.resetLinkMissing }),
});
