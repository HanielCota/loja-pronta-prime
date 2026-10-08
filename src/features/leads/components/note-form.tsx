'use client';

import { useActionState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addLeadNote } from '../server/actions';

export function NoteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(addLeadNote, { message: '', saved: false });
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <Label htmlFor="lead-note">Anotar uma conversa</Label>
      <Textarea
        id="lead-note"
        name="note"
        required
        maxLength={3000}
        placeholder="O que foi conversado e qual é o próximo passo?"
      />
      {state.message ? (
        <p
          role={state.saved ? 'status' : 'alert'}
          className={state.saved ? 'text-body text-progress-text' : 'text-body text-destructive'}
        >
          {state.message}
        </p>
      ) : null}
      <Button variant="soft" type="submit" loading={pending} loadingText="Salvando…">
        <MessageSquarePlus aria-hidden="true" />
        Salvar anotação
      </Button>
    </form>
  );
}
