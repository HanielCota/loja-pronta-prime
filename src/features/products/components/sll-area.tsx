import { greetingName } from '../names';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { SllNextStepCard } from './sll-cards';
import { SllStoreRow, SllToolShortcuts } from './sll-dashboard-shortcuts';
import type { SllStoreSummary } from '@/features/sll/store-overview';
import { SllBannerCarousel } from '@/features/sll/components/sll-banner-carousel';
import type { SllCopy } from '@/features/sll/copy';
import type { SllWelcomeProgress } from '@/features/sll/dashboard-next-step';

type SllAreaProps = {
  user: { name: string; email: string; preferredName?: string | null | undefined };
  /** Primeira visita nesta área: "Boas-vindas"; depois, "Oi". */
  firstVisit: boolean;
  /** Tem os dois produtos: o topo leva de volta pra escolha. */
  hasChoice: boolean;
  welcomeHref: string | null;
  methodHref: string | null;
  coursesHref: string | null;
  /** Aulas assistidas das boas-vindas, pra barra do destaque. */
  welcomeProgress: SllWelcomeProgress | null;
  /** Montagem e conexão da loja, a mesma leitura de Minhas Lojas. */
  storeSummary: SllStoreSummary;
  hasLojaPronta: boolean;
  /** Ferramentas publicadas, pros atalhos (só as que têm endereço viram link). */
  resources: Array<{
    id: string;
    slug: string;
    groupKey: string;
    title: string;
    href: string | null;
  }>;
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

/** Painel do SLL: o próximo passo em destaque e, abaixo, os atalhos sem disputar com ele. */
export function SllArea({
  user,
  firstVisit,
  hasChoice,
  welcomeHref,
  methodHref,
  coursesHref,
  welcomeProgress,
  storeSummary,
  hasLojaPronta,
  resources,
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
      beforeHeader={banners.length ? <SllBannerCarousel banners={banners} /> : undefined}
    >
      <SllNextStepCard
        welcomeHref={welcomeHref}
        methodHref={methodHref}
        coursesHref={coursesHref}
        welcomeProgress={welcomeProgress}
        copy={copy}
      />
      <SllStoreRow summary={storeSummary} hasLojaPronta={hasLojaPronta} />
      <SllToolShortcuts resources={resources} />
    </SllAreaShell>
  );
}
