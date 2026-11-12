import { RESET_LINK_TTL_HOURS, VERIFICATION_LINK_TTL_HOURS } from '@/config/auth';

export type AuthEmailKind = 'first-password' | 'password-reset' | 'verification';

/** O mesmo prazo usado pelo servidor aparece no email, para não prometer um link mais longo. */
export function authEmailMessage(kind: AuthEmailKind, url: string) {
  if (kind === 'first-password') {
    return {
      subject: 'Crie sua primeira senha — Escala Shop',
      text: [
        'Escala Shop',
        'Sua compra foi aprovada. Crie sua senha para entrar no Escala Shop com o email da compra.',
        `Criar minha senha:\n${url}`,
        `Este link vale por ${RESET_LINK_TTL_HOURS} ${RESET_LINK_TTL_HOURS === 1 ? 'hora' : 'horas'}. Só pode ser usado uma vez.`,
        'Se o link vencer, peça outro na tela de entrada. Se você não fez essa compra, pode ignorar este email.',
      ].join('\n\n'),
    };
  }

  const reset = kind === 'password-reset';
  const hours = reset ? RESET_LINK_TTL_HOURS : VERIFICATION_LINK_TTL_HOURS;
  const action = reset ? 'Criar ou trocar minha senha' : 'Confirmar meu email';

  return {
    subject: reset ? 'Crie ou troque sua senha — Escala Shop' : 'Confirme seu email — Escala Shop',
    text: [
      'Escala Shop',
      reset
        ? 'Abra o link abaixo para criar sua primeira senha ou trocar a senha atual.'
        : 'Abra o link abaixo para confirmar seu email e acessar sua conta.',
      `${action}:\n${url}`,
      `Este link vale por ${hours} ${hours === 1 ? 'hora' : 'horas'}.${reset ? ' Só pode ser usado uma vez.' : ''}`,
      'Se você não pediu este email, pode ignorar. Sua senha continua igual.',
    ].join('\n\n'),
  };
}
