'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

export function RecoveredPreparationButton({ category = false }: { category?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={category ? 'soft' : 'default'}
      loading={pending}
      loadingText="Consultando a Shopee…"
    >
      {category ? 'Conferir categoria' : 'Preparar publicação'}
    </Button>
  );
}
