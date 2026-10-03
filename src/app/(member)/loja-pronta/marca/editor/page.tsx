import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LogoEditor } from '@/features/brand/components/editor/logo-editor';
import { loadLogoFonts } from '@/features/brand/logo/fonts.server';
import { logoTemplates } from '@/features/brand/logo/config';
import { configToScene } from '@/features/brand/logo/from-config';
import { iconsForCategories } from '@/features/brand/logo/icons';
import { requireBrandStudio } from '@/features/brand/server/brand';
import {
  brandStepHeader,
  brandStepPath,
  canOpenBrandStep,
  LOGO_EDITOR_PATH,
  resumeBrandStep,
} from '@/features/brand/steps';
import { ConversationLayout } from '@/features/loja-pronta/components/conversation-layout';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Editor livre do logo, sua marca',
};

/**
 * O editor livre do logo: a mesma etapa do estúdio (passo 3), pra quem quer mexer em cada parte
 * (mover, mudar o tamanho, girar, camadas). Abre a cena salva ou, na primeira vez, o logo do
 * estúdio guiado convertido. Funciona no computador e no celular.
 */
export default async function LogoEditorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const { student, answers, brand, revising } = await requireBrandStudio(LOGO_EDITOR_PATH);
  if (!brand.logo || !canOpenBrandStep('ajustar', brand)) {
    redirect(brandStepPath(resumeBrandStep(brand)));
  }
  const editing = revising || getParam(query.editar) === '1';
  const name = brand.name ?? '';
  const scene = brand.logoScene ?? configToScene(brand.logo, name, await loadLogoFonts());
  const categories = Array.isArray(answers.categorias) ? answers.categorias : [];
  const easyHref = `${brandStepPath('ajustar')}${editing ? '?editar=1' : ''}`;

  return (
    <ConversationLayout
      account={student.session.user}
      header={brandStepHeader('ajustar', true)}
      savedLabel="Escolhas salvas"
      backHref={easyHref}
      width="editor"
    >
      {/* Título curto: o espaço da tela é do quadro (o "Tudo salvo" da barra diz que nada se perde). */}
      <h1 className="-mb-2 text-xl font-semibold text-balance">Editor livre do logo</h1>
      <div>
        <LogoEditor
          initialScene={scene}
          initialVariations={brand.logoVariations}
          name={name}
          editing={editing}
          easyHref={easyHref}
          recommended={iconsForCategories(categories)}
          templates={logoTemplates(answers)}
        />
      </div>
    </ConversationLayout>
  );
}
