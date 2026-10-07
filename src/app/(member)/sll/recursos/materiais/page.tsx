import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Download, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requireProduct } from '@/features/products/server/access';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { getLessonMaterials } from '@/features/sll/tools/server/materials';
import { getSllPublishedResources } from '@/features/sll/server/catalog';
import { TOOL_MATERIALS } from '@/features/sll/tools/catalog';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Materiais · SLL' };

export default async function MaterialsPage() {
  const [{ session, products }, materials, resources] = await Promise.all([
    requireProduct('sll', '/sll/recursos/materiais'),
    getLessonMaterials(),
    getSllPublishedResources(),
  ]);
  if (!resources.some((resource) => resource.slug === 'materiais-sll' && resource.destination))
    notFound();
  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title="Materiais para sua loja"
      intro="Guias, planilhas e arquivos das aulas, reunidos em um lugar."
      currentSection="/sll/recursos"
      backLink={{ href: '/sll/recursos', label: 'Voltar aos recursos' }}
    >
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4" aria-labelledby="tool-materials-title">
          <h2 id="tool-materials-title" className="text-xl font-semibold text-foreground">
            Para usar as calculadoras
          </h2>
          <ul className="grid items-start gap-4 md:grid-cols-2">
            {TOOL_MATERIALS.map((material) => (
              <li className={cn(panelCard, 'gap-3')} key={material.slug}>
                <h3 className="text-xl font-semibold text-foreground">{material.title}</h3>
                <p className="text-body text-muted-foreground">{material.description}</p>
                <Button asChild variant="soft">
                  <a href={`/api/sll/ferramentas/material/${material.slug}`}>
                    <Download aria-hidden="true" />
                    Baixar {material.fileName.endsWith('.pdf') ? 'guia em PDF' : 'planilha XLSX'}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-4" aria-labelledby="lesson-materials-title">
          <h2 id="lesson-materials-title" className="text-xl font-semibold text-foreground">
            Materiais das aulas
          </h2>
          <ul className="grid items-start gap-4 md:grid-cols-2">
            {materials.map((material) => (
              <li className={cn(panelCard, 'gap-3')} key={material.id}>
                <h3 className="text-xl font-semibold text-foreground">{material.title}</h3>
                <p className="text-body text-muted-foreground">
                  {material.type} · {material.lessonTitle}
                </p>
                {material.pending ? (
                  <p className="text-body text-muted-foreground">Material em breve.</p>
                ) : material.lockMessage ? (
                  <p className="text-body text-muted-foreground">{material.lockMessage}</p>
                ) : null}
                {material.destination ? (
                  <Button asChild variant="soft">
                    <a href={material.destination}>
                      <Download aria-hidden="true" />
                      Baixar material
                    </a>
                  </Button>
                ) : null}
                {!material.lockMessage ? (
                  <Button asChild variant="link" size="inline">
                    <Link href={`/sll/aula/${material.lessonId}`}>
                      <BookOpen aria-hidden="true" />
                      Abrir aula
                    </Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {!materials.length ? (
            <p className="text-body text-muted-foreground">
              Os materiais das aulas serão mostrados aqui quando estiverem disponíveis.
            </p>
          ) : null}
        </section>
      </div>
    </SllAreaShell>
  );
}
