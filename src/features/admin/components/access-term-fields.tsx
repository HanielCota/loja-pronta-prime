import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Label } from '@/components/ui/label';
import { SelectMenu as Select } from '@/components/ui/select-menu';

/** Uses native form fields so validation and submission also work without JavaScript. */
export function AccessTermFields({
  suffix = '',
  mode,
  date,
}: {
  suffix?: string;
  mode?: string | undefined;
  date?: string | undefined;
}) {
  const id = `access-term${suffix}`;
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor={id}>Prazo do acesso</Label>
      <Select defaultValue={mode ?? 'purchase'} id={id} name={`termMode${suffix}`}>
        <option value="purchase">Um ano a partir da compra original</option>
        <option value="until">Definir uma data de vencimento</option>
      </Select>
      <FloatingLabelInput
        id={`${id}-date`}
        name={`termDate${suffix}`}
        label="Data da compra ou do vencimento"
        type="date"
        defaultValue={date}
        aria-describedby={`${id}-hint`}
      />
      <p className="text-sm text-muted-foreground" id={`${id}-hint`}>
        Na primeira opção, informe a data da compra comprovada. Na segunda, informe o último dia de
        acesso. O prazo termina às 23h59, no horário de Brasília. Liberar agora não reinicia o ano
        da compra.
      </p>
    </div>
  );
}
