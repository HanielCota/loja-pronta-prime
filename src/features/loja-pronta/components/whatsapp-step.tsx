import { FocusOnArrival } from './focus-on-arrival';
import { MascotBubble } from './mascot-bubble';
import { WhatsappForm } from './whatsapp-form';

const TITLE_ID = 'whatsapp-titulo';
const HELP_ID = 'whatsapp-ajuda';

/**
 * Último passo: salva o contato e envia a conversa. Avisos automáticos continuam pendentes.
 * Revendo (conversa já
 * enviada), é pra corrigir o número: o campo já vem com ele, e salvar volta pra revisão.
 */
export function WhatsappStep({ saved, revising }: { saved: string | null; revising: boolean }) {
  return (
    <>
      <MascotBubble
        title="Qual é o seu WhatsApp?"
        help="Salvamos o número junto das suas respostas. Os avisos automáticos estão em breve."
        titleId={TITLE_ID}
        helpId={HELP_ID}
      />
      <FocusOnArrival targetId={TITLE_ID} />
      <WhatsappForm helpId={HELP_ID} initial={revising ? saved : null} />
    </>
  );
}
