import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calculator, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = { title: 'Calculadora de preço Shopee · SLL' };

const FLOW = [
  ['Tipo de vendedora', 'CPF ou CNPJ, conforme a regra publicada para a conta.'],
  ['Custos', 'Custo do produto e outros custos que entram no preço.'],
  ['Taxas', 'Tarifas e programas realmente aplicáveis ao anúncio.'],
  ['Condições', 'Descontos, frete e outras condições que mudam a base.'],
  ['Resultado', 'Preço calculado, com custo, taxas e margem separados.'],
  ['Revisão', 'Revisar os dados ou começar um novo cálculo.'],
  ['Preferência salva', 'Salvar o tipo de vendedora somente se houver persistência real.'],
] as const;

/** Mantém a calculadora honesta enquanto as regras variáveis não têm fonte operacional estável. */
export default async function ShopeeCalculatorPage() {
  const { session, products } = await requireProduct('sll', '/sll/recursos/calculadora-shopee');

  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title="Calculadora de preço Shopee"
      intro="Veja por quanto cadastrar um produto depois que os custos e as taxas aplicáveis forem confirmados."
      backLink={{ href: '/sll/recursos#calculadora', label: 'Voltar para Recursos' }}
    >
      <section className={`${panelCard} gap-4`} aria-labelledby="calculator-status-title">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-link">
            <Calculator aria-hidden="true" className="size-6" />
          </span>
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
            Em breve
          </span>
        </div>
        <h2 id="calculator-status-title" className="text-title font-semibold text-foreground">
          O cálculo ainda está em preparação
        </h2>
        <p className="text-body text-pretty text-muted-foreground">
          As taxas da Shopee podem mudar conforme o tipo de vendedora, a categoria, o programa e as
          condições do pedido. A Prime não mostra um preço até confirmar todos esses parâmetros.
        </p>
        <p className="text-sm text-pretty text-muted-foreground">
          Você não precisa preencher nada agora. Quando a regra estiver validada, a escolha de CPF
          ou CNPJ será apresentada no início e a preferência só será salva pelo mecanismo real da
          plataforma.
        </p>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="calculator-flow-title">
        <div>
          <h2 id="calculator-flow-title" className="text-body font-semibold text-foreground">
            Fluxo previsto
          </h2>
          <p className="mt-1 text-body text-pretty text-muted-foreground">
            Esta é a sequência que será liberada quando a fórmula puder ser conferida.
          </p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2">
          {FLOW.map(([title, description], index) => (
            <li key={title} className={`${panelCard} gap-2 p-5 sm:p-5`}>
              <p className="text-sm font-semibold text-progress-text">Passo {index + 1}</p>
              <h3 className="text-body font-semibold text-foreground">{title}</h3>
              <p className="text-body text-pretty text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${panelCard} gap-4`} aria-labelledby="calculator-source-title">
        <div>
          <h2 id="calculator-source-title" className="text-body font-semibold text-foreground">
            O que já foi conferido
          </h2>
          <p className="mt-1 text-body text-pretty text-muted-foreground">
            Os Termos de Serviço confirmam a Tarifa de Marketplace por pedido concluído. A base
            considera os produtos do pedido, sem o frete pago pela compradora e, quando aplicável,
            sem descontos de cupons gerados pela vendedora.
          </p>
          <p className="mt-2 text-body text-pretty text-muted-foreground">
            Eles não trazem uma porcentagem única nem uma tabela completa de CPF ou CNPJ para todas
            as contas.
          </p>
        </div>
        <p className="text-sm text-pretty text-muted-foreground">
          Consulta registrada em 6 de outubro de 2026. A vigência da taxa da sua conta precisa ser
          conferida na Central do Vendedor antes de liberar qualquer resultado.
        </p>
        <Button asChild variant="ghost" className="w-fit px-3">
          <a
            href="https://help.shopee.com.br/portal/4/article/77113-Termos-de-Servi%C3%A7o-da-Shopee"
            rel="noopener noreferrer"
            target="_blank"
          >
            Ler os Termos de Serviço <ExternalLink aria-hidden="true" />
            <span className="sr-only"> (abre em outra aba)</span>
          </a>
        </Button>
      </section>

      <Button asChild variant="soft" className="sm:w-fit">
        <Link href="/sll/recursos">
          <ArrowLeft aria-hidden="true" /> Voltar para Recursos
        </Link>
      </Button>
    </SllAreaShell>
  );
}
