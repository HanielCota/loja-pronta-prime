import { panelCard } from '@/features/member/components/area-shell';
import { cn } from '@/lib/utils';
import type { SaleResult } from '../calculations';
import { formatMoney, formatRoas } from '../number-input';
import type { CalculatorResult as Result } from '../state';

function Amount({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-3 last:border-0">
      <dt className="text-body text-muted-foreground">{label}</dt>
      <dd className="text-body font-semibold text-foreground">{formatMoney(cents)}</dd>
    </div>
  );
}

function SaleBreakdown({ sale }: { sale: SaleResult }) {
  return (
    <>
      <dl>
        <Amount label="Preço final da unidade" cents={sale.priceCents} />
        <Amount label="Produto, embalagem, frete e outros custos" cents={sale.operationalCents} />
        <Amount label="Comissão Shopee" cents={sale.commissionCents} />
        <Amount label="Taxa por item" cents={sale.fixedCents} />
        <Amount label="Impostos" cents={sale.taxCents} />
        <Amount label="Campanhas e outras taxas" cents={sale.extraFeeCents} />
        <Amount label="Anúncios por venda" cents={sale.advertisingCents} />
        <Amount label="Total de custos" cents={sale.totalCents} />
        <Amount label="Lucro estimado" cents={sale.profitCents} />
      </dl>
      <p
        className={cn(
          'text-body font-semibold',
          sale.profitCents < 0 ? 'text-destructive' : 'text-foreground',
        )}
      >
        {sale.profitCents < 0
          ? 'Esta venda dá prejuízo com os custos informados.'
          : `Margem estimada: ${sale.marginPercent.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%.`}
      </p>
    </>
  );
}

export function CalculatorResult({ result }: { result: Result }) {
  return (
    <section
      className={cn(panelCard, 'gap-4 p-5 sm:p-6')}
      aria-labelledby="calculator-result-title"
    >
      <h2
        id="calculator-result-title"
        tabIndex={-1}
        className="text-headline font-semibold text-foreground"
      >
        Seu resultado
      </h2>
      {result.kind === 'price' ? (
        <>
          <p className="text-body text-muted-foreground">Preço sugerido para a margem escolhida</p>
          <p className="text-title-lg font-semibold text-foreground">
            {formatMoney(result.sale.priceCents)}
          </p>
          <SaleBreakdown sale={result.sale} />
        </>
      ) : result.kind === 'discount' ? (
        <>
          <dl>
            <Amount
              label="Lucro antes da promoção"
              cents={result.simulation.original.profitCents}
            />
            <Amount label="Desconto na unidade" cents={result.simulation.discountCents} />
            <Amount label="Cupom pago por você" cents={result.simulation.couponCents} />
            <Amount label="Mudança no lucro" cents={result.simulation.profitDifferenceCents} />
          </dl>
          <h3 className="text-body font-semibold text-foreground">Depois da promoção</h3>
          <SaleBreakdown sale={result.simulation.discounted} />
        </>
      ) : (
        <>
          <dl>
            <Amount
              label="Limite por venda para cobrir os custos"
              cents={result.limits.breakEvenBudgetCents}
            />
            <Amount
              label="Limite por venda mantendo sua margem"
              cents={result.limits.targetBudgetCents}
            />
          </dl>
          <p className="text-body text-foreground">
            ROAS para cobrir os custos:{' '}
            <strong>
              {result.limits.breakEvenRoas === null
                ? 'sem verba disponível'
                : `${formatRoas(result.limits.breakEvenRoas)}×`}
            </strong>
            .
          </p>
          <p className="text-body text-foreground">
            ROAS para manter sua margem:{' '}
            <strong>
              {result.limits.targetRoas === null
                ? 'sem verba disponível'
                : `${formatRoas(result.limits.targetRoas)}×`}
            </strong>
            .
          </p>
          <p className="text-sm text-muted-foreground">
            ROAS é o valor das vendas dividido pelo gasto com anúncios. Os limites são por venda de
            uma unidade, usando os custos informados.
          </p>
          {result.limits.targetBudgetCents === 0 ? (
            <p className="text-body text-destructive">
              O preço atual não deixa verba para anúncios mantendo a margem escolhida.
            </p>
          ) : null}
          <h3 className="text-body font-semibold text-foreground">Venda antes dos anúncios</h3>
          <SaleBreakdown sale={result.limits.sale} />
        </>
      )}
      <p className="text-sm text-muted-foreground">
        Estimativa para uma unidade. Custos que você não informar ficam fora da conta. Recalcule ao
        mudar o preço, o desconto ou as taxas da loja.
      </p>
    </section>
  );
}
