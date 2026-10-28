'use client';

import { SelectMenu } from '@/components/ui/select-menu';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ENHANCED_SUBMIT_FIELD } from '@/lib/forms';
import { MAX_DESCRIPTION } from '../plan-ticket';

/**
 * "Não consegue entrar?": o pedido de ajuda sem login. Funciona sem JavaScript (o formulário vai
 * direto pra rota). A resposta é sempre a mesma, exista a conta ou não.
 */
export function PublicAccessForm({
  situations,
  error,
  submissionId,
}: {
  situations: { id: string; label: string }[];
  error: string | null;
  /** Id deste envio, criado no servidor: o mesmo envio repetido não abre dois chamados. */
  submissionId: string;
}) {
  const [message, setMessage] = useState<string | null>(error);
  const [done, setDone] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    data.set(ENHANCED_SUBMIT_FIELD, '1');
    try {
      const response = await fetch('/api/suporte/acesso', { method: 'POST', body: data });
      const result = (await response.json()) as { ok: boolean; redirectTo?: string; message?: string };
      if (result.ok) setDone(result.message ?? 'Recebemos. Enviamos um link pro seu e-mail pra você acompanhar o chamado.');
      else setMessage(`${result.message ?? 'Não foi possível enviar agora.'} O que você escreveu continua aqui.`);
    } catch {
      setMessage('Não foi possível enviar agora. O que você escreveu continua aqui.');
    }
    setSending(false);
  }

  if (done)
    return (
      <output className="block rounded-2xl bg-primary-soft px-4 py-4 text-body text-pretty">
        {done}
      </output>
    );

  return (
    <form action="/api/suporte/acesso" method="post" encType="multipart/form-data" onSubmit={submit} className="flex flex-col gap-4">
      <input type="hidden" name="tema" value="access" />
      <input type="hidden" name="envio" value={submissionId} />
      <FloatingLabelInput id="acesso-nome" name="nome" label="Seu nome" required maxLength={80} autoComplete="name" />
      <FloatingLabelInput id="acesso-email" name="email" label="E-mail da compra" type="email" required maxLength={254} autoComplete="email" />
      <div className="flex flex-col gap-2">
        <Label htmlFor="acesso-situacao">O que está acontecendo?</Label>
        <SelectMenu id="acesso-situacao" name="situacao" required defaultValue="" className="min-h-12 rounded-field border border-input bg-card px-4 text-body text-foreground">
          <option value="" disabled>
            Escolha o mais próximo
          </option>
          {situations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </SelectMenu>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="acesso-descricao">Conte o que aparece quando você tenta entrar</Label>
        <Textarea id="acesso-descricao" name="descricao" required maxLength={MAX_DESCRIPTION} placeholder="Exemplo: aparece “email ou senha incorretos”, mesmo depois de trocar a senha." />
      </div>
      {message ? (
        <p role="alert" className="text-body text-destructive">
          {message}
        </p>
      ) : null}
      <Button type="submit" loading={sending} loadingText="Enviando…">
        <Send aria-hidden="true" />
        Pedir ajuda
      </Button>
    </form>
  );
}
