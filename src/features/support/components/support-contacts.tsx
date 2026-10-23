import { MessageCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { formatWhatsapp, whatsappLink } from '@/features/loja-pronta/whatsapp';
import { SUPPORT_TOPICS, type SupportPhones } from '../contacts';

export function SupportContacts({ phones }: { phones: SupportPhones }) {
  return (
    <section id="suporte" className={panelCard} aria-labelledby="profile-support">
      <h2 id="profile-support" tabIndex={-1} className="text-title font-semibold">
        Precisa de ajuda?
      </h2>
      <p className="mt-2 text-body text-muted-foreground">
        Escolha o assunto para falar com a pessoa certa.
      </p>
      <ul className="mt-4 divide-y divide-border">
        {SUPPORT_TOPICS.map((topic) => (
          <li key={topic.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
            <h3 className="text-body font-semibold">{topic.title}</h3>
            <p className="text-body text-muted-foreground">
              {topic.name}
              {phones[topic.id] ? ` · ${formatWhatsapp(phones[topic.id])}` : ' · Em breve'}
            </p>
            {phones[topic.id] ? (
              <Button asChild variant="soft">
                <a
                  href={whatsappLink(
                    phones[topic.id],
                    `Oi, ${topic.name}! Sou aluna da Loja Pronta Prime e preciso de ajuda com: ${topic.title}.`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircleIcon aria-hidden="true" />
                  Falar com {topic.name}
                  <span className="sr-only"> sobre {topic.title} (abre em outra aba)</span>
                </a>
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
