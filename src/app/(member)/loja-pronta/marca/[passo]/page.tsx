import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { BrandReview } from '@/features/brand/components/brand-review';
import { DescriptionStep } from '@/features/brand/components/description-step';
import { LogoEditor } from '@/features/brand/components/editor/logo-editor';
import { NameStep } from '@/features/brand/components/name-step';
import { logoIdeas, logoTemplates } from '@/features/brand/logo/config';
import { loadLogoFonts } from '@/features/brand/logo/fonts.server';
import { configToScene } from '@/features/brand/logo/from-config';
import { iconsForCategories } from '@/features/brand/logo/icons';
import { savedLogoSrc } from '@/features/brand/logo-preview';
import { requireBrandStudio } from '@/features/brand/server/brand';
import {
  brandStepPath,
  brandStepHeader,
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
 * Um passo da marca: nome, o editor do logo, descrição ou revisão. Ela pode voltar aos
 * passos feitos, mas não pular os que faltam. Com "?editar=1" (vindo da revisão), salvar volta
 * pra revisão.
 */
export default async function BrandStepPage({ params, searchParams }: PageProps) {
  const [{ passo }, query] = await Promise.all([params, searchParams]);
  // O passo de escolher um modelo saiu (os formatos estão no editor): links antigos vão pro logo.
  if (passo === 'modelo') redirect(brandStepPath('ajustar'));
  if (!isBrandStep(passo)) notFound();

  const { student, answers, brand, revising } = await requireBrandStudio(brandStepPath(passo));
  if (!canOpenBrandStep(passo, brand)) redirect(brandStepPath(resumeBrandStep(brand)));
  // Revendo a marca confirmada, todo passo é edição: salvar volta pra revisão.
  const editing = passo !== 'revisao' && (revising || getParam(query.editar) === '1');
  const templates = logoTemplates(answers);
  const categories = Array.isArray(answers.categorias) ? answers.categorias : [];

  return (
    <ConversationLayout
      account={student.session.user}
      header={brandStepHeader(passo)}
      width={passo === 'ajustar' ? 'editor' : 'normal'}
      backHref={
        editing ? brandStepPath('revisao') : revising ? '/loja-pronta' : previousBrandPath(passo)
      }
    >
      {passo === 'nome' ? (
        <NameStep
          answers={answers}
          studentName={student.session.user.name}
          saved={brand.name}
          editing={editing}
        />
      ) : null}
      {passo === 'ajustar' ? (
        <>
          {/* Título curto: o espaço da tela é do quadro. */}
          <h1 className="-mb-2 text-xl font-semibold text-balance">Deixe o logo do seu jeito</h1>
          <div>
            <LogoEditor
              // A cena salva ou, na primeira vez, o primeiro modelo virado cena.
              initialScene={
                brand.logoScene ??
                configToScene(brand.logo ?? templates[0]!, brand.name ?? '', await loadLogoFonts())
              }
              initialVariations={brand.logoVariations}
              name={brand.name ?? ''}
              editing={editing}
              recommended={iconsForCategories(categories)}
              templates={templates}
              ideas={logoIdeas(answers)}
            />
          </div>
        </>
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
        <BrandReview
          name={brand.name}
          logoSrc={savedLogoSrc({ ...brand, logo: brand.logo })}
          description={brand.description}
          revising={revising}
        />
      ) : null}
    </ConversationLayout>
  );
}
