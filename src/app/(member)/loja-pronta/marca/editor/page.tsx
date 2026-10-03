import { MonitorIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
 * estúdio guiado convertido. No celular, por enquanto, ele leva de volta pro Modo fácil.
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
      {/* O editor precisa de espaço pros painéis: no celular, por enquanto, o Modo fácil. */}
      <div className="hidden lg:block">
        <LogoEditor
          initialScene={scene}
          name={name}
          editing={editing}
          easyHref={easyHref}
          recommended={iconsForCategories(categories)}
          templates={logoTemplates(answers)}
        />
      </div>
      <div className="flex flex-col items-start gap-4 rounded-card bg-card p-6 shadow-card lg:hidden">
        <MonitorIcon aria-hidden="true" className="size-8 text-link" />
        <p className="text-body text-pretty">
          O editor livre funciona no computador, com a tela maior. No celular, use o Modo fácil: dá
          pra mudar a cor, o desenho, a letra, o formato e o fundo.
        </p>
        <Button asChild>
          <Link href={easyHref}>Voltar pro Modo fácil</Link>
        </Button>
      </div>
    </ConversationLayout>
  );
}
