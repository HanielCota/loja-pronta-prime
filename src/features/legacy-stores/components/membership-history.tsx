import { panelCard } from '@/features/member/components/area-shell';
import type { LegacyCustomer } from '../model';

export function LegacyMembershipHistory({
  membership,
}: {
  membership: { customer: LegacyCustomer; purchases: { transaction: string }[] } | null;
}) {
  if (!membership) return null;
  const { customer, purchases } = membership;
  return (
    <section aria-labelledby="previous-membership" className={`${panelCard} gap-5`}>
      <h2 id="previous-membership" className="text-title font-semibold">
        Cadastro anterior
      </h2>
      <dl className="grid gap-x-6 gap-y-3 text-body sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">Nome original</dt>
        <dd className="wrap-anywhere">{customer.nome || 'Não informado'}</dd>
        <dt className="text-muted-foreground">Email original</dt>
        <dd className="wrap-anywhere">{customer.email}</dd>
        <dt className="text-muted-foreground">Telefone original</dt>
        <dd className="wrap-anywhere">{customer.telefone || 'Não informado'}</dd>
      </dl>
      {purchases.length ? (
        <details className="rounded-2xl bg-muted p-5">
          <summary className="text-body font-semibold">
            Referências de compra ({purchases.length})
          </summary>
          <p className="mt-3 text-body text-muted-foreground">
            Estas referências não informam a situação do pagamento ou do reembolso.
          </p>
          <ul className="mt-3 space-y-2 text-body">
            {purchases.map((p) => (
              <li className="wrap-anywhere" key={p.transaction}>
                {p.transaction}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
