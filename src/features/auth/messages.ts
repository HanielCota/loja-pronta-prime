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
    hint: 'Confira se é o mesmo email da compra. No primeiro acesso, a senha é a temporária que mandamos pra você.',
  },
  email_not_confirmed: {
    title: 'Confirme seu email primeiro',
    hint: 'Acabamos de mandar um link de confirmação pro seu email. Abra a mensagem e toque no botão. Não achou? Olha no spam.',
  },
  rate_limited: {
    title: 'Aguarde 1 minuto pra tentar novamente',
    hint: 'É uma proteção da sua conta. Enquanto isso, confira se o email é o mesmo da compra.',
  },
  account_disabled: {
    title: 'Sua conta foi desativada. Entre em contato com o suporte.',
    hint: 'Isso pode acontecer depois de um reembolso ou cancelamento. Se achar que é engano, o suporte te ajuda.',
  },
  session_expired: {
    title: 'Sessão inválida ou expirada. Faça login novamente.',
    hint: 'Por segurança, a gente desconecta depois de um tempo sem uso.',
  },
  reset_link_invalid: {
    title: 'Esse link expirou ou já foi usado',
    hint: `Cada link vale por ${formatHours(RESET_LINK_TTL_HOURS)} e funciona uma vez só. Pede um novo, é rapidinho.`,
  },
  unknown: {
    title: 'Não foi possível entrar',
    hint: 'Pode ser a sua internet. Tenta de novo em alguns segundos.',
  },
};
