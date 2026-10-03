'use client';

import { ArrowRightIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBrandPending } from './brand-form';

/** Campo da descrição escrita por ela, com quantas letras ainda cabem. */
export function OwnDescriptionField({ initial, max }: { initial: string; max: number }) {
  const [value, setValue] = useState(initial);
  const pending = useBrandPending();
  const counterId = useId();
  const length = value.trim().length;

  return (
    <>
      <label htmlFor="descricao-propria" className="sr-only">
        Texto da loja
      </label>
      <textarea
        id="descricao-propria"
        name="description"
        rows={5}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-describedby={counterId}
        aria-invalid={length > max || undefined}
        className="w-full resize-none scroll-mb-28 rounded-field border border-input bg-card px-4 py-3.5 text-body leading-relaxed outline-none focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
      />
      <p
        id={counterId}
        className={cn('-mt-2 text-sm', length > max ? 'text-destructive' : 'text-muted-foreground')}
      >
        {length} de {max} letras
      </p>
      <Button type="submit" variant="soft" loading={pending} loadingText="Salvando…">
        Usar meu texto
        {pending ? null : <ArrowRightIcon aria-hidden="true" />}
      </Button>
    </>
  );
}
