import type { ProductId } from '@/config/products';

/**
 * Onde ela está num produto, no cartão da escolha de área: a etapa ("Fase 3 de 7"), o nome dela,
 * a barra de etapas (quando há) e o que acontece agora. Com `detail`, o cartão troca o resumo do
 * produto por ele: quem já comprou precisa saber o que vem a seguir, não o que o produto é.
 */
export type ProductStatus = {
  /** Linha pequena acima ("Fase 1 de 7"). */
  caption?: string | undefined;
  label: string;
  bar?: { step: number; total: number } | undefined;
  detail?: string | undefined;
  /** Texto do botão no lugar de "Entrar"/"Continuar", quando a área ainda não tem o que fazer. */
  cta?: string | undefined;
};

/**
 * O SLL ainda não tem aulas no ar: o cartão diz isso, e o botão promete só o que a área mostra
 * (o que vem aí), em vez de mandar ela entrar.
 */
export const SLL_CHOOSER_STATUS: ProductStatus = {
  label: 'As aulas abrem em breve',
  cta: 'Ver o que vem aí',
};

type HeadlineInput = {
  /** Situação da Loja Pronta, quando ela tem o produto. */
  store?: { waitsOnStudent: boolean } | undefined;
  lastArea?: ProductId | undefined;
};

/**
 * Qual produto leva o botão cheio e o texto de cima da escolha de área.
 * - Loja Pronta esperando por ela: vem antes de tudo, e o texto aponta pra ela.
 * - Loja nas mãos da equipe: nenhum botão "manda" pra lá (nem pro curso, que ainda não abriu), e o
 *   texto avisa que a equipe chama no WhatsApp.
 * - Sem loja: continua de onde parou, ou escolhe por onde começar.
 */
export function chooserHeadline({ store, lastArea }: HeadlineInput): {
  primary?: ProductId | undefined;
  description: string;
} {
  if (store?.waitsOnStudent) {
    return { primary: 'loja-pronta', description: 'Sua loja está esperando por você.' };
  }
  if (store) {
    return {
      description:
        'Sua loja está com a equipe. Você recebe um aviso no WhatsApp quando for sua vez.',
    };
  }
  return { description: lastArea ? 'Continue de onde parou.' : 'Escolha por onde começar.' };
}
