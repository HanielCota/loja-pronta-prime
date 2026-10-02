import { CircleAlertIcon } from 'lucide-react';
import { FieldError } from '@/components/ui/field';

/** Primeira mensagem de erro do campo, ligada ao input pelo `id` (aria-describedby). */
export function FieldErrorMessage({ id, errors }: { id: string; errors?: string[] }) {
  const message = errors?.[0];
  if (!message) return null;

  return (
    <FieldError id={id}>
      <CircleAlertIcon aria-hidden="true" className="mt-px size-4 shrink-0" />
      {message}
    </FieldError>
  );
}
