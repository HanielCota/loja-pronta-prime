import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { PERSONAL_TOUCH_MAX, STORE_NAME_MAX } from '@/config/onboarding';
import { UNKNOWN_NAME } from '../../answers';
import { Chip } from './option-field';

type NameFieldProps = {
  text: string;
  unknown: boolean;
  describedBy?: string;
  invalid: boolean;
  onText: (value: string) => void;
  onUnknown: (value: boolean) => void;
};

/** Nome da loja, ou "Ainda não decidi" (que desliga o campo: a equipe sugere). */
export function NameField({
  text,
  unknown,
  describedBy,
  invalid,
  onText,
  onUnknown,
}: NameFieldProps) {
  return (
    <div className="flex flex-col gap-3">
      <FloatingLabelInput
        id="nome-da-loja"
        name="value"
        label="Nome da loja"
        autoComplete="off"
        maxLength={STORE_NAME_MAX}
        value={unknown ? '' : text}
        disabled={unknown}
        onChange={(event) => onText(event.target.value)}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
      />
      <Chip label={UNKNOWN_NAME} className="self-start">
        <input
          type="checkbox"
          name="unknown"
          value="1"
          checked={unknown}
          onChange={(event) => onUnknown(event.target.checked)}
          className="sr-only"
        />
      </Chip>
    </div>
  );
}

/** Texto livre e opcional (o toque pessoal). */
export function LongTextField({
  text,
  describedBy,
  onText,
}: {
  text: string;
  describedBy?: string;
  onText: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="toque-pessoal" className="text-body font-semibold">
        Seu toque pessoal <span className="font-normal text-muted-foreground">(opcional)</span>
      </label>
      <textarea
        id="toque-pessoal"
        name="value"
        rows={4}
        maxLength={PERSONAL_TOUCH_MAX}
        value={text}
        onChange={(event) => onText(event.target.value)}
        aria-describedby={describedBy}
        className="w-full resize-none scroll-mb-28 rounded-field border border-input bg-card px-4 py-3.5 text-body leading-relaxed outline-none focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
      />
    </div>
  );
}
