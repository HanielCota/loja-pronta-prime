import { MessageCircle } from 'lucide-react';
import { trackedWhatsappPath, type WhatsappContact } from '../whatsapp';

const linkClass =
  'inline-flex min-h-11 items-center gap-2 rounded-full text-body font-semibold text-link underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * "Prefere conversar?": os contatos de WhatsApp como segunda opção, em link discreto. Assunto sem
 * número aparece como hoje ("Nome · Em breve"), sem link que finge.
 */
export function WhatsappAlternatives({
  contacts,
  source,
  title = 'Prefere conversar?',
}: {
  contacts: readonly WhatsappContact[];
  source: 'platform' | 'login';
  title?: string;
}) {
  if (contacts.length === 0) return null;
  return (
    <section aria-labelledby="whatsapp-alternatives" className="flex flex-col gap-2">
      <h2 id="whatsapp-alternatives" className="text-body font-semibold">
        {title}
      </h2>
      <ul className="flex flex-col gap-1">
        {contacts.map((contact) => (
          <li key={contact.topic} className="flex flex-wrap items-center gap-x-2 text-body">
            <MessageCircle aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{contact.title}:</span>
            {contact.phone ? (
              <a className={linkClass} href={trackedWhatsappPath(contact.topic, source)} target="_blank" rel="noreferrer">
                Chamar {contact.name} no WhatsApp
                <span className="sr-only"> (abre em outra aba)</span>
              </a>
            ) : (
              <span className="text-muted-foreground">{contact.name} · Em breve</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Uma linha só, pro contato do tema escolhido no chamado guiado. */
export function WhatsappTopicLine({ contact }: { contact: WhatsappContact | null }) {
  if (!contact?.phone) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-body text-muted-foreground">
      <MessageCircle aria-hidden="true" className="size-5 shrink-0" />
      Prefere conversar?
      <a className={linkClass} href={trackedWhatsappPath(contact.topic, 'platform')} target="_blank" rel="noreferrer">
        Chame {contact.name} no WhatsApp
        <span className="sr-only"> (abre em outra aba)</span>
      </a>
    </p>
  );
}
