# Escala Shop — Platform overview

## WhatsApp support (October 28, 2026)

The owner requested retiring the internal ticket inbox to consolidate support on WhatsApp.
The account menu, profile, course and store help use the existing subject-specific contacts.
Public login help shows the configured technical WhatsApp contact and password recovery.
Both privacy-policy contact links also use the configured technical WhatsApp number, with a
privacy-request message and a coming-soon state when no contact is available. The policy has no
email contact action and stays readable without login or an available database.
Profile support, email-change help and expiring-access help use only configured WhatsApp contacts.
There is no support email action or email fallback in the profile. Missing phone numbers keep the
existing coming-soon state; the privacy policy remains available as an informational link.
Legacy ticket pages redirect to the appropriate help page; ticket APIs return HTTP 410 and
previously loaded ticket actions cannot write. Administrators retain only the WhatsApp contact
settings; the ticket queue, reports, team screens, counters and overview card are removed.
The worker only retains the established historical data retention job. No records are removed
as part of this change, and no database migration is required.
Existing cards, typography, themes and components remain in use. This supersedes earlier ticket
UI and operating instructions below. Production rollout must be verified separately.

## Previous store continuation (October 27, 2026)

Members with saved stores see **Retomar esta loja** before the option to start another store.
The owner-scoped continuation page reuses existing import, review, Shopee connection and explicit
publication confirmation. Members do not repeat onboarding or brand creation. The review list
can show only the selected store and reports persisted publication states rather than calling
every imported product a draft. Availability follows current integration and pilot settings;
connecting does not publish products or establish a delivery deadline.

## Independent Zé Mauro course (October 26, 2026)

The platform includes `/ze-mauro`, with 57 supplied recordings and eight coming-soon entries.
Its content and progress are separate from Pri's SLL. Active purchases or explicit manual
assignments determine the allowed expert areas. The 16 shared Pri videos in the final source
block were excluded at the owner's request. The current Escala Shop visual design is preserved.
See [course inventory, access and deployment](ZE-MAURO-COURSE.md).

## Em uma frase

Escala Shop ([membros.escalashop.com.br](https://membros.escalashop.com.br)) is a member platform for women beginning to sell on Shopee. It offers the SLL course and tools, plus the Loja Pronta journey, where students prepare their own brand and seller account one step at a time. See [the domain migration](ESCALA-SHOP-MIGRATION.md) for legacy links and integration routing.

Atualização de 17 de outubro de 2026: planos SLL, conexão compartilhada, variantes por expert e rotinas de produtos estão implementados no código. A operação real da Shopee, o fornecedor e os conteúdos finais continuam pendentes. Consulte [operação e limites do assistente](ASSISTENTE-SLL-OPERACAO.md) para distinguir implementação, testes locais e liberação externa.

## Para quem é

- **Aluna:** mulher iniciante em vendas online, sem conhecimento técnico.
- **Operação e suporte:** administram conteúdos e acessos, sem montar lojas pela aluna.
- **Dono do sistema:** acompanha as entregas e configura as integrações.

## Os dois produtos

Os produtos têm acessos separados. Quem tem os dois escolhe a área ao entrar e pode trocar de área pelo menu. A compra de um não libera o outro.

### SLL — Sistema Loja Lucrativa

Curso em vídeo para a aluna aprender e vender por conta própria.

- Boas-vindas, Método em 3 Etapas e cursos complementares.
- Progresso salvo no servidor; a próxima etapa do método abre após concluir as aulas obrigatórias da anterior. Aulas opcionais não impedem o avanço.
- Meu plano separa lojas novas (roteiro de sete dias orgânico, híbrido ou pago) de lojas com sete dias ou mais (histórico e orientação pelos dados). Os roteiros são publicados pelo admin e preservam sua versão e progresso. A Etapa 2 mantém as aulas e ações já publicadas e leva ao plano pessoal.
- Aulas de apoio vinculadas ao plano ficam disponíveis quando a Etapa 2 abre, mesmo antes de liberar toda a Biblioteca. Cada dia mostra todas as suas ações obrigatórias e só fica concluído quando todas terminam.
- Biblioteca da Etapa 3 com busca, retorno à busca e numeração original das aulas.
- 71 aulas vinculadas ao Panda, com reprodução iniciada pela aluna; o catálogo também tem aulas em texto. Conteúdo e publicação podem ser editados no admin.
- Calculadoras de preço e lucro, descontos e anúncios; guia em PDF e planilha de custos em XLSX com download protegido pelo acesso ao SLL.
- Quatro guias de uso que levam aos assistentes externos no ChatGPT. O acesso externo depende da conta e das condições do serviço.
- Minhas Lojas permite cadastrar e autorizar a Shopee usando somente SLL, quando a integração está configurada. A conexão é compartilhada com Loja Pronta. Coletas completas mostram os contadores disponíveis e seu horário; comparações usam o mesmo intervalo e não dependem de IA. Ausência e falha não viram zero.
- Variantes de vídeo Pri/Zé seguem a origem da compra na mesma plataforma e aula, sem misturar progresso ou apresentar rascunhos. O admin configura as ofertas e os vídeos.

Arquivos originais ausentes aparecem como “Em breve”. Não há material inventado para substituí-los. Inventário e pendências: `docs/SLL-FERRAMENTAS.md`.

### Loja Pronta

A própria aluna monta sua marca e prepara a conta. A interface tem uma decisão por tela, texto simples e respostas salvas para continuar depois. A jornada usa 7 fases no banco, agrupadas em 3 etapas na interface:

| Fase | O que a aluna faz                                            | Situação atual                                                                   |
| ---- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1    | Responde à conversa inicial                                  | Disponível                                                                       |
| 2    | Escolhe nome, cria ou envia logo e define o texto da loja    | Disponível                                                                       |
| 3    | Abre a conta de vendedora no site da Shopee com um guia      | Guia disponível; confirmação informada pela aluna                                |
| 4    | Autoriza a conexão com a Shopee                              | Autorização implementada; ativação pendente                                      |
| 5    | Escolhe os cinco primeiros produtos do fornecedor            | Fluxo implementado; depende de catálogo real, atualizado e preparado para a loja |
| 6    | Acompanha os anúncios confirmados e cinco dias de observação | Worker implementado para produtos simples; piloto real pendente                  |
| 7    | Confere a finalização e as vendas                            | Consulta de vendas em breve                                                      |

O nome, o logo e o texto ficam salvos antes da conexão para a futura publicação automática. Baixar o logo é opcional, para guardar uma cópia; aplicar a marca manualmente na Shopee não é uma etapa obrigatória da Loja Pronta. A conta de vendedora continua sendo criada pela aluna no site da Shopee. O guia de cadastro tem um espaço de vídeo (`conta-na-shopee`, enviado com `bun run dev:video`), que só aparece depois do envio de um arquivo real e não bloqueia o passo a passo escrito.

A plataforma só registra anúncio publicado após resposta confirmada ou conciliação na Shopee. Não houve piloto de publicação real nesta entrega. O catálogo permanece em preparação sem fornecedor atualizado ou liberação da integração. Automatic brand publication is now implemented behind a separate disabled-by-default flag; real profile/media permissions and a controlled live-shop pilot remain pending. Não há botões que simulam essas operações.

#### Conversa inicial

Antes da primeira resposta, a aluna vê boas-vindas com o nome e pode abrir o plano em três
etapas na mesma página. "Começar agora" leva à conversa. Quem já salvou uma resposta vê o painel
com "Continuar a conversa", para retomar o ponto em que parou.

Uma pergunta por tela, com o mascote e salvamento de cada resposta:

- Experiência com vendas, para saber se a conta de vendedora já foi criada.
- Estilo, cor, sentimentos e toque pessoal opcional. O nome da loja é escolhido na marca, com sugestões.
- Revisão das respostas e salvamento do WhatsApp.

Ao enviar, a loja passa para a fase da marca. O WhatsApp fica salvo como contato; **o envio automático de avisos ainda não existe**. O vídeo de orientação só aparece quando um arquivo real for enviado para esse espaço; sem arquivo, a jornada segue para as respostas enviadas.

#### Sua marca

1. **Nome:** ideias montadas a partir das respostas, ou um nome escrito pela aluna.
2. **Logo:** estúdio com tipo, desenho, cores, letras, fundo e estilo. O rascunho é ilustrativo; a OpenAI desenha a imagem final. Há escolhas escritas, transcrição quando configurada, ajustes de uma versão e envio de um logo próprio. O limite atual é de 4 criações e 10 envios por conta.
3. **Texto da loja:** sugestões a partir das respostas ou um texto próprio.
4. **Revisão:** nome, logo e texto juntos, com edição, confirmação e download do logo em PNG.

As prévias no perfil da loja e no kit de envio são identificadas como exemplos. Confirmar a marca leva à conta na Shopee (fase 3), ou à explicação da conexão (fase 4) para quem informou que já tem loja. Quem já avançou retorna ao painel atual, sem voltar a um passo bloqueado.

Os limites de nome (30) e descrição (500) estão em `src/config/brand.ts`. A conversa não oferece categorias de produtos enquanto não houver um catálogo confirmado do fornecedor. Respostas antigas ficam guardadas, mas essas categorias não alimentam novas sugestões de marca. Não há novas perguntas sobre redes sociais ou outros marketplaces enquanto não existir um recurso que use essas respostas. A conexão com a Shopee ainda não está disponível, então o nome de uma loja existente não pode ser importado: ele é escolhido uma vez na marca, com orientação para manter o nome usado na Shopee.

## Como o acesso funciona hoje

- Não existe cadastro público. O login usa email e senha de uma conta já criada.
- A Lupita é o mascote da Loja Pronta e do SLL. No login, ela orienta pelos balões de erro;
  email ou senha incorretos oferecem “Redefinir minha senha”, que abre a recuperação existente.
- A recuperação de senha permite criar a primeira senha ou trocar uma senha existente, por link enviado ao email pela Resend. Confirmação de email usa o mesmo provedor. O envio depende do domínio verificado e de `RESEND_API_KEY` e `EMAIL_FROM` configurados no servidor.
- Contas marcadas com senha temporária precisam criar outra antes de acessar as áreas.
- Hotmart purchase notifications verify the token, create the account and grant the mapped product. New students use `loja1234` without an email link or a mandatory password change. Existing accounts keep their current password. See [student password maintenance](STUDENT-PASSWORD.md) for the one-time update of existing accounts.
- Reembolso e contestação recalculam o acesso daquele produto, preservando outra compra ativa ou concessão manual. A política para cancelamento de assinatura continua pendente.

Detalhes atuais e fluxo de convite planejado: `docs/INTEGRACAO-HOTMART.md`. Contas de desenvolvimento são criadas com `bun run dev:aluna`; não representam compras reais.

## Painel administrativo disponível

Legacy store history is available per account after the Supabase migration. It preserves original customer contact details, Hotmart references, every saved store, delivery states and product records. Students review their own stores in Loja Pronta; administrators use the existing account stage view, including blocked accounts. Historical records do not advance the current setup or establish a live Shopee connection. See [legacy store migration](LEGACY-STORE-MIGRATION.md).

O painel de Leads, em `/leads` e preparado para `leads.lojaprontaprime.com`, permite cadastrar
e importar contatos por CSV, acompanhar etapas de venda, registrar conversas, marcar retornos,
filtrar e exportar contatos, arquivar e restaurar. Os indicadores usam apenas os contatos reais.
Administradores têm acesso; uma venda marcada não libera produtos. Detalhes e configuração do
subdomínio: `docs/LEADS.md`.

Administradores podem organizar e editar boas-vindas, método e cursos; enviar materiais, imagens e capas; conferir prévias; salvar rascunhos, publicar, arquivar e restaurar itens. Também editam banners, recursos e textos fixos do SLL.

Em Contas, a admin busca qualquer conta por nome ou email e, na tela da conta, edita nome, apelido, email e função (aluna ou admin), pede uma senha nova no próximo acesso, libera ou remove produtos, desconecta a conta dos aparelhos e bloqueia ou desbloqueia o acesso com motivo. A própria conta não pode perder a função admin nem ser bloqueada por ela mesma. Apagar contas ainda não existe.

No resumo de uma conta (e no chamado), a admin pode **Entrar como aluna**: vê a plataforma
exatamente como ela por 1 hora, com uma faixa no topo dizendo de quem é a conta, até que horas e o
que fica bloqueado (senha, nome, foto, Shopee, criação de logo, conselho do assistente e decisões
do chamado). Tudo o que fizer fica registrado com o nome dela, e a visita não marca a aluna como
online nem como leitora das respostas. "Voltar ao painel" encerra a visita. Contas da equipe,
contas bloqueadas e alunas que ainda não criaram a senha não podem ser acessadas: o botão fica
desligado e explica o motivo.

No resumo de uma conta, a admin abre **Ver etapa atual**. A tela protegida em
`/admin/contas/<id>/etapa` mostra a fase da Loja Pronta em que a aluna está, o próximo passo, as
respostas salvas, o WhatsApp e a marca salva, com o logo escolhido. Ela usa as mesmas regras de
fase do painel da aluna. É só para ver: a admin continua na própria conta, e abrir a tela não
muda o progresso da aluna, as visitas aos produtos nem o "online agora". Contas bloqueadas ou sem
acesso ao produto continuam mostrando o que foi salvo, com um aviso explicando a situação.

A tela começa com uma prévia do nome, do logo e do texto salvos, com a mesma embalagem
ilustrativa do estúdio da aluna. Uma galeria mostra os logos salvos, marca o escolhido e os que
ela enviou, e abre cada um no tamanho original por rotas protegidas do admin. A prévia é só
ilustrativa: não quer dizer que a loja já está assim na Shopee. As fotos dos produtos chegam
quando as integrações de fornecedor e publicação ficarem prontas.

As rotas de imagem do admin só aceitam PNGs salvos na pasta de logos da própria conta. Itens
inválidos do estúdio ficam de fora sem mudar o que está salvo; se o logo escolhido for inválido,
aparece um aviso de indisponível e a rota responde 404. Sessão, função, bloqueio e senha nova
pendente são conferidos de novo em cada tela e em cada imagem.

Também dá pra criar uma conta pelo painel (Contas → Criar conta), para quem não comprou pela Hotmart ou para uma nova administradora: nome, email, função (aluna ou admin) e os produtos liberados, que entram no histórico de acessos como liberação manual. O primeiro acesso é por email (o mesmo link de criar senha da recuperação, que vale 1 hora) ou por uma senha temporária que a admin define e passa pra ela; com a senha temporária, ela cria outra ao entrar.

O painel abre numa visão geral com os números das contas e compras e com quem está online agora: as áreas das alunas avisam a página aberta a cada 30 segundos, só com a aba à vista, e conta como online quem avisou nos últimos 90 segundos. Guarda só a última página de cada conta, sem histórico, IP ou localização. Junto, guarda o aparelho daquele acesso: o user agent e o que o navegador conta (tela, janela, idioma, fuso horário, toque, tema, app instalado, tipo de conexão e, no Chrome, a versão do sistema e o modelo). O admin mostra se é celular, tablet ou computador, o sistema, o navegador e se o link foi aberto dentro de outro app, como o Instagram.

O painel permite liberar ou remover um produto de uma conta existente com motivo e histórico, configurar dois códigos distintos de produtos Hotmart e o token, e consultar avisos de compras. Salvar a configuração não testa a conexão externa nem conclui o convite por email.

Um painel de todas as lojas, histórico de montagem por loja, métricas comerciais e contagem de compradoras que entraram continuam fora da entrega atual.

A autorização Shopee está implementada para o Escala Shop existente: início, callback, tokens
cifrados, renovação e desconexão local. Depende da configuração do retorno, IPs e validação
com uma loja autorizada antes de ativar. Sem isso, a fase 4 mantém “em breve”. Conexão live
confirmada avança para a fase 5; produtos e publicação continuam em breve. O contrato local
do catálogo está preparado. Ver `docs/INTEGRACAO-SHOPEE.md`.

Existe um piloto administrativo preparado em `/admin/bling`, desligado sem configuração. Ele
autoriza a própria conta da empresa e consulta seus produtos e canais. A conta Bling da empresa
e o aplicativo privado foram criados, com credenciais configuradas no servidor de produção.
O teste do canal Shopee exige concluir o cadastro de vendedor da loja na Central do Vendedor.
A conexão foi publicada em produção e o callback validou o CNPJ. A consulta real retornou
um canal Shopee e nenhum produto ativo. Esse canal é da loja anterior; a nova conta Shopee
continua em cadastro e ainda não foi conectada ao ERP.
Não conecta contas das alunas nem publica anúncios. Ver `docs/INTEGRACAO-BLING.md`.

## Suporte por chamados

Além do WhatsApp por assunto (que continua igual), a aluna abre chamados guiados em `/suporte`:
escolhe o tema e a situação, vê uma resposta automática quando existe, e acompanha a conversa,
o prazo e a situação do chamado. Quem não consegue entrar pede ajuda em `/suporte/acesso`, pelo
link da tela de login. A equipe (Atendente, Supervisor e Administrador) atende em
`/admin/chamados`, com filas, prazos em horas de atendimento, respostas prontas e nota interna;
supervisores veem o Desempenho e a Ouvidoria; o administrador configura horário, temas e
respostas e convida a equipe. Detalhes em `docs/SUPORTE.md`.

## Glossário

- **SLL:** Sistema Loja Lucrativa, o curso com ferramentas.
- **Loja Pronta:** a jornada de preparação da loja pela própria aluna.
- **Fase:** um dos 7 passos internos da jornada; as telas agrupam esses passos em 3 etapas.
- **Hotmart:** plataforma de venda dos produtos e origem dos avisos de compras.
- **Shopee:** plataforma onde a aluna abre a conta e vende.
- **Dropshipping:** venda sem estoque próprio, com envio pelo fornecedor; integração pendente.
- **Senha temporária:** senha inicial de uma conta marcada para troca obrigatória.

## Automatic brand publication and banner kit (October 22, 2026)

The confirmed name, logo and description can now be queued automatically after a live Shopee connection, independently of the supplier catalog. The worker requires `SHOPEE_BRAND_PUBLICATION_ENABLED`, an eligible account and a confirmed current brand snapshot. Editing the brand requires confirmation again; existing brands require a one-time confirmation. Real Shopee permissions and the controlled live pilot remain unverified by this implementation.

The banner kit provides two editable PNG compositions, protected previews, approval tied to the exact draft and brand, and approved downloads. The dashboard and brand-completion page link to the kit. Seller Centre instructions explain manual upload, preview and publication while an official decoration API remains unconfirmed. This does not publish banners automatically. See [implementation and operating limits](BRAND-AND-BANNERS.md).

## Recovered customer products (October 26, 2026)

The audited recovery run with 27,972 products is available through Loja Pronta → previous
stores → recovered products. Each eligible customer can import their own recovered products
into a private review list, inspect photos and variations, and edit the title, description
and selling price. Repeating an import preserves existing edits. The original historical
records remain unchanged. This import does not publish marketplace listings or advance setup.
Other store recoveries remain stopped. See [recovery and imports](LEGACY-CATALOG-RECOVERY.md).
