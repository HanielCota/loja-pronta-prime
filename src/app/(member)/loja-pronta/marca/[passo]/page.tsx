import { brandFingerprint } from '@/features/brand/server/fingerprint';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { BrandReview } from '@/features/brand/components/brand-review';
import { DescriptionStep } from '@/features/brand/components/description-step';
import { NameStep } from '@/features/brand/components/name-step';
import { LogoStep } from '@/features/brand/logo-studio/components/logo-step';
import { requireBrandStudio } from '@/features/brand/server/brand';
import {
  brandLogoSrc,
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

/** Criar o logo chama a IA de imagem (uns 15 s, até 2 min): o servidor espera por ela. */
export const maxDuration = 150;

type PageProps = { params: Promise<{ passo: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { passo } = await params;
  return { title: isBrandStep(passo) ? `${brandStepTitle(passo)}, sua marca` : 'Sua marca' };
}

/** Endereços dos passos antigos do logo (estúdio, modelos, editor): hoje, o estúdio do logo. */
const OLD_LOGO_STEPS = new Set(['ajustar', 'modelo', 'editor']);

/**
 * Um passo da marca: nome, o estúdio do logo, descrição ou revisão. Ela pode voltar aos
 * passos feitos, mas não pular os que faltam. Com "?editar=1" (vindo da revisão), salvar volta
 * pra revisão.
 */
export default async function BrandStepPage({ params, searchParams }: PageProps) {
  const [{ passo }, query] = await Promise.all([params, searchParams]);
  if (OLD_LOGO_STEPS.has(passo)) redirect(brandStepPath('logo'));
  if (!isBrandStep(passo)) notFound();

  const { student, answers, conversationName, brand, revising } = await requireBrandStudio(
    brandStepPath(passo),
  );
  if (!canOpenBrandStep(passo, brand)) redirect(brandStepPath(resumeBrandStep(brand)));
  // Revendo a marca confirmada, todo passo é edição: salvar volta pra revisão.
  const editing = passo !== 'revisao' && (revising || getParam(query.editar) === '1');

  return (
    <ConversationLayout
      account={student.session.user}
      header={brandStepHeader(passo)}
      wide={passo === 'logo'}
      backHref={
        // Sem logo ainda (marca antiga, ou rever com o logo pendente), a revisão mandaria de volta
        // pra cá: o "Voltar" vai pro painel.
        revising && !brand.logoImage
          ? '/loja-pronta'
          : editing
            ? brandStepPath('revisao')
            : revising
              ? '/loja-pronta'
              : previousBrandPath(passo)
      }
    >
      {passo === 'nome' ? (
        <NameStep
          answers={answers}
          conversationName={conversationName}
          studentName={student.session.user.name}
          saved={brand.name}
          editing={editing}
        />
      ) : null}
      {passo === 'logo' && brand.name ? (
        <LogoStep
          userId={student.session.user.id}
          storeName={brand.name}
          answers={answers}
          oldName={editing ? getParam(query.antigo)?.slice(0, 60) : undefined}
          editing={editing}
        />
      ) : null}
      {passo === 'descricao' && brand.name ? (
        <DescriptionStep
          answers={answers}
          storeName={brand.name}
          logoSrc={brand.logoImage ? brandLogoSrc(brand) : undefined}
          saved={brand.description}
          editing={editing}
        />
      ) : null}
      {passo === 'revisao' && brand.name && brand.logoImage && brand.description ? (
        <BrandReview
          name={brand.name}
          logoSrc={brandLogoSrc(brand)}
          description={brand.description}
          revising={revising}
          fingerprint={brandFingerprint(brand)}
        />
      ) : null}
    </ConversationLayout>
  );
}
