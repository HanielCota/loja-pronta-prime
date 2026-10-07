/** Importa somente ferramentas e destinos registrados no inventário da área antiga. */
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { learningLessons, learningResourceLessons, learningResources } from '@/server/db/schema';

const items = [
  {
    slug: 'calculadora-preco-shopee',
    groupKey: 'calculadora',
    groupTitle: 'Calculadora de preço',
    title: 'Calculadora de preço Shopee',
    description: 'Mostra o preço de cadastro depois que as taxas e os custos forem confirmados.',
    buttonLabel: 'Abrir calculadora',
    destination: '/sll/recursos/calculadora-shopee',
    position: 0,
    status: 'published' as const,
  },
  {
    slug: 'mentora-pri',
    groupKey: 'assistentes',
    groupTitle: 'Assistentes no ChatGPT',
    title: 'Mentora Pri',
    description:
      'Ajuda a tirar dúvidas sobre sua loja e a encontrar aulas relacionadas no ChatGPT.',
    buttonLabel: 'Conversar com a Pri',
    destination:
      'https://chatgpt.com/g/g-6a21eb8f921c819192b57ce24cd11c63-sll-mentora-pri-sua-pri-24-7',
    position: 0,
    status: 'published' as const,
  },
  {
    slug: 'artista-de-loja',
    groupKey: 'assistentes',
    groupTitle: 'Assistentes no ChatGPT',
    title: 'Artista de Loja',
    description: 'Ajuda a criar uma sugestão de logo e descrição da loja no ChatGPT.',
    buttonLabel: 'Criar logo e descrição',
    destination:
      'https://chatgpt.com/g/g-6a21dc4f4d7c819196e2589bbd751976-sll-logo-e-descricao-da-sua-loja-shopee',
    position: 1,
    status: 'published' as const,
  },
  {
    slug: 'fotografo-profissional',
    groupKey: 'assistentes',
    groupTitle: 'Assistentes no ChatGPT',
    title: 'Fotógrafo Profissional',
    description: 'Ajuda a criar fotos de produto para a vitrine no ChatGPT.',
    buttonLabel: 'Criar fotos do produto',
    destination: 'https://chatgpt.com/g/g-6a21e2daeab4819195332cc14028f537-sll-fotos-de-produto',
    position: 2,
    status: 'published' as const,
  },
  {
    slug: 'anuncio-lucrativo',
    groupKey: 'assistentes',
    groupTitle: 'Assistentes no ChatGPT',
    title: 'Anúncio Lucrativo',
    description: 'Ajuda a montar título, descrição e preço de um anúncio no ChatGPT.',
    buttonLabel: 'Montar meu anúncio',
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
      'Parceiro externo de fornecedores para sua loja na Shopee. O destino está em preparação.',
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
    description: 'Página externa com os planos do ChatGPT. A assinatura não está incluída no SLL.',
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
      'Serviço externo para gestão pós-venda, notas fiscais e estoque. Confira as condições no site.',
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
    // Uma nova importação não pode sobrescrever uma edição feita pela administração.
    await tx.insert(learningResources).values(item).onConflictDoNothing();
  }
  const [photographer] = await tx
    .select({ id: learningResources.id })
    .from(learningResources)
    .where(eq(learningResources.slug, 'fotografo-profissional'))
    .limit(1);
  const [lesson33] = await tx
    .select({ id: learningLessons.id })
    .from(learningLessons)
    .where(
      and(eq(learningLessons.sourceNumber, 33), eq(learningLessons.slug, 'videos-shopee-videos')),
    )
    .limit(1);
  if (!photographer || !lesson33)
    throw new Error(
      'Importe a Biblioteca de Conhecimento antes dos recursos para ligar o Fotógrafo Profissional à aula 33.',
    );
  await tx
    .insert(learningResourceLessons)
    .values({ resourceId: photographer.id, lessonId: lesson33.id })
    .onConflictDoNothing();
});
console.info(
  'Recursos conferidos importados. O Fotógrafo Profissional foi ligado à aula 33. As calculadoras são publicadas pela importação de ferramentas; o Envio Velox continua em preparação.',
);
process.exit(0);
