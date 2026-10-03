'use client';

import { CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandPending } from './brand-form';

export function FinishButton() {
  const pending = useBrandPending();
  return (
    <Button type="submit" loading={pending} loadingText="Salvando…">
      Está tudo certo
      {pending ? null : <CheckIcon aria-hidden="true" />}
    </Button>
  );
}
