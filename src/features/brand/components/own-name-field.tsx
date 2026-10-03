'use client';

import { ArrowRightIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { useBrandPending } from './brand-form';

/** Campo do nome escrito por ela, com quantas letras ainda cabem (o limite é o da Shopee). */
export function OwnNameField({ id, initial, max }: { id: string; initial: string; max: number }) {
  const [value, setValue] = useState(initial);
  const pending = useBrandPending();
  const counterId = useId();
  const over = value.trim().length > max;

  return (
    <>
      <FloatingLabelInput
        id={id}
        name="name"
        label="Nome da loja"
        autoComplete="off"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-describedby={counterId}
        aria-invalid={over || undefined}
      />
      <p
        id={counterId}
        className={over ? '-mt-2 text-sm text-destructive' : '-mt-2 text-sm text-muted-foreground'}
      >
        {value.trim().length} de {max} letras
      </p>
      <Button type="submit" variant="soft" loading={pending} loadingText="Salvando…">
        Usar esse nome
        {pending ? null : <ArrowRightIcon aria-hidden="true" />}
      </Button>
    </>
  );
}
