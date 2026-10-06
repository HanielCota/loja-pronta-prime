import { greetingName } from '../names';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { SllCourseCard, SllStoresCard, SllToolsCard } from './sll-cards';
import { SllBannerCarousel } from '@/features/sll/components/sll-banner-carousel';
import type { SllCopy } from '@/features/sll/copy';

type SllAreaProps = {
  user: { name: string; email: string; preferredName?: string | null | undefined };
  /** Primeira vez nesta área: "Boas-vindas"; depois, "Oi". */
  firstVisit: boolean;
  /** Tem os dois produtos: o topo leva de volta pra escolha. */
  hasChoice: boolean;
  welcomeHref: string | null;
  methodHref: string | null;
  coursesHref: string | null;
  banners: Array<{
    id: string;
    label: string | null;
    title: string;
    description: string;
    buttonLabel: string;
    destination: string;
    imageAlt: string | null;
  }>;
  copy: SllCopy;
};

/**
 * Painel do SLL: avisos gerais no topo, situação individual e atalhos para o conteúdo.
 * Quem confere o acesso é a página (requireProduct).
 */
export function SllArea({
  user,
  firstVisit,
  hasChoice,
  welcomeHref,
  methodHref,
  coursesHref,
  banners,
  copy,
}: SllAreaProps) {
  const name = greetingName(user);
  const hasLessons = Boolean(welcomeHref || methodHref || coursesHref);
  return (
    <SllAreaShell
      account={user}
      hasChoice={hasChoice}
      product="Sistema Loja Lucrativa (SLL)"
      title={`${firstVisit ? 'Boas-vindas' : 'Olá'}${name ? `, ${name}` : ''}!`}
      intro={hasLessons ? copy.dashboardIntro : copy.dashboardEmptyIntro}
      // Sem banner, nada antes do título: o topo fica igual ao das outras áreas.
      beforeHeader={banners.length ? <SllBannerCarousel banners={banners} /> : undefined}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SllCourseCard
          welcomeHref={welcomeHref}
          methodHref={methodHref}
          coursesHref={coursesHref}
          copy={copy}
        />
        <SllToolsCard copy={copy} />
      </div>
      <SllStoresCard copy={copy} />
    </SllAreaShell>
  );
}
