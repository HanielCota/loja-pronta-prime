import type { ProductId } from '@/config/products';

/**
 * Onde ela está num produto, no cartão da escolha de área: a etapa ("Etapa 2 de 3"), o nome dela,
 * a barra de etapas (quando há) e o que acontece agora. Com `detail`, o cartão troca o resumo do
 * produto por ele: quem já comprou precisa saber o que vem a seguir, não o que o produto é.
 */
export type ProductStatus = {
  /** Linha pequena acima ("Etapa 1 de 3"). */
  caption?: string | undefined;
  label: string;
  bar?: { step: number; total: number } | undefined;
  detail?: string | undefined;
  /** Texto do botão no lugar de "Entrar"/"Continuar", quando a área ainda não tem o que fazer. */
  cta?: string | undefined;
  /** Ação secundária dentro do cartão, sem alterar o destino de continuar. */
  secondaryAction?: { href: string; label: string } | undefined;
};

/**
 * As aulas e ferramentas publicadas já podem ser abertas pela aluna.
 */
export const SLL_CHOOSER_STATUS: ProductStatus = {
  label: 'Suas aulas e ferramentas estão disponíveis',
  cta: 'Acessar o SLL',
};

type HeadlineInput = {
  /** Situação da Loja Pronta, quando ela tem o produto. */
  store?: { waitsOnStudent: boolean } | undefined;
  lastArea?: ProductId | undefined;
  hasSllAccess?: boolean | undefined;
};

/**
 * Qual produto leva o botão cheio e o texto de cima da escolha de área.
 * - Loja Pronta esperando por ela: vem antes de tudo, e o texto aponta pra ela.
 * - Loja numa fase que ainda não abriu: a aluna pode conferir a loja ou estudar no SLL.
 * - Sem loja: continua de onde parou, ou escolhe por onde começar.
 */
export function chooserHeadline({ store, lastArea, hasSllAccess }: HeadlineInput): {
  primary?: ProductId | undefined;
  description: string;
} {
  if (store?.waitsOnStudent) {
    return { primary: 'loja-pronta', description: 'Sua loja está esperando por você.' };
  }
  if (store) {
    return {
      description: hasSllAccess
        ? 'A próxima fase da sua loja está em preparação. Você pode acessar as aulas do SLL.'
        : 'A próxima fase da sua loja está em preparação. Você pode rever o que já concluiu.',
    };
  }
  return { description: lastArea ? 'Continue de onde parou.' : 'Escolha por onde começar.' };
}
