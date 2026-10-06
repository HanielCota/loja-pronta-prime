/** Importa somente ferramentas e destinos registrados no inventário da área antiga. */
import { db } from '@/server/db';
import { learningResources } from '@/server/db/schema';

const items = [
  {
    slug: 'calculadora-preco-shopee',
    groupKey: 'calculadora',
    groupTitle: 'Calculadora de preço',
    title: 'Calculadora de preço Shopee',
    description: 'Pra entrar sem prejuízo ou pra lucrar o quanto você escolher.',
    buttonLabel: 'Abrir calculadora',
    destination: null,
    position: 0,
    status: 'published' as const,
  },
  {
    slug: 'mentora-pri',
    groupKey: 'assistentes',
    groupTitle: 'GPTs personalizados SLL',
    title: 'Mentora Pri (Atendimento 24 horas)',
    description: 'Tua mentora 24/7: tira dúvidas, entrega diagnósticos e recomenda aulas.',
    buttonLabel: 'Abrir GPT',
    destination:
      'https://chatgpt.com/g/g-6a21eb8f921c819192b57ce24cd11c63-sll-mentora-pri-sua-pri-24-7',
    position: 0,
    status: 'published' as const,
  },
  {
    slug: 'artista-de-loja',
    groupKey: 'assistentes',
    groupTitle: 'GPTs personalizados SLL',
    title: 'Artista de Loja',
    description: 'Logo em 5 minutos: cria logo estratégica e descrição da loja.',
    buttonLabel: 'Abrir GPT',
    destination:
      'https://chatgpt.com/g/g-6a21dc4f4d7c819196e2589bbd751976-sll-logo-e-descricao-da-sua-loja-shopee',
    position: 1,
    status: 'published' as const,
  },
  {
    slug: 'fotografo-profissional',
    groupKey: 'assistentes',
    groupTitle: 'GPTs personalizados SLL',
    title: 'Fotógrafo Profissional',
    description: 'Gera fotos profissionais de produto para a vitrine.',
    buttonLabel: 'Abrir GPT',
    destination: 'https://chatgpt.com/g/g-6a21e2daeab4819195332cc14028f537-sll-fotos-de-produto',
    position: 2,
    status: 'published' as const,
  },
  {
    slug: 'anuncio-lucrativo',
    groupKey: 'assistentes',
    groupTitle: 'GPTs personalizados SLL',
    title: 'Anúncio Lucrativo',
    description: 'Título, descrição e preço para montar o anúncio.',
    buttonLabel: 'Abrir GPT',
    destination:
      'https://chatgpt.com/g/g-6a21e670d4bc8191b44e19a496bac040-sll-anuncio-pronto-titulo-descricao-e-preco',
    position: 3,
    status: 'published' as const,
  },
  {
    slug: 'envio-velox',
    groupKey: 'parceiros',
    groupTitle: 'Parceiros recomendados',
    title: 'Envio Velox',
    description:
      'Fornecedores curados para dropshipping Shopee. O endereço visto no site antigo não abriu.',
    buttonLabel: null,
    destination: null,
    position: 0,
    status: 'published' as const,
  },
  {
    slug: 'chatgpt-plus',
    groupKey: 'parceiros',
    groupTitle: 'Parceiros recomendados',
    title: 'ChatGPT Plus',
    description: 'Plano pago apresentado como forma de potencializar os GPTs do SLL.',
    buttonLabel: 'Saber mais sobre ChatGPT Plus',
    destination: 'https://chatgpt.com/pt-BR/pricing/',
    position: 1,
    status: 'published' as const,
  },
  {
    slug: 'bling',
    groupKey: 'parceiros',
    groupTitle: 'Parceiros recomendados',
    title: 'Bling',
    description:
      'Gestão pós-venda e nota fiscal automática, com integração com Shopee e controle de estoque.',
    buttonLabel: 'Saber mais sobre Bling',
    destination: 'https://www.bling.com.br/',
    position: 2,
    status: 'published' as const,
  },
] as const;

if (process.env.NODE_ENV === 'production')
  throw new Error('Importação permitida apenas no desenvolvimento.');

await db.transaction(async (tx) => {
  for (const item of items) {
    await tx.insert(learningResources).values(item).onConflictDoNothing();
  }
});
console.info(
  'Recursos conferidos importados. A calculadora e o parceiro sem destino não têm botão funcional.',
);
process.exit(0);
