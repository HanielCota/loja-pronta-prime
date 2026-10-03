import { FocusOnArrival } from './focus-on-arrival';
import { MascotBubble } from './mascot-bubble';
import { WhatsappForm } from './whatsapp-form';

const TITLE_ID = 'whatsapp-titulo';
const HELP_ID = 'whatsapp-ajuda';

/** Último passo: o WhatsApp dos avisos da loja, e o envio da conversa. */
export function WhatsappStep() {
  return (
    <>
      <MascotBubble
        title="Em qual WhatsApp você quer receber os avisos?"
        help="É por lá que avisamos quando cada fase da loja abrir."
        titleId={TITLE_ID}
        helpId={HELP_ID}
      />
      <FocusOnArrival targetId={TITLE_ID} />
      <WhatsappForm helpId={HELP_ID} />
    </>
  );
}
