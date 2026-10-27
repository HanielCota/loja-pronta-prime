import type { Metadata } from 'next';
import Link from 'next/link';
import { and, count, desc, eq, ilike, inArray, ne, or } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { panelCard } from '@/features/member/components/area-shell';
import { formatMoment } from '@/features/support/components/message-list';
import {
  isStaffRole,
  STAFF_ROLE_DESCRIPTIONS,
  STAFF_ROLE_LABELS,
  STAFF_ROLES,
  staffRoleOf,
} from '@/features/support/staff-access';
import { requireStaff } from '@/features/support/server/staff-guard';
import { blockStaff, changeStaffRole, inviteStaff } from '@/features/support-admin/server/actions';
import { ConfirmAction } from '@/features/support-desk/components/confirm-action';
import { getParam, type SearchParams } from '@/lib/search-params';
import { cn } from '@/lib/utils';
import { db } from '@/server/db';
import { session, supportStaffStatus, supportTickets, user } from '@/server/db/schema';

export const metadata: Metadata = { title: 'Equipe do suporte', robots: { index: false, follow: false } };

const selectClass =
  'min-h-11 w-full rounded-field border border-input bg-card px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary';

/** Bloquear ou desbloquear alguém da equipe. Formulário de verdade: funciona sem JavaScript. */
function BlockForm({ id, block, label, variant }: { id: string; block: boolean; label: string; variant: 'soft' | 'destructive' }) {
  return (
    <form action={blockStaff}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="bloquear" value={block ? '1' : '0'} />
      <Button type="submit" variant={variant} size="inline" className="px-4">
        {label}
      </Button>
    </form>
  );
}

/** A equipe do suporte: quem é, o cargo, se está ativa, disponível e com quantos chamados. */
export default async function SupportTeamPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requireStaff('/admin/suporte/equipe', 'team.manage');
  const params = await searchParams;
  const saved = getParam(params.salvo);
  const error = getParam(params.erro);
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      preferredName: user.preferredName,
      email: user.email,
      role: user.role,
      banned: user.banned,
      available: supportStaffStatus.available,
    })
    .from(user)
    .leftJoin(supportStaffStatus, eq(supportStaffStatus.userId, user.id))
    .where(or(ilike(user.role, '%support_%'), ilike(user.role, '%admin%')));
  const members = rows.filter((row) => isStaffRole(row.role));
  const ids = members.map((member) => member.id);
  const [lastSeen, loads] = ids.length
    ? await Promise.all([
        db
          .select({ userId: session.userId, at: session.updatedAt })
          .from(session)
          .where(inArray(session.userId, ids))
          .orderBy(desc(session.updatedAt)),
        db
          .select({ assigneeId: supportTickets.assigneeId, total: count() })
          .from(supportTickets)
          .where(and(inArray(supportTickets.assigneeId, ids), ne(supportTickets.status, 'closed')))
          .groupBy(supportTickets.assigneeId),
      ])
    : [[], []];
  const lastOf = (id: string) => lastSeen.find((row) => row.userId === id)?.at ?? null;
  const loadOf = (id: string) => loads.find((row) => row.assigneeId === id)?.total ?? 0;

  return (
    <AdminPage title="Equipe do suporte" intro="Quem atende os chamados e o que cada cargo pode fazer.">
      {saved ? (
        <output className="block rounded-card bg-primary-soft px-6 py-4 text-body text-link">
          {saved}
        </output>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-card bg-destructive-soft px-6 py-4 text-body text-destructive">
          {error}
        </p>
      ) : null}
      <section id="equipe" aria-labelledby="team-title" className={cn(panelCard, 'scroll-mt-24 gap-4 !p-5 sm:!p-6')}>
        <h2 id="team-title" className="text-title font-semibold">
          Pessoas <span className="text-muted-foreground">({members.length})</span>
        </h2>
        <ul className="divide-y divide-border">
          {members.map((member) => {
            const role = staffRoleOf(member.role);
            const seen = lastOf(member.id);
            const status = member.banned ? 'Bloqueada' : seen ? 'Ativa' : 'Convite enviado';
            const self = member.id === admin.user.id;
            return (
              <li key={member.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-col gap-1 text-body">
                  <Link href={`/admin/suporte/desempenho?secao=equipe&pessoa=${member.id}`} className="font-semibold break-words text-link hover:underline">
                    {member.preferredName?.trim() || member.name}
                  </Link>
                  <span className="text-sm break-words text-muted-foreground">{member.email}</span>
                  <span className="text-sm text-muted-foreground">
                    {role ? STAFF_ROLE_LABELS[role] : ''} · {status} · {member.available === false ? 'Em pausa' : 'Disponível'} · {loadOf(member.id)} chamados com a pessoa ·{' '}
                    {seen ? `último acesso ${formatMoment(seen)}` : 'nunca entrou'}
                  </span>
                </div>
                {self ? (
                  <span className="text-sm text-muted-foreground">Você</span>
                ) : (
                  <div className="flex flex-wrap items-end gap-3">
                    <form action={changeStaffRole} className="flex items-end gap-2">
                      <input type="hidden" name="id" value={member.id} />
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`cargo-${member.id}`}>Cargo</Label>
                        <select id={`cargo-${member.id}`} name="cargo" defaultValue={role ?? ''} className={selectClass}>
                          {STAFF_ROLES.map((item) => (
                            <option key={item} value={item}>
                              {STAFF_ROLE_LABELS[item]}
                            </option>
                          ))}
                          <option value="remover">Tirar da equipe</option>
                        </select>
                      </div>
                      <Button type="submit" variant="soft" size="inline" className="px-4">
                        Salvar
                      </Button>
                    </form>
                    {member.banned ? (
                      <BlockForm id={member.id} block={false} label="Desbloquear" variant="soft" />
                    ) : (
                      // Bloquear derruba a pessoa na hora: confirma antes, com o nome dela na frente.
                      <ConfirmAction
                        label="Bloquear"
                        variant="destructive"
                        title={`Bloquear ${member.preferredName?.trim() || member.name}?`}
                        description="Ela sai da plataforma agora e os aparelhos dela são desconectados. Dá pra desbloquear depois."
                      >
                        <BlockForm id={member.id} block label="Bloquear" variant="destructive" />
                      </ConfirmAction>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section id="convite" aria-labelledby="invite-title" className={cn(panelCard, 'scroll-mt-24 gap-4 !p-5 sm:!p-6')}>
        <h2 id="invite-title" className="text-title font-semibold">
          Convidar para a equipe
        </h2>
        <form action={inviteStaff} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FloatingLabelInput id="convite-nome" name="nome" label="Nome" required maxLength={80} />
            <FloatingLabelInput id="convite-email" name="email" label="E-mail" type="email" required maxLength={254} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-body font-semibold">Cargo</legend>
            {STAFF_ROLES.map((role) => (
              <div key={role} className="flex min-h-11 items-start gap-3 rounded-2xl bg-muted px-4 py-3 text-body has-checked:bg-primary-soft">
                <input id={`convite-cargo-${role}`} type="radio" name="cargo" value={role} required defaultChecked={role === 'support_agent'} aria-describedby={`convite-cargo-${role}-descricao`} className="mt-1 size-5" />
                <div className="flex flex-col">
                  <label htmlFor={`convite-cargo-${role}`} className="cursor-pointer font-semibold">
                    {STAFF_ROLE_LABELS[role]}
                  </label>
                  <span id={`convite-cargo-${role}-descricao`} className="text-muted-foreground">
                    {STAFF_ROLE_DESCRIPTIONS[role]}
                  </span>
                </div>
              </div>
            ))}
          </fieldset>
          <p className="text-body text-muted-foreground">A pessoa recebe um e-mail pra criar a senha. O link vale 1 hora.</p>
          <Button type="submit" className="sm:w-auto sm:self-start sm:px-8">
            Enviar convite
          </Button>
        </form>
      </section>
    </AdminPage>
  );
}
