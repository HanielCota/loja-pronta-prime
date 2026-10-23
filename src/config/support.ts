/**
 * WhatsApp do suporte, pra aluna tirar dúvidas enquanto espera uma fase abrir: só os dígitos, com
 * DDD e sem o 55 do país (ex.: '11987654321'). Vazio: o botão "Chamar no WhatsApp" não aparece.
 */
export const TEAM_WHATSAPP: string = '3192560307';

/** Email de contato sobre dados pessoais (LGPD), mostrado na Política de Privacidade. */
export const PRIVACY_EMAIL = 'suporte@lojaprontaprime.com.br';

/** Quem cuida dos dados das alunas: a empresa dona da Loja Pronta Prime. */
export const DATA_CONTROLLER = {
  name: 'Mentalidade Sem Limite Ltda (MSL)',
  cnpj: '46.419.797/0001-67',
  address: 'Alameda Rio Negro, 503, Sala 2020, Alphaville, Barueri (SP), CEP 06454-000',
} as const;
