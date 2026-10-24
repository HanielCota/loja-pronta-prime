import { CircleAlert, CircleCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Retorno de um formulário enviado (o "?resultado=" do endereço), no lugar de texto solto.
 * Deu certo: aviso calmo, lido como status. Deu errado: alerta, lido na hora pelo leitor de tela.
 */
export function SllFlashMessage({ message, failed }: { message: string; failed: boolean }) {
  if (!message) return null;
  return (
    <Alert variant={failed ? 'destructive' : 'info'} role={failed ? 'alert' : 'status'}>
      {failed ? <CircleAlert aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}
      <AlertDescription className="text-body">{message}</AlertDescription>
    </Alert>
  );
}
