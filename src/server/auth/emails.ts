type AuthEmail = {
  to: string;
  url: string;
};

/**
 * Emails de acesso. Ainda não existe provedor de email (será configurado pelo painel
 * administrativo; ver docs/INTEGRACAO-HOTMART.md).
 *
 * - Em desenvolvimento, o link aparece no terminal pra testar o fluxo; o email da aluna nunca.
 * - Em produção, avisa no log que o envio não está configurado, pra falha não passar em silêncio.
 */
function deliver(kind: string, { url }: AuthEmail): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[auth] link de ${kind} (só em dev): ${url}`);
  } else {
    console.warn(`[auth] email de ${kind} não enviado: provedor de email ainda não configurado.`);
  }
  return Promise.resolve();
}

export function sendPasswordResetEmail(email: AuthEmail): Promise<void> {
  return deliver('redefinição de senha', email);
}

export function sendVerificationEmail(email: AuthEmail): Promise<void> {
  return deliver('confirmação de email', email);
}
