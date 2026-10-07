'use client';

import { Save } from 'lucide-react';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { changeStudentProductAccess } from '../server/actions';
import type { ProductAccessState } from '../server/actions';
import { AdminSelect as Select } from './admin-select';
import { Textarea } from '@/components/ui/textarea';

const initialState: ProductAccessState = { message: '', saved: false };

/** `email` já preenche o campo quando o formulário aparece na tela de uma conta. */
export function ProductAccessManager({ email }: { email?: string } = {}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(changeStudentProductAccess, initialState);

  useEffect(() => {
    if (state.saved) router.refresh();
  }, [router, state.saved]);

  return (
    <form noValidate action={formAction} className="flex flex-col gap-4">
      <FloatingLabelInput
        autoComplete="email"
        defaultValue={email}
        id="access-email"
        label="Email da aluna"
        maxLength={254}
        name="email"
        required
        type="email"
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="access-product">Produto</Label>
        <Select defaultValue="sll" id="access-product" name="product">
          <option value="sll">SLL — Sistema Loja Lucrativa</option>
          <option value="loja-pronta">Loja Pronta</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="access-action">O que deseja fazer?</Label>
        <Select defaultValue="granted" id="access-action" name="action">
          <option value="granted">Liberar acesso</option>
          <option value="revoked">Remover acesso</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="access-reason">Motivo da alteração</Label>
        <Textarea
          className="min-h-24"
          id="access-reason"
          maxLength={500}
          minLength={3}
          name="reason"
          required
        />
      </div>
      <Button disabled={pending} loading={pending} type="submit">
        <Save aria-hidden="true" data-icon="inline-start" />
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
