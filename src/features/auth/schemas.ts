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
});

export const resetPasswordSchema = z.object({
  password,
  token: z.string({ error: VALIDATION_MESSAGES.resetLinkMissing }),
});
