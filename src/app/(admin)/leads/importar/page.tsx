import type { Metadata } from 'next';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { panelCard } from '@/features/member/components/area-shell';
import { ImportForm } from '@/features/leads/components/import-form';
import { leadOptions } from '@/features/leads/server/queries';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Importar contatos · Contatos',
  robots: { index: false },
};
export default async function ImportLeadsPage() {
  await requireAdmin('/leads/importar');
  const { owners } = await leadOptions();
  return (
    <AdminPage
      title="Importar contatos"
      intro="Envie sua planilha e confira a prévia antes de adicionar os contatos."
      backLink={{ href: '/leads', label: 'Voltar aos contatos' }}
    >
      <section className={cn(panelCard, 'max-w-3xl gap-6')} aria-label="Importação por planilha">
        <div className="flex flex-col gap-3">
          <h2 className="text-body font-semibold">Comece pelo modelo</h2>
          <p className="text-body text-muted-foreground">
            Preencha nome e pelo menos email ou WhatsApp. As outras colunas são opcionais. Datas
            usam AAAA-MM-DD; mantenha os nomes das colunas.
          </p>
          <Button asChild variant="soft" className="sm:w-fit">
            <a href="/leads/modelo" download>
              <Download aria-hidden="true" />
              Baixar modelo CSV
            </a>
          </Button>
          <details className="rounded-2xl bg-muted p-4">
            <summary className="min-h-11 cursor-pointer text-body font-semibold outline-none focus-visible:outline-2 focus-visible:outline-ring">
              Como preencher produto e etapa
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">
              Produto: undecided (ainda não sabe), loja-pronta, sll ou both (os dois). Etapa: new
              (novo), contacted (em contato), qualified (interessado), proposal (oferta enviada),
              won (venda concluída) ou lost (sem interesse). Para lost, preencha motivo_perda.
              Etiquetas são separadas por vírgula.
            </p>
          </details>
        </div>
        <ImportForm owners={owners} />
      </section>
    </AdminPage>
  );
}
