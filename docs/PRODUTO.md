# Loja Pronta Prime — O que é a plataforma

## Em uma frase

A Loja Pronta Prime ([lojaprontaprime.com](https://lojaprontaprime.com)) é uma área de membros para mulheres iniciantes que querem vender na Shopee. Ela oferece o curso SLL com ferramentas e a jornada Loja Pronta, em que a própria aluna prepara a marca e a conta, um passo por vez.

Este documento descreve o que está implementado em 7 de outubro de 2026. Conexão, produtos de fornecedores e publicação automática na Shopee continuam em preparação.

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
- Etapa 2 com uma pergunta sobre o tempo da loja, 6 prioridades e 7 ações complementares.
- Aulas de apoio vinculadas ao plano ficam disponíveis quando a Etapa 2 abre, mesmo antes de liberar toda a Biblioteca. Cada dia mostra todas as suas ações obrigatórias e só fica concluído quando todas terminam.
- Biblioteca da Etapa 3 com busca, retorno à busca e numeração original das aulas.
- 71 aulas vinculadas ao Panda, com reprodução iniciada pela aluna; o catálogo também tem aulas em texto. Conteúdo e publicação podem ser editados no admin.
- Calculadoras de preço e lucro, descontos e anúncios; guia em PDF e planilha de custos em XLSX com download protegido pelo acesso ao SLL.
- Quatro guias de uso que levam aos assistentes externos no ChatGPT. O acesso externo depende da conta e das condições do serviço.
- Minhas Lojas mostra o andamento real da Loja Pronta quando a aluna também tem esse produto. A conexão com a Shopee e as métricas de vendas ainda estão em breve.

Arquivos originais ausentes aparecem como “Em breve”. Não há material inventado para substituí-los. Inventário e pendências: `docs/SLL-FERRAMENTAS.md`.

### Loja Pronta

A própria aluna monta sua marca e prepara a conta. A interface tem uma decisão por tela, texto simples e respostas salvas para continuar depois. A jornada usa 7 fases no banco, agrupadas em 3 etapas na interface:

| Fase | O que a aluna faz                                         | Situação atual                                    |
| ---- | --------------------------------------------------------- | ------------------------------------------------- |
| 1    | Responde à conversa inicial                               | Disponível                                        |
| 2    | Escolhe nome, cria ou envia logo e define o texto da loja | Disponível                                        |
| 3    | Abre a conta de vendedora no site da Shopee com um guia   | Guia disponível; confirmação informada pela aluna |
| 4    | Autoriza a conexão com a Shopee                           | Explicação disponível; conexão em breve           |
| 5    | Escolhe produtos do fornecedor                            | Em breve; depende do fornecedor e da integração   |
| 6    | Publica a marca e os produtos pela plataforma             | Em breve; depende da Shopee                       |
| 7    | Confere a finalização e as vendas                         | Consulta de vendas em breve                       |

O nome, o logo e o texto ficam salvos antes da conexão para a futura publicação automática. Baixar o logo é opcional, para guardar uma cópia; aplicar a marca manualmente na Shopee não é uma etapa obrigatória da Loja Pronta. A conta de vendedora continua sendo criada pela aluna no site da Shopee. O guia de cadastro tem um espaço de vídeo (`conta-na-shopee`, enviado com `bun run dev:video`), que só aparece depois do envio de um arquivo real e não bloqueia o passo a passo escrito.

A plataforma não confirma hoje que uma loja foi publicada na Shopee. A aluna confere a loja e as vendas na Central do Vendedor. Fases pendentes não têm botões que simulam essas operações.

#### Conversa inicial

Uma pergunta por tela, com o mascote e salvamento de cada resposta:

- Experiência com vendas, motivação, preocupação, categorias de interesse e tempo disponível.
- Nome da loja ou “Ainda não decidi”, estilo, cor, sentimentos e toque pessoal opcional.
- Revisão das respostas e salvamento do WhatsApp.

Ao enviar, a loja passa para a fase da marca. O WhatsApp fica salvo como contato; **o envio automático de avisos ainda não existe**. O vídeo de orientação só aparece quando um arquivo real for enviado para esse espaço; sem arquivo, a jornada segue para as respostas enviadas.

#### Sua marca

1. **Nome:** ideias montadas a partir das respostas, ou um nome escrito pela aluna.
2. **Logo:** estúdio com tipo, desenho, cores, letras, fundo e estilo. O rascunho é ilustrativo; a OpenAI desenha a imagem final. Há escolhas escritas, transcrição quando configurada, ajustes de uma versão e envio de um logo próprio. O limite atual é de 4 criações e 10 envios por conta.
3. **Texto da loja:** sugestões a partir das respostas ou um texto próprio.
4. **Revisão:** nome, logo e texto juntos, com edição, confirmação e download do logo em PNG.

As prévias no perfil da loja e no kit de envio são identificadas como exemplos. Confirmar a marca leva à conta na Shopee (fase 3), ou à explicação da conexão (fase 4) para quem informou que já tem loja. Quem já avançou retorna ao painel atual, sem voltar a um passo bloqueado.

Os limites de nome (30) e descrição (500) estão em `src/config/brand.ts`. As categorias de interesse ainda não vêm de um catálogo de fornecedores.

## Como o acesso funciona hoje

- Não existe cadastro público. O login usa email e senha de uma conta já criada.
- A recuperação de senha permite criar a primeira senha ou trocar uma senha existente, por link enviado ao email pela Resend. Confirmação de email usa o mesmo provedor. O envio depende do domínio verificado e de `RESEND_API_KEY` e `EMAIL_FROM` configurados no servidor.
- Contas marcadas com senha temporária precisam criar outra antes de acessar as áreas.
- O recebimento de compras Hotmart já verifica o token, cria a conta e libera o produto mapeado. Uma conta nova recebe uma senha aleatória que não é enviada. **O convite automático de primeiro acesso ainda precisa ser concluído**, assim como a configuração real da Hotmart e do email.
- Reembolso e contestação recalculam o acesso daquele produto, preservando outra compra ativa ou concessão manual. A política para cancelamento de assinatura continua pendente.

Detalhes atuais e fluxo de convite planejado: `docs/INTEGRACAO-HOTMART.md`. Contas de desenvolvimento são criadas com `bun run dev:aluna`; não representam compras reais.

## Painel administrativo disponível

Administradores podem organizar e editar boas-vindas, método e cursos; enviar materiais, imagens e capas; conferir prévias; salvar rascunhos, publicar, arquivar e restaurar itens. Também editam banners, recursos e textos fixos do SLL.

Em Contas, a admin busca qualquer conta por nome ou email e, na tela da conta, edita nome, apelido, email e função (aluna ou admin), pede uma senha nova no próximo acesso, libera ou remove produtos, desconecta a conta dos aparelhos e bloqueia ou desbloqueia o acesso com motivo. A própria conta não pode perder a função admin nem ser bloqueada por ela mesma. Apagar contas ainda não existe.

Também dá pra criar uma conta pelo painel (Contas → Criar conta), para quem não comprou pela Hotmart ou para uma nova administradora: nome, email, função (aluna ou admin) e os produtos liberados, que entram no histórico de acessos como liberação manual. O primeiro acesso é por email (o mesmo link de criar senha da recuperação, que vale 1 hora) ou por uma senha temporária que a admin define e passa pra ela; com a senha temporária, ela cria outra ao entrar.

O painel abre numa visão geral com os números das contas e compras e com quem está online agora: as áreas das alunas avisam a página aberta a cada 30 segundos, só com a aba à vista, e conta como online quem avisou nos últimos 90 segundos. Guarda só a última página de cada conta, sem histórico, IP ou localização. Junto, guarda o aparelho daquele acesso: o user agent e o que o navegador conta (tela, janela, idioma, fuso horário, toque, tema, app instalado, tipo de conexão e, no Chrome, a versão do sistema e o modelo). O admin mostra se é celular, tablet ou computador, o sistema, o navegador e se o link foi aberto dentro de outro app, como o Instagram.

O painel permite liberar ou remover um produto de uma conta existente com motivo e histórico, configurar dois códigos distintos de produtos Hotmart e o token, e consultar avisos de compras. Salvar a configuração não testa a conexão externa nem conclui o convite por email.

Um painel de todas as lojas, histórico de montagem por loja, métricas comerciais e contagem de compradoras que entraram continuam fora da entrega atual.

## Glossário

- **SLL:** Sistema Loja Lucrativa, o curso com ferramentas.
- **Loja Pronta:** a jornada de preparação da loja pela própria aluna.
- **Fase:** um dos 7 passos internos da jornada; as telas agrupam esses passos em 3 etapas.
- **Hotmart:** plataforma de venda dos produtos e origem dos avisos de compras.
- **Shopee:** plataforma onde a aluna abre a conta e vende.
- **Dropshipping:** venda sem estoque próprio, com envio pelo fornecedor; integração pendente.
- **Senha temporária:** senha inicial de uma conta marcada para troca obrigatória.
