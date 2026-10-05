'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { changeStudentProductAccess } from '../server/actions';
import type { ProductAccessState } from '../server/actions';

const initialState: ProductAccessState = { message: '', saved: false };

export function ProductAccessManager() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(changeStudentProductAccess, initialState);

  useEffect(() => {
    if (state.saved) router.refresh();
  }, [router, state.saved]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FloatingLabelInput
        autoComplete="email"
        id="access-email"
        label="Email da aluna"
        maxLength={254}
        name="email"
        required
        type="email"
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="access-product">Produto</Label>
        <select
          className="min-h-12 rounded-field border border-input bg-background px-4 text-body text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          defaultValue="sll"
          id="access-product"
          name="product"
        >
          <option value="sll">SLL — Sistema Loja Lucrativa</option>
          <option value="loja-pronta">Loja Pronta</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="access-action">O que deseja fazer?</Label>
        <select
          className="min-h-12 rounded-field border border-input bg-background px-4 text-body text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          defaultValue="granted"
          id="access-action"
          name="action"
        >
          <option value="granted">Liberar acesso</option>
          <option value="revoked">Remover acesso</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="access-reason">Motivo da alteração</Label>
        <textarea
          className="min-h-24 w-full rounded-field border border-input bg-background px-4 py-3 text-body text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          id="access-reason"
          maxLength={500}
          minLength={3}
          name="reason"
          required
        />
      </div>
      <Button disabled={pending} loading={pending} type="submit">
        Salvar alteração
      </Button>
      <output aria-live="polite" className="min-h-6 text-body text-muted-foreground">
        {state.message}
      </output>
      {state.currentAccess ? (
        <p className="text-body text-foreground">
          Acessos atuais:{' '}
          {state.currentAccess.length === 0
            ? 'nenhum produto'
            : state.currentAccess
                .map((product) => (product === 'sll' ? 'SLL' : 'Loja Pronta'))
                .join(' e ')}
        </p>
      ) : null}
    </form>
  );
}
