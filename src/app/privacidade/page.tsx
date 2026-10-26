import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { PageShell } from '@/components/brand/page-shell';
import { DATA_CONTROLLER, PRIVACY_EMAIL } from '@/config/support';
import { getActiveSession } from '@/features/auth/server/session';
import { MemberNavbar } from '@/features/member/components/member-navbar';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Quais dados o Escala Shop guarda, pra quê, com quem compartilha e como pedir para ver ou apagar os seus.',
};

/** Muda sempre que o texto mudar: a lei pede a data da última atualização. */
const UPDATED_AT = '26 de outubro de 2026';

const emailLinkClass =
  'font-medium wrap-anywhere text-link underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-headline font-semibold text-balance text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-6 text-body text-pretty marker:text-muted-foreground">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function Text({ children }: { children: ReactNode }) {
  return <p className="text-body text-pretty">{children}</p>;
}

function EmailLink() {
  return (
    <a href={`mailto:${PRIVACY_EMAIL}`} className={emailLinkClass}>
      {PRIVACY_EMAIL}
    </a>
  );
}

export default async function PrivacyPage() {
  // Página pública: quem está dentro vê a própria conta no topo; sem sessão (ou com o banco fora
  // do ar), a barra de quem não entrou. A política não pode depender do login.
  const session = await getActiveSession().catch(() => null);

  return (
    <PageShell wide navbar={session ? <MemberNavbar account={session.user} /> : undefined}>
      <BrandCard compact>
        <CardHeading
          title="Política de Privacidade"
          description={`Como cuidamos dos seus dados. Atualizada em ${UPDATED_AT}.`}
        />
        <div className="flex flex-col gap-8 text-foreground">
          <Section title="Quem cuida dos seus dados">
            <Text>
              O Escala Shop é da {DATA_CONTROLLER.name}, CNPJ {DATA_CONTROLLER.cnpj},{' '}
              {DATA_CONTROLLER.address}. Somos nós que decidimos como os seus dados são usados,
              seguindo a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
            </Text>
            <Text>
              Dúvidas ou pedidos sobre os seus dados: <EmailLink />.
            </Text>
          </Section>

          <Section title="Quais dados guardamos">
            <List
              items={[
                'Da compra: nome, email, produto comprado e data. Eles chegam da Hotmart, onde você pagou. Não recebemos dados do seu cartão.',
                'Da sua conta: senha (guardada embaralhada, nem nós conseguimos ler), apelido e foto de perfil, se você colocar.',
                'Do que você faz aqui: respostas da conversa inicial, WhatsApp que você informar, marca e logo da sua loja, aulas vistas e progresso.',
                'Da sua loja na Shopee, só se você conectar: o número da loja, a autorização da Shopee (guardada cifrada) e os números dos seus produtos, como visualizações e cliques. Não acessamos dados dos seus compradores.',
                'Do acesso: endereço IP, navegador, horário de entrada e a página aberta no momento. Servem para manter você conectada, proteger a conta e mostrar quem está online para a administração.',
              ]}
            />
          </Section>

          <Section title="Pra que usamos">
            <List
              items={[
                'Liberar o que você comprou e manter sua conta funcionando.',
                'Montar sua loja: marca, logo, textos e o passo a passo da Shopee.',
                'Mostrar suas aulas, seu progresso e dicas a partir dos números da sua loja.',
                'Mandar emails da conta, como criar ou trocar a senha.',
                'Proteger a plataforma contra acessos indevidos.',
                'Cumprir obrigações da lei.',
              ]}
            />
            <Text>Não vendemos seus dados e não usamos para anúncios de outras empresas.</Text>
          </Section>

          <Section title="Com quem compartilhamos">
            <Text>
              Só com os serviços que fazem a plataforma funcionar, cada um com o mínimo necessário:
            </Text>
            <List
              items={[
                'Hotmart: onde a compra é feita e de onde vem a liberação do acesso.',
                'Shopee: quando você conecta sua loja, para ler e atualizar os seus próprios anúncios.',
                'OpenAI: para criar o logo e transformar em texto o que você fala no microfone. Mandamos só as respostas e o áudio dessa etapa.',
                'Panda Video: onde ficam os vídeos das aulas.',
                'Resend: envio dos emails da conta.',
                'Hospedagem e proteção do site: servidor na Contabo, Cloudflare e um armazenamento privado de arquivos (logos e fotos).',
              ]}
            />
            <Text>
              Alguns desses serviços ficam fora do Brasil, como nos Estados Unidos. Nesses casos, a
              transferência segue as regras da LGPD.
            </Text>
          </Section>

          <Section title="Cookies">
            <Text>
              Usamos só os cookies necessários para manter você conectada. Suas preferências de
              tela, como tema escuro e tamanho do texto, ficam guardadas só no seu navegador. Não
              usamos cookies de propaganda nem de estatística.
            </Text>
          </Section>

          <Section title="Por quanto tempo guardamos">
            <Text>
              Enquanto sua conta existir. Se você pedir para apagar, apagamos em até 30 dias, menos
              o que a lei obriga a guardar por mais tempo. Se você desconectar a loja da Shopee, a
              autorização dela é apagada na hora.
            </Text>
          </Section>

          <Section title="Como protegemos">
            <Text>
              O site só funciona com conexão segura (HTTPS). Senhas ficam embaralhadas, a
              autorização da Shopee fica cifrada e cada pessoa só vê a própria conta. Se acontecer
              algum problema de segurança que afete seus dados, avisamos você e as autoridades, como
              a lei manda.
            </Text>
          </Section>

          <Section title="Seus direitos">
            <Text>Pela LGPD, você pode pedir a qualquer momento:</Text>
            <List
              items={[
                'Saber se temos dados seus e receber uma cópia.',
                'Corrigir o que estiver errado.',
                'Apagar seus dados ou a sua conta.',
                'Saber com quem compartilhamos.',
                'Retirar uma autorização que você deu, como a da sua loja na Shopee.',
              ]}
            />
            <Text>
              Mande um email para <EmailLink /> com o email da sua compra. Respondemos em até 15
              dias. Você também pode reclamar na Autoridade Nacional de Proteção de Dados (ANPD).
            </Text>
          </Section>

          <Section title="Mudanças nesta política">
            <Text>Se esta política mudar, a data lá em cima muda junto.</Text>
          </Section>
        </div>
      </BrandCard>
    </PageShell>
  );
}
