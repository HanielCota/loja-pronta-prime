import { RESET_LINK_TTL_HOURS, VERIFICATION_LINK_TTL_HOURS } from '@/config/auth';

export type AuthEmailKind = 'password-reset' | 'verification';

/** O mesmo prazo usado pelo servidor aparece no email, para não prometer um link mais longo. */
export function authEmailMessage(kind: AuthEmailKind, url: string) {
  const reset = kind === 'password-reset';
  const hours = reset ? RESET_LINK_TTL_HOURS : VERIFICATION_LINK_TTL_HOURS;
  const action = reset ? 'Criar ou trocar minha senha' : 'Confirmar meu email';

  return {
    subject: reset
      ? 'Crie ou troque sua senha — Loja Pronta Prime'
      : 'Confirme seu email — Loja Pronta Prime',
    text: [
      'Loja Pronta Prime',
      reset
        ? 'Abra o link abaixo para criar sua primeira senha ou trocar a senha atual.'
        : 'Abra o link abaixo para confirmar seu email e acessar sua conta.',
      `${action}:\n${url}`,
      `Este link vale por ${hours} ${hours === 1 ? 'hora' : 'horas'}.${reset ? ' Só pode ser usado uma vez.' : ''}`,
      'Se você não pediu este email, pode ignorar. Sua senha continua igual.',
    ].join('\n\n'),
  };
}
