import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import type { PublicationContext } from '../publication';

export function RecoveredBarcodeFields({
  index,
  context,
}: {
  index: number;
  context: PublicationContext;
}) {
  const required = context.limits?.gtin === 'Mandatory';
  return (
    <div className="flex flex-col gap-3">
      <FloatingLabelInput
        id={`barcode-${index}`}
        name={`barcode-${index}`}
        label="Código de barras (EAN ou GTIN)"
        inputMode="numeric"
        maxLength={14}
        defaultValue={context.values?.[`barcode-${index}`]?.[0] ?? ''}
        required={required}
      />
      {required ? (
        <p className="text-body text-muted-foreground">
          A Shopee exige um código de barras válido nesta categoria. Consulte o fornecedor.
        </p>
      ) : (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body">
          <input
            type="checkbox"
            name={`noBarcode-${index}`}
            value="confirmed"
            defaultChecked={context.values?.[`noBarcode-${index}`]?.[0] === 'confirmed'}
          />
          O fornecedor confirmou que este produto não tem código de barras.
        </label>
      )}
    </div>
  );
}
