import { SHOPEE_CONNECT_PATH, SHOPEE_PATH } from '@/config/shopee';

/** A marca pronta não manda uma loja de fase posterior para uma tela que vai recusá-la. */
export function nextStepAfterBrand(phase: number) {
  if (phase === 3) {
    return {
      title: 'Próximo passo: sua conta na Shopee',
      text: 'Sua marca fica salva aqui para a publicação pela plataforma, que está em breve. Agora, abra sua conta de vendedora no site da Shopee e volte aqui para continuar.',
      href: SHOPEE_PATH,
      label: 'Abrir minha conta na Shopee',
    };
  }
  if (phase === 4) {
    return {
      title: 'Conexão com a Shopee em breve',
      text: 'Sua marca fica salva aqui. Você já tem conta na Shopee, mas a conexão e a publicação automática ainda estão em preparação.',
      href: SHOPEE_CONNECT_PATH,
      label: 'Ver como funciona a conexão',
    };
  }
  return {
    title: 'Sua marca está salva',
    text: 'Volte para a Loja Pronta para conferir a etapa atual da sua loja.',
    href: '/loja-pronta',
    label: 'Ver minha loja',
  };
}
