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
  currentPasswordRequired: 'Digite sua senha atual',
  nameRequired: 'Digite seu nome',
  nameTooLong: 'Use no máximo 30 letras',
  resetLinkMissing: 'Abra o link que enviamos no seu email',
} as const;

type AuthMessage = {
  title: string;
  hint?: string;
};

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, AuthMessage> = {
  invalid_credentials: {
    title: 'Email ou senha incorretos',
    hint: 'Confira o email usado na compra e a senha que você recebeu para acessar. Se já trocou a senha, use a nova ou redefina abaixo.',
  },
  email_not_confirmed: {
    title: 'Confirme seu email primeiro',
    hint: 'Enviamos um link de confirmação pro seu email. Abra a mensagem e toque no botão. Se não encontrar, olhe no spam.',
  },
  rate_limited: {
    title: 'Aguarde 1 minuto pra tentar novamente',
    hint: 'É uma proteção da sua conta. Enquanto isso, confira se o email é o mesmo da compra.',
  },
  // Os links pedidos hoje (mesmo os que outra pessoa pediu) chegaram no email dela e ainda valem.
  recover_daily_limit: {
    title: 'Já enviamos vários links hoje',
    hint: 'Abra o mais recente no seu email (olhe também no spam). Se nenhum chegou, fale com o suporte.',
  },
  account_disabled: {
    title: 'Sua conta foi desativada',
    hint: 'Consulte sua compra na Hotmart e os contatos do produtor. Se achar que houve um engano, peça ajuda por lá.',
  },
  session_expired: {
    title: 'Sessão inválida ou expirada. Faça login novamente.',
    hint: 'Entre novamente com seu email e senha para continuar de onde parou.',
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
  // Outra aba (ou outro envio) criou a senha antes: a que ela digitou agora não foi salva.
  first_password_already_set: {
    title: 'Sua senha já foi criada',
    hint: 'Você criou uma senha há pouco, talvez em outra aba. Use aquela pra entrar. Se não lembrar, saia e toque em "Esqueceu a senha?".',
  },
  wrong_current_password: {
    title: 'A senha atual não confere',
    hint: 'Digite a senha que você usa pra entrar. Se não lembrar, saia da conta e use "Esqueceu a senha?" no login.',
  },
  unchanged_password: {
    title: 'A senha nova é igual à atual',
    hint: 'Escolha uma senha diferente da que você usa hoje.',
  },
  // Vale pra qualquer tela de acesso (login, primeiro acesso, redefinição): título neutro.
  unknown: {
    title: 'Não deu certo agora',
    hint: 'Pode ser sua internet. Tente de novo em alguns segundos.',
  },
};
