import { describe, expect, test } from 'bun:test';
import { RESET_LINK_TTL_HOURS, VERIFICATION_LINK_TTL_HOURS } from '@/config/auth';
import { authEmailMessage } from './email-message';

const url =
  'https://app.example.invalid/api/auth/reset-password/token?callbackURL=%2Fredefinir-senha';

describe('emails de acesso', () => {
  test('recuperação também orienta quem está criando a primeira senha', () => {
    const email = authEmailMessage('password-reset', url);
    expect(email.subject).toContain('senha');
    expect(email.text).toContain('primeira senha');
    expect(email.text).toContain(`vale por ${RESET_LINK_TTL_HOURS} hora`);
    expect(email.text).toContain(url);
    expect(email.text).toContain('Só pode ser usado uma vez');
    expect(email.text).toContain('Se você não pediu');
  });

  test('confirmação preserva o link completo e o prazo do Better Auth', () => {
    const verificationUrl =
      'https://app.example.invalid/api/auth/verify-email?token=abc&callbackURL=%2Finicio';
    const email = authEmailMessage('verification', verificationUrl);
    expect(email.subject).toContain('Confirme seu email');
    expect(email.text).toContain(verificationUrl);
    expect(email.text).toContain(`vale por ${VERIFICATION_LINK_TTL_HOURS} horas`);
    expect(email.text).toContain('confirmar seu email');
  });
});
