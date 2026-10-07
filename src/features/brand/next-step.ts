import { SHOPEE_BRAND_PATH, SHOPEE_PATH } from '@/config/shopee';

/** A marca pronta não manda uma loja de fase posterior para uma tela que vai recusá-la. */
export function nextStepAfterBrand(phase: number) {
  if (phase === 3) {
    return {
      title: 'Próximo passo: sua conta na Shopee',
      text: 'Abra sua conta de vendedora no site da Shopee e volte aqui para continuar. Depois, a gente mostra como colocar seu logo e seu texto na loja.',
      href: SHOPEE_PATH,
      label: 'Abrir minha conta na Shopee',
    };
  }
  if (phase === 4) {
    return {
      title: 'Próximo passo: sua marca na Shopee',
      text: 'Você já tem conta na Shopee. Coloque seu logo e seu texto na loja: a gente mostra como.',
      href: SHOPEE_BRAND_PATH,
      label: 'Colocar minha marca na Shopee',
    };
  }
  return {
    title: 'Sua marca está salva',
    text: 'Volte para a Loja Pronta para conferir a etapa atual da sua loja.',
    href: '/loja-pronta',
    label: 'Ver minha loja',
  };
}
