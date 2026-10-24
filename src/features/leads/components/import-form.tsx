'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Check, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileField } from '@/components/ui/file-field';
import { Label } from '@/components/ui/label';
import { SelectMenu } from '@/components/ui/select-menu';
import { importLeads, type ImportState } from '../server/actions';

export function ImportForm({ owners }: { owners: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(importLeads, {} as ImportState);
  return (
    <div className="flex flex-col gap-5">
      {state.message ? (
        <p
          role={state.imported !== undefined ? 'status' : 'alert'}
          className="rounded-2xl bg-muted p-4 text-body"
        >
          {state.message}
          {state.imported !== undefined
            ? ` ${state.imported} contatos adicionados e ${state.skipped} duplicados ignorados.`
            : ''}
        </p>
      ) : null}
      {state.errors?.length ? (
        <div
          role="alert"
          className="flex max-h-80 flex-col gap-2 overflow-auto text-sm text-destructive"
        >
          <p>{state.errors.length} linhas precisam de correção.</p>
          <ul className="list-inside list-disc">
            {state.errors.slice(0, 30).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {state.preview ? (
        <form action={action} className="flex flex-col gap-5">
          <input type="hidden" name="confirm" value="yes" />
          <input type="hidden" name="payload" value={JSON.stringify(state.preview)} />
          <h2 className="text-title font-semibold">Confira {state.preview.length} contatos</h2>
          <p className="text-body text-muted-foreground">
            Email ou WhatsApp já cadastrado será ignorado, inclusive nos arquivados. Os dados
            existentes ficam preservados.
          </p>
          <ul className="max-h-80 divide-y divide-border overflow-auto rounded-2xl border border-border px-4">
            {state.preview.slice(0, 20).map((lead, index) => (
              <li className="py-3 text-body break-words" key={index}>
                <span className="font-semibold">{lead.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {lead.email || lead.phone} · {lead.source}
                </span>
              </li>
            ))}
          </ul>
          {state.preview.length > 20 ? (
            <p className="text-sm text-muted-foreground">
              Prévia dos primeiros 20 contatos. Todos os contatos do arquivo foram validados.
            </p>
          ) : null}
          <Label htmlFor="import-owner">Responsável pelos contatos importados</Label>
          <SelectMenu id="import-owner" name="ownerId">
            <option value="">Sem responsável</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </SelectMenu>
          <Button type="submit" loading={pending} loadingText="Importando…">
            <Check aria-hidden="true" />
            Confirmar importação
          </Button>
          <Button asChild variant="ghost">
            <Link href="/leads/importar">Escolher outro arquivo</Link>
          </Button>
        </form>
      ) : state.imported !== undefined ? (
        <Button asChild>
          <Link href="/leads">Ver contatos</Link>
        </Button>
      ) : (
        <form action={action} className="flex flex-col gap-5">
          <FileField
            id="lead-csv"
            name="file"
            label="Planilha de contatos"
            hint="CSV em UTF-8, até 2 MB e 1.000 contatos. Exporte do Excel ou Google Sheets como CSV."
            accept=".csv,text/csv"
            required
          />
          <Button type="submit" loading={pending} loadingText="Conferindo…">
            <Upload aria-hidden="true" />
            Conferir planilha
          </Button>
        </form>
      )}
    </div>
  );
}
