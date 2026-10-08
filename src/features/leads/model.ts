import { z } from 'zod';
import { parseWhatsapp } from '@/features/loja-pronta/whatsapp';

export const LEAD_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const;
export const LEAD_PRODUCTS = ['undecided', 'loja-pronta', 'sll', 'both'] as const;
export const stageLabels: Record<(typeof LEAD_STAGES)[number], string> = {
  new: 'Novo',
  contacted: 'Em contato',
  qualified: 'Interessado',
  proposal: 'Oferta enviada',
  won: 'Venda concluída',
  lost: 'Sem interesse',
};
export const interestLabels: Record<(typeof LEAD_PRODUCTS)[number], string> = {
  undecided: 'Ainda não sabe',
  'loja-pronta': 'Loja Pronta',
  sll: 'Curso SLL',
  both: 'Os dois',
};

export const leadSchema = z
  .object({
    name: z.string().trim().min(2, 'Escreva o nome com pelo menos 2 letras.').max(120),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .refine((value) => !value || z.email().safeParse(value).success, 'Confira o email.'),
    phone: z
      .string()
      .trim()
      .max(40)
      .refine(
        (value) => !value || Boolean(parseWhatsapp(value)),
        'Use um celular brasileiro com DDD.',
      )
      .transform((value) => (value ? parseWhatsapp(value)! : '')),
    stage: z.enum(LEAD_STAGES),
    product: z.enum(LEAD_PRODUCTS),
    source: z.string().trim().min(1, 'Informe de onde veio o contato.').max(100),
    ownerId: z.string().max(100),
    nextContact: z
      .string()
      .refine(
        (value) =>
          !value ||
          (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(Date.parse(value)) &&
            new Date(value).toISOString().slice(0, 10) === value),
        'Escolha uma data válida.',
      ),
    tags: z.string().trim().max(250),
    lostReason: z.string().trim().max(500),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.phone)
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'Informe um email ou WhatsApp para poder retomar o contato.',
      });
    if (value.stage === 'lost' && !value.lostReason)
      ctx.addIssue({
        code: 'custom',
        path: ['lostReason'],
        message: 'Conte por que o contato não seguiu.',
      });
  });

export type LeadInput = z.infer<typeof leadSchema>;
export type LeadValues = Record<keyof LeadInput, string>;
export const EMPTY_LEAD: LeadValues = {
  name: '',
  email: '',
  phone: '',
  stage: 'new',
  product: 'undecided',
  source: 'Cadastro manual',
  ownerId: '',
  nextContact: '',
  tags: '',
  lostReason: '',
};
export const LEAD_FIELDS = Object.keys(EMPTY_LEAD) as (keyof LeadInput)[];

/** A data do retorno segue o dia da operação no Brasil, inclusive perto da meia-noite UTC. */
export function todayInBrazil(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function leadTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

/** Encerrar uma conversa também encerra seu lembrete, sem manter um retorno já resolvido. */
export function leadRecord(input: LeadInput) {
  return {
    ...input,
    email: input.email || null,
    phone: input.phone || null,
    ownerId: input.ownerId || null,
    nextContact: ['won', 'lost'].includes(input.stage) ? null : input.nextContact || null,
    tags: leadTags(input.tags),
    lostReason: input.stage === 'lost' ? input.lostReason : null,
  };
}

export type LeadFilters = {
  q: string;
  stage: string;
  product: string;
  source: string;
  owner: string;
  due: boolean;
  archived: boolean;
  page: number;
};
export function parseLeadFilters(params: URLSearchParams): LeadFilters {
  return {
    q: (params.get('q') ?? '').trim().slice(0, 120),
    stage: LEAD_STAGES.find((stage) => stage === params.get('etapa')) ?? '',
    product: LEAD_PRODUCTS.find((product) => product === params.get('produto')) ?? '',
    source: (params.get('origem') ?? '').slice(0, 100),
    owner: (params.get('responsavel') ?? '').slice(0, 100),
    due: params.get('retornos') === 'hoje',
    archived: params.get('arquivados') === 'sim',
    page: Math.min(100000, Math.max(1, Number.parseInt(params.get('pagina') ?? '', 10) || 1)),
  };
}
