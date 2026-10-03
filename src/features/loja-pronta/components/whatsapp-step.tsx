import { FocusOnArrival } from './focus-on-arrival';
import { MascotBubble } from './mascot-bubble';
import { WhatsappForm } from './whatsapp-form';

const TITLE_ID = 'whatsapp-titulo';
const HELP_ID = 'whatsapp-ajuda';

/** Último passo: o WhatsApp em que a equipe fala com ela, e o envio da conversa. */
export function WhatsappStep() {
  return (
    <>
      <MascotBubble
        title="Em qual WhatsApp a equipe fala com você?"
        help="É por lá que você recebe os avisos de cada fase da loja."
        titleId={TITLE_ID}
        helpId={HELP_ID}
      />
      <FocusOnArrival targetId={TITLE_ID} />
      <WhatsappForm helpId={HELP_ID} />
    </>
  );
}
