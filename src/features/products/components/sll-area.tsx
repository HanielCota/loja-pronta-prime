import { greetingName } from '../names';
import { AreaShell, greeting } from '@/features/member/components/area-shell';
import { SllCourseCard, SllStoresCard, SllToolsCard } from './sll-cards';
import { SllBannerCarousel } from '@/features/sll/components/sll-banner-carousel';

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
};

/**
 * Área do SLL, no mesmo formato da Loja Pronta: onde ela está no curso, o caminho dele e as
 * ferramentas ao lado. Quem confere o acesso é a página (requireProduct).
 */
export function SllArea({
  user,
  firstVisit,
  hasChoice,
  welcomeHref,
  methodHref,
  coursesHref,
  banners,
}: SllAreaProps) {
  const open = Boolean(welcomeHref || methodHref || coursesHref);
  return (
    <AreaShell
      account={user}
      hasChoice={hasChoice}
      area="sll"
      product="Sistema Loja Lucrativa (SLL)"
      // Sem nenhuma trilha publicada, o título diz que as aulas ainda vão abrir, sem mandar
      // ela "começar" algo fechado.
      title={open ? 'Seu curso' : 'As aulas abrem em breve'}
      intro={greeting(
        greetingName(user),
        firstVisit,
        open
          ? 'Comece pela trilha de boas-vindas. Depois, siga as etapas do método.'
          : 'O curso começa pela trilha de boas-vindas. Você recebe um aviso quando ela abrir.',
      )}
    >
      <SllBannerCarousel banners={banners} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SllCourseCard
          welcomeHref={welcomeHref}
          methodHref={methodHref}
          coursesHref={coursesHref}
        />
        <SllToolsCard />
      </div>
      <SllStoresCard />
    </AreaShell>
  );
}
