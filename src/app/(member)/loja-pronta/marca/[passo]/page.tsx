import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { BrandReview } from '@/features/brand/components/brand-review';
import { DescriptionStep } from '@/features/brand/components/description-step';
import { LogoStudio } from '@/features/brand/components/logo-studio';
import { NameStep } from '@/features/brand/components/name-step';
import { TemplateStep } from '@/features/brand/components/template-step';
import { logoTemplates } from '@/features/brand/logo/config';
import { requireBrandStudio } from '@/features/brand/server/brand';
import {
  brandStepPath,
  brandStepProgress,
  brandStepTitle,
  canOpenBrandStep,
  isBrandStep,
  previousBrandPath,
  resumeBrandStep,
} from '@/features/brand/steps';
import { ConversationLayout } from '@/features/loja-pronta/components/conversation-layout';
import { getParam, type SearchParams } from '@/lib/search-params';

type PageProps = { params: Promise<{ passo: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { passo } = await params;
  return { title: isBrandStep(passo) ? `${brandStepTitle(passo)}, sua marca` : 'Sua marca' };
}

/**
 * Um passo da marca: nome, modelo do logo, estúdio, descrição ou revisão. Ela pode voltar aos
 * passos feitos, mas não pular os que faltam. Com "?editar=1" (vindo da revisão), salvar volta
 * pra revisão.
 */
export default async function BrandStepPage({ params, searchParams }: PageProps) {
  const [{ passo }, query] = await Promise.all([params, searchParams]);
  if (!isBrandStep(passo)) notFound();

  const { student, answers, brand } = await requireBrandStudio(brandStepPath(passo));
  if (!canOpenBrandStep(passo, brand)) redirect(brandStepPath(resumeBrandStep(brand)));
  const editing = passo !== 'revisao' && getParam(query.editar) === '1';
  const { label, progress } = brandStepProgress(passo);
  const templates = logoTemplates(answers);

  return (
    <ConversationLayout
      section="Sua marca"
      stepLabel={label}
      progress={progress}
      backHref={editing ? brandStepPath('revisao') : previousBrandPath(passo)}
    >
      {passo === 'nome' ? (
        <NameStep
          answers={answers}
          studentName={student.session.user.name}
          saved={brand.name}
          editing={editing}
        />
      ) : null}
      {passo === 'modelo' ? (
        <TemplateStep answers={answers} saved={brand.logo} editing={editing} />
      ) : null}
      {passo === 'ajustar' && brand.logo ? (
        <LogoStudio
          initial={brand.logo}
          base={templates[brand.logo.template] ?? brand.logo}
          editing={editing}
        />
      ) : null}
      {passo === 'descricao' && brand.name ? (
        <DescriptionStep
          answers={answers}
          storeName={brand.name}
          saved={brand.description}
          editing={editing}
        />
      ) : null}
      {passo === 'revisao' && brand.name && brand.logo && brand.description ? (
        <BrandReview name={brand.name} logo={brand.logo} description={brand.description} />
      ) : null}
    </ConversationLayout>
  );
}
