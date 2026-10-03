import { firstName } from '../names';
import { AreaShell, greeting } from '@/features/member/components/area-shell';
import { SllCourseCard, SllToolsCard } from './sll-cards';

type SllAreaProps = {
  user: { name: string; email: string };
  /** Primeira vez nesta área: "Boas-vindas"; depois, "Oi". */
  firstVisit: boolean;
  /** Tem os dois produtos: o topo leva de volta pra escolha. */
  hasChoice: boolean;
};

/**
 * Área do SLL, no mesmo formato da Loja Pronta: onde ela está no curso, o caminho dele e as
 * ferramentas ao lado. Quem confere o acesso é a página (requireProduct).
 */
export function SllArea({ user, firstVisit, hasChoice }: SllAreaProps) {
  return (
    <AreaShell
      account={user}
      hasChoice={hasChoice}
      product="Sistema Loja Lucrativa (SLL)"
      // As aulas ainda não estão no ar: o título diz isso, sem mandar ela "começar" algo fechado.
      title="As aulas abrem em breve"
      intro={greeting(
        firstName(user.name),
        firstVisit,
        'O curso começa pela trilha de boas-vindas. Você recebe um aviso quando ela abrir.',
      )}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SllCourseCard />
        <SllToolsCard />
      </div>
    </AreaShell>
  );
}
