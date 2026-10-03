import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, RESET_LINK_TTL_HOURS } from '@/config/auth';
import type { AuthErrorCode } from './error-codes';

/**
 * Todas as mensagens de acesso ficam aqui. Nunca mostre texto técnico
 * (mensagem de exceção, código HTTP etc.) pra aluna: mapeie para um código abaixo.
 *
 * Tom: próximo e direto, como uma amiga que entende do assunto. Sempre diga o que
 * fazer a seguir. Os títulos de erro seguem a especificação; as dicas explicam o próximo passo.
 */

/** "1 hora", "24 horas". */
export const formatHours = (hours: number) => `${hours} ${hours === 1 ? 'hora' : 'horas'}`;

export const VALIDATION_MESSAGES = {
  emailRequired: 'Digite o email que você usou na compra',
  emailInvalid: 'Digite um email válido',
  passwordRequired: 'Digite sua senha',
  passwordTooShort: `Senha precisa ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
  passwordTooLong: `Senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`,
  resetLinkMissing: 'Abra o link que enviamos no seu email',
} as const;

type AuthMessage = {
  title: string;
  hint?: string;
};

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, AuthMessage> = {
  invalid_credentials: {
    title: 'Email ou senha incorretos',
    hint: 'Confira se é o mesmo email da compra. No primeiro acesso, use a senha temporária enviada por email.',
  },
  email_not_confirmed: {
    title: 'Confirme seu email primeiro',
    hint: 'Enviamos um link de confirmação pro seu email. Abra a mensagem e toque no botão. Se não encontrar, olhe no spam.',
  },
  rate_limited: {
    title: 'Aguarde 1 minuto pra tentar novamente',
    hint: 'É uma proteção da sua conta. Enquanto isso, confira se o email é o mesmo da compra.',
  },
  account_disabled: {
    title: 'Sua conta foi desativada. Entre em contato com o suporte.',
    hint: 'Isso acontece depois de um reembolso ou cancelamento. Se achar que é engano, fale com o suporte.',
  },
  session_expired: {
    title: 'Sessão inválida ou expirada. Faça login novamente.',
    hint: 'Por segurança, a sessão termina depois de um tempo sem uso.',
  },
  reset_link_invalid: {
    title: 'Esse link expirou ou já foi usado',
    hint: `Cada link vale por ${formatHours(RESET_LINK_TTL_HOURS)} e funciona uma vez só. Peça um novo.`,
  },
  verification_link_invalid: {
    title: 'Esse link de confirmação não vale mais',
    hint: 'Entre com seu email e sua senha. Se o email ainda não estiver confirmado, um link novo chega na hora.',
  },
  same_password: {
    title: 'Escolha uma senha diferente da temporária',
    hint: 'Crie uma senha só sua, diferente da que chegou por email.',
  },
  // Vale pra qualquer tela de acesso (login, primeiro acesso, redefinição): título neutro.
  unknown: {
    title: 'Não deu certo agora',
    hint: 'Pode ser sua internet. Tente de novo em alguns segundos.',
  },
};
