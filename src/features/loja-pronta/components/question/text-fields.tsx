import { PERSONAL_TOUCH_MAX } from '@/config/onboarding';
import { Textarea } from '@/components/ui/textarea';

/** Texto livre e opcional (o toque pessoal). */
export function LongTextField({
  text,
  describedBy,
  onText,
}: {
  text: string;
  describedBy?: string | undefined;
  onText: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="toque-pessoal" className="text-body font-semibold">
        Seu toque pessoal <span className="font-normal text-muted-foreground">(opcional)</span>
      </label>
      <Textarea
        id="toque-pessoal"
        name="value"
        rows={4}
        maxLength={PERSONAL_TOUCH_MAX}
        value={text}
        onChange={(event) => onText(event.target.value)}
        aria-describedby={describedBy}
        className="scroll-mb-28"
      />
    </div>
  );
}
