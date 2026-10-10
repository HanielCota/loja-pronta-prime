import type { Metadata } from 'next';
import { AdminShell } from '@/features/admin/components/admin-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { panelCard } from '@/features/member/components/area-shell';
import { Button } from '@/components/ui/button';
import { BLING_PATH, BLING_RESULT_MESSAGES } from '@/features/bling/model';
import { BlingError } from '@/features/bling/server/client';
import { getBlingStatus, readBlingPreview } from '@/features/bling/server/connection';
import { connectBling, disconnectBling, previewBling } from '@/features/bling/server/actions';
import { consumeAttempt } from '@/server/auth/rate-limit';

export const metadata: Metadata = { title: 'Conexão com o Bling' };

export default async function BlingPage({
  searchParams,
}: {
  searchParams: Promise<{ resultado?: string; consultar?: string }>;
}) {
  const session = await requireAdmin(BLING_PATH);
  const [status, params] = await Promise.all([getBlingStatus(), searchParams]);
  let preview: Awaited<ReturnType<typeof readBlingPreview>> | undefined;
  let error: string | undefined;
  if (params.consultar === '1' && status.status === 'connected') {
    if (!(await consumeAttempt('blingPerUser', session.user.id)))
      error = BLING_RESULT_MESSAGES.limited;
    else
      try {
        preview = await readBlingPreview();
      } catch (caught) {
        error =
          caught instanceof BlingError
            ? caught.message
            : 'Não foi possível consultar o Bling. Tente mais tarde.';
      }
  }
  const message = params.resultado ? BLING_RESULT_MESSAGES[params.resultado] : undefined;
  return (
    <AdminShell
      account={session.user}
      current="bling"
      title="Conexão com o Bling"
      intro="Teste da conta da empresa. As lojas das alunas continuam separadas."
    >
      <section className={`${panelCard} gap-4`} aria-labelledby="bling-status">
        <h2 id="bling-status" className="text-title font-semibold">
          {status.status === 'connected'
            ? 'Conta Bling conectada'
            : status.status === 'unconfigured'
              ? 'Conexão em breve'
              : 'Autorizar a conta Bling'}
        </h2>
        <p className="text-body text-pretty text-muted-foreground">
          {status.status === 'connected'
            ? `${status.companyName}. A conexão permite consultar o catálogo. A publicação automática pela Loja Pronta ainda está em breve.`
            : 'A dona da conta autoriza o acesso no site do Bling. A senha do Bling fica só lá.'}
        </p>
        {message ? <output className="text-body text-pretty">{message}</output> : null}
        {error ? (
          <p role="alert" className="text-body text-pretty text-destructive">
            {error}
          </p>
        ) : null}
        {status.status === 'unconfigured' ? (
          <p className="text-body text-pretty text-muted-foreground">
            O aplicativo precisa ser cadastrado no Bling e configurado no servidor antes da
            autorização.
          </p>
        ) : status.status === 'connected' ? (
          <>
            <form action={previewBling}>
              <Button type="submit">Consultar catálogo e canal Shopee</Button>
            </form>
            <form action={disconnectBling}>
              <Button type="submit" variant="soft">
                Desconectar desta plataforma
              </Button>
            </form>
            <a
              className="flex min-h-11 items-center text-body text-link underline underline-offset-4"
              href="https://www.bling.com.br/central.extensoes.php#/minhas-instalacoes"
              target="_blank"
              rel="noreferrer"
            >
              Gerenciar permissões no Bling (abre em outra aba)
            </a>
          </>
        ) : (
          <form action={connectBling}>
            <Button type="submit">Autorizar no Bling</Button>
          </form>
        )}
      </section>
      {preview ? (
        <section className={`${panelCard} gap-4`} aria-labelledby="bling-products">
          <h2 id="bling-products" className="text-title font-semibold">
            Produtos consultados no Bling
          </h2>
          <p className="text-body text-pretty text-muted-foreground">
            {preview.channels.length
              ? `${preview.channels.length} canal(is) Shopee habilitado(s) no Bling. Isso não confirma que anúncios foram publicados.`
              : 'Nenhum canal Shopee habilitado foi encontrado no Bling.'}
          </p>
          {preview.products.length ? (
            <ul className="divide-y divide-border">
              {preview.products.map((product) => (
                <li key={product.id} className="flex flex-col gap-1 py-3">
                  <strong className="text-body break-words">{product.nome}</strong>
                  <span className="text-body break-words text-muted-foreground">
                    {product.codigo ? `SKU: ${product.codigo}` : 'Sem SKU informado'}
                    {product.preco !== undefined
                      ? ` · ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.preco)}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-muted-foreground">
              Nenhum produto ativo retornou nesta consulta.
            </p>
          )}
          <p className="text-body text-pretty text-muted-foreground">
            Mostrando até 20 produtos ativos. A consulta não importa produtos para as alunas e não
            altera preço ou estoque.
          </p>
        </section>
      ) : null}
    </AdminShell>
  );
}
