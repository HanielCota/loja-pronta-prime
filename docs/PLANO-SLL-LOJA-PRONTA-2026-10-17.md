# Evolução do SLL e da Loja Pronta — pedidos de 17/10/2026

Estado: proposta consolidada após a revisão integral dos 12 áudios. Este documento organiza o trabalho; não declara as funcionalidades implementadas nem autoriza publicação ou alterações em lojas reais.

Base: 12 áudios enviados nesta conversa, aproximadamente 16 minutos e 39 segundos; código local em `3819fb6d46b424a8432265d80bb65d91075bc7d4`. O usuário confirmou que “Escala Shop”, nos áudios, corresponde à área Curso SLL deste projeto. Os planos anteriores continuam como histórico das entregas já feitas.

Método de revisão: duas passagens de transcrição automática dos 12 arquivos, com modelos distintos, leitura conjunta das falas e conferência dos requisitos contra o código. Os nomes e trechos informais que não definem funcionalidades não foram usados para preencher regras ausentes.

## 1. Entendimento do produto

Há uma plataforma compartilhada, dois produtos e dois braços de venda:

| Elemento               | Papel pedido nos áudios                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Escala Shop / área SLL | Produto de entrada: aulas, conexão da loja Shopee, ferramentas e orientação prática apoiada nos dados da própria loja. Atende iniciantes e quem já vende.            |
| Loja Pronta            | Produto adicional, apresentado como upsell: executar a montagem da loja seguindo a metodologia da Pri, incluindo a estratégia de publicação e evolução dos produtos. |
| Pri e Zé               | Dois experts vendendo na mesma plataforma, com a mesma estrutura/metodologia e vídeos correspondentes ao expert pelo qual a pessoa comprou.                          |

Comprar SLL deve permitir conectar uma loja existente sem comprar Loja Pronta. A expressão comercial “upsell” não define, sozinha, quais acessos uma compra concede: isso precisa continuar explícito no cadastro dos produtos/ofertas.

Os áudios usam “criar a loja” também para falar do cadastro de vendedor. No SLL, o começo do percurso é cadastro de vendedor e conexão da loja. Montar a marca, escolher produtos e publicar os anúncios pertence ao fluxo de montagem da Loja Pronta. Não reordenar a conversa e a marca da Loja Pronta por confundir essas duas situações.

## 2. Pedidos consolidados e origem

Os identificadores abaixo apontam para os nomes dos anexos. Os três arquivos das 10:52:36 mantêm seus sufixos; o horário idêntico não comprova a ordem entre eles.

| Fonte                    | Pedido ou esclarecimento aproveitado no plano                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 — Ptt 10:41:09       | Trazer a metodologia da Pri para o produto e resolver as pontas soltas da experiência atual. Abrir uma loja, isoladamente, não demonstra que a metodologia foi executada.                                                                                                                                                                                                                                               |
| A02 — Ptt 10:41:34       | Automatizar a execução dessa metodologia na Loja Pronta. É continuação do primeiro áudio.                                                                                                                                                                                                                                                                                                                               |
| A03 — Audio 10:42:33     | Publicar inicialmente somente cinco produtos; observar durante cinco dias; usar os resultados para orientar as próximas publicações. Considerar seleção variada ou nichada e o catálogo do fornecedor. O exemplo de calçados/Stock Shop ilustra a lógica; não confirma fornecedor contratado nem regras finais de pontuação.                                                                                            |
| A04 — Audio 10:47:58     | No SLL, começar pelo cadastro de vendedor e conexão. Perguntar a idade da loja. Para lojas novas, oferecer orgânico, híbrido ou pago e um plano executável de sete dias. Para lojas com histórico, usar métricas para orientar as ações. A fala corrige “personalizado” para um plano executável na parte inicial; não exige inventar todo roteiro por IA. Pri/Zé devem ajudar a definir a inteligência da metodologia. |
| A05 — Audio 10:52:36     | Vincular às ações do plano os três vídeos citados de Matheus sobre criação de vídeos com IA, com opções gratuitas e pagas. Os vídeos já teriam sido gravados; falta conferir os arquivos e formalizar a autorização de uso mencionada no áudio.                                                                                                                                                                         |
| A06 — Audio 10:52:36 (1) | Diferenciar cadastro de vendedor da montagem com produtos. A pessoa pode conectar a loja na área SLL sem adquirir Loja Pronta.                                                                                                                                                                                                                                                                                          |
| A07 — Audio 10:52:36 (2) | Escala Shop é a estrutura/escola e SLL é o produto de entrada. Há interesse em atender sellers que já operam. TikTok e outros níveis são possibilidades de evolução, sem especificação de entrega imediata.                                                                                                                                                                                                             |
| A08 — Ptt 10:53:35       | O SLL deve funcionar como assistente da loja: ler informações e orientar o melhor caminho. Loja Pronta é o segundo produto, voltado à montagem.                                                                                                                                                                                                                                                                         |
| A09 — Audio 10:55:04     | Criar ferramentas programadas usando os recursos efetivamente disponíveis da Shopee. Introduz o exemplo de comparação entre categorias de produtos. As alegações de disponibilidade da API precisam de prova técnica.                                                                                                                                                                                                   |
| A10 — Audio 10:57:01     | Comparar dois anúncios/categorias, coletar resultados e orientar mudanças. A fala sugere duplicar anúncio e mudar foto/categoria; a permissibilidade dessa operação ainda precisa ser conferida nas regras da Shopee. A comparação em si foi pedida como automação de programação, sem depender de IA.                                                                                                                  |
| A11 — Audio 10:58:29     | Existe um documento citado com cerca de 23 possibilidades de ferramentas, ainda não fornecido. Priorizar soluções por programação para controlar custo de IA. Assinatura é uma possibilidade comercial futura; as comparações de faturamento não são metas nem garantias do sistema.                                                                                                                                    |
| A12 — Ptt 11:01:14       | Usar a mesma plataforma para os clientes de Pri e Zé. Quem compra pelo Zé deve receber os vídeos dele nas aulas correspondentes. A estrutura e o formato são equivalentes, com o apresentador correspondente. Os vídeos do Zé já foram gravados e estavam em edição.                                                                                                                                                    |

Comentários pessoais dos interlocutores não viram regras de segmentação dos usuários nem funcionalidades.

## 3. O que já existe e o que falta no código

| Área              | Evidência atual                                                                                                                                                       | Trabalho necessário                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Produtos e acesso | `src/config/products.ts` e `src/server/db/schema/products.ts` separam SLL e Loja Pronta.                                                                              | Preservar a separação e permitir a conexão da Shopee pela área SLL.                                                                                          |
| Conexão Shopee    | `src/features/shopee/server/actions.ts` exige Loja Pronta e fase 4. A infraestrutura de OAuth, cifra, renovação e desconexão existe.                                  | Tornar a conexão um serviço compartilhado, com permissão e retorno adequados a cada produto. A conexão pelo SLL não pode avançar indevidamente a montagem.   |
| Lojas no SLL      | `src/features/sll/server/store-overview.ts` lê a montagem local; a consulta de lojas/métricas externas está indisponível.                                             | Mostrar a conexão e os dados reais da loja autorizada.                                                                                                       |
| Entrada do plano  | `src/features/sll/plan-intake.ts` e `server/plan-actions.ts` guardam somente a faixa de idade da loja, por usuário. Há uma opção explícita para exatamente sete dias. | Acrescentar a estratégia de tráfego, o contexto da loja, versões do plano e evolução das tarefas. O cadastro da resposta atual não gera um plano adaptativo. |
| Métricas          | Não foi encontrada coleta de visualizações, cliques ou CTR para esse assistente.                                                                                      | Validar os recursos da API e criar coleta, histórico e critérios de análise.                                                                                 |
| Catálogo          | `src/features/shopee/catalog.ts` e a tabela `supplier_catalog` têm contrato de produto e validações locais.                                                           | Conectar fornecedor real, selecionar e publicar produtos; implementar a estratégia dos cinco produtos e cinco dias.                                          |
| Aulas             | O SLL já tem aulas, blocos de vídeo, materiais, rascunhos, publicação e progresso.                                                                                    | Relacionar aulas às ações do plano e acrescentar variantes de vídeo por expert.                                                                              |
| Origem da compra  | O mapeamento Hotmart atual associa produto a acesso; não há identificação de expert na matrícula.                                                                     | Definir o dado confiável de origem e mapear compra/acesso à experiência Pri ou Zé.                                                                           |
| Cache de conteúdo | O catálogo publicado usa cache compartilhado em `src/features/sll/server/catalog.ts`.                                                                                 | Incluir a variante relevante nas consultas/chaves para não exibir o apresentador errado entre compradores.                                                   |
| Bling             | Há um piloto privado da própria empresa, documentado em `docs/INTEGRACAO-BLING.md`.                                                                                   | Não presumir que esse piloto fornece o catálogo dos fornecedores ou integra as lojas das alunas. Confirmar a fonte necessária antes de reaproveitar.         |

Esta inspeção comprova o que há no checkout. Ela não revalida credenciais ou o estado atual das lojas em produção.

## 4. Fluxos que precisamos entregar

### 4.1 SLL: cadastro, conexão e plano de execução

1. A pessoa compra SLL por um dos braços de venda e entra na experiência correspondente.
2. Se ainda não é vendedora, recebe o passo a passo para completar o cadastro na Shopee. Se já tem loja, segue para a conexão.
3. Autoriza a própria loja. O sistema distingue cadastro informado, autorização concluída e dados realmente disponíveis.
4. Informa/confirma a idade da loja. Para loja nova, escolhe orgânico, híbrido ou pago.
5. Loja nova recebe um roteiro de sete dias aprovado pela metodologia, com ações claras e aulas relacionadas.
6. Loja com histórico recebe orientação apoiada nos dados disponíveis e nas regras aprovadas.
7. O sistema acompanha as tarefas e explica as próximas ações, mantendo o progresso das aulas separado da execução comercial.

| Caminho  | Orientação citada nos áudios                                                                                             | Entrega prevista                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Orgânico | Ações sem investimento em mídia; exemplo de vídeos com IA.                                                               | Roteiro aprovado, instruções e aulas sobre execução gratuita.                                                                           |
| Híbrido  | Combinar ações orgânicas e pagas; foram citados Shopee Vídeos, Instagram e vídeos de IA, dentro de uma estratégia mista. | Roteiro que distingue as duas frentes e explicita o investimento previsto.                                                              |
| Pago     | Ações com investimento; foram citados Shopee Ads e contratação de UGC.                                                   | Roteiro aprovado e acesso às instruções; contratar criadores e gastar em anúncios não decorre automaticamente de escolher esse caminho. |

Os exemplos não especificam o calendário completo de cada dia. Pri/Zé precisam fornecer ou aprovar os roteiros. A escolha “pago” não informa, por si só, qual é o orçamento disponível.

O caso de exatamente sete dias precisa de decisão. Proposta: tratar como “sete dias ou mais” e verificar se existem dados suficientes. A opção explícita já salva no banco deve ser migrada sem perder respostas.

### 4.2 Loja Pronta: publicação inicial e evolução

1. Preservar o trabalho existente de conversa, marca e preparação da conta.
2. Usar o catálogo real do fornecedor escolhido e a orientação de seleção variada/nichada aprovada pela metodologia.
3. Preparar cinco produtos e validar preço, estoque, variações, imagens, categoria e requisitos da loja.
4. Publicar somente os cinco iniciais, registrando os IDs e a confirmação real da Shopee.
5. Acompanhar o desempenho durante cinco dias.
6. Avaliar os dados e explicar quais linhas de produto fazem sentido para as próximas publicações.
7. Preparar e publicar os lotes seguintes conforme essa decisão, a escolha da aluna e a quantidade aprovada, preservando o histórico dos primeiros produtos.

**Os cinco dias desse experimento e os sete dias do plano do SLL são regras diferentes.** Uma loja ter sete dias não significa que já completou a observação dos cinco produtos.

Proposta para a contagem: cinco dias corridos após a confirmação do lote inicial completo. Confirmar com Pri/Zé o marco de início, o tratamento de publicação parcial, o caso de loja com anúncios anteriores e se a contagem de cinco é por anúncio ou por variação.

Não foi informado quantos produtos formam o “restante”. Os exemplos de visualizações e cliques explicam a intenção; não definem uma fórmula final nem comprovam que cinco dias sempre produzam evidência suficiente.

### 4.3 Ferramenta de comparação de categorias

1. Identificar a loja e os dois anúncios que a pessoa quer comparar.
2. Conferir categorias elegíveis, atributos, condições dos anúncios e disponibilidade dos dados.
3. Registrar período, categoria, fotos, alterações e dados de cada anúncio.
4. Comparar resultados por critérios definidos, usando programação e contas reproduzíveis.
5. Apresentar a conclusão, sua base e eventual insuficiência de dados.
6. Orientar a aplicação do resultado aos produtos compatíveis; alterações em lote exigem seleção e conferência antes de executar.

A sugestão de duplicar anúncios mudando foto/categoria é parte do pedido registrado. Antes de oferecer esse modo, precisamos validar as regras vigentes e o suporte da API. Não assumir que a API aceitar a criação garante que a duplicação seja permitida. Se esse modo não for permitido, manter a comparação de anúncios elegíveis/existentes e ajustar o desenho do experimento com Pri/Zé.

Visualizações, cliques e CTR devem ser comparados em períodos compatíveis. A metodologia precisa definir exposição mínima, tratamento de dados ausentes e quais diferenças sustentam uma recomendação. Não calcular CTR quando a definição ou os dados necessários não estiverem disponíveis.

### 4.4 Mesma plataforma, vídeos de Pri ou Zé

Proposta técnica: manter aulas e metodologia comuns e acrescentar variantes de conteúdo por expert, associadas a uma matrícula/acesso com origem conhecida. Evitar duplicar o sistema ou criar cadastros independentes para a mesma pessoa.

- Identificar no checkout/evento validado qual produto/oferta/origem corresponde a Pri ou Zé. Não presumir qual campo da Hotmart contém esse dado.
- Cadastrar e publicar os vídeos correspondentes, preservando rascunho, prévia e edição no painel.
- Definir se toda aula terá variante ou se algumas serão compartilhadas. Os áudios dão boas-vindas e explicação como exemplos; falta o inventário completo.
- Preservar as alunas e os progressos atuais. Para registros antigos sem origem, propor Pri como legado e confirmar antes de migrar.
- Definir o comportamento para quem compra pelos dois experts, troca de oferta ou recebe acesso manual.
- Conferir o expert em páginas, players, materiais e cache. Uma variante ausente não deve mostrar silenciosamente um vídeo de outro apresentador.

Os vídeos do Zé não precisam ser solicitados como nova gravação: o pedido diz que já foram gravados e estavam sendo editados. Precisamos dos arquivos/IDs finais e do mapa das aulas correspondentes.

## 5. Ordem proposta de execução

As etapas abaixo são entregas verificáveis. A divisão é proposta técnica; as regras comerciais pendentes continuam identificadas.

A frente principal é adequar SLL e Loja Pronta à metodologia descrita. A experiência do Zé é uma frente adicional explicitada no último áudio e pode ser entregue separadamente. As possibilidades de assinatura, TikTok e o restante das 23 ferramentas ficam na evolução posterior. Os identificadores abaixo organizam dependências; P02 não é pré-requisito para corrigir os fluxos principais para as compradoras atuais.

| Etapa | Entrega                                                                              | Depende de                                                                     | Critério de conclusão                                                                                                                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P01   | Fechar a matriz da metodologia e provar as capacidades da Shopee.                    | Regras de Pri/Zé, aplicativo autorizado, loja de teste e documentação oficial. | Matriz mostra, para cada métrica/ação, recurso real, escopo, período, limite, evidência e eventual indisponibilidade. Há roteiros aprovados ou lacunas explicitadas.                                                                        |
| P02   | Cadastrar origem/expert e variantes das aulas na plataforma atual.                   | Identificador confiável das vendas e mapa dos vídeos Pri/Zé.                   | Compradores dos dois canais veem o conteúdo correspondente na mesma aplicação; progressos e acessos anteriores são preservados, inclusive com cache.                                                                                        |
| P03   | Permitir conexão da Shopee pelo SLL e compartilhar a infraestrutura com Loja Pronta. | P01 para a autorização real; regras de acesso atuais.                          | Uma conta somente SLL conecta a própria loja; uma conta com ambos reutiliza a conexão de forma coerente; uma conta sem acesso não consegue usar a integração.                                                                               |
| P04   | Coletar e guardar os dados necessários à orientação.                                 | P01 e P03.                                                                     | Dados reais vêm com origem, período e horário da coleta; falha, atraso, ausência e zero são estados distintos. Reexecução não duplica registros.                                                                                            |
| P05   | Entregar o plano de sete dias e o acompanhamento no SLL.                             | Matriz de metodologia de P01; P03/P04 para o caminho baseado em dados.         | Os três caminhos exibem ações aprovadas e aulas relacionadas. Idades da loja e casos sem dados têm tratamento definido. IA explica/orienta dentro das regras aprovadas.                                                                     |
| P06   | Integrar o fornecedor e publicar o lote inicial de cinco produtos da Loja Pronta.    | P01, P03, fornecedor confirmado e permissões de escrita.                       | Cinco publicações reais válidas, IDs salvos, sem duplicação em reenvios; falhas parciais são recuperáveis. Nenhum produto fictício é publicado.                                                                                             |
| P07   | Executar a análise após cinco dias e orientar as publicações seguintes.              | P04 e P06; critérios e marco de contagem aprovados.                            | O lote é avaliado no período correto; a recomendação usa resultados reais e catálogo disponível e explica os casos inconclusivos. Os próximos produtos escolhidos são publicados com a mesma recuperação e rastreabilidade do lote inicial. |
| P08   | Entregar a comparação de categorias.                                                 | P01/P04 e desenho de experimento validado.                                     | Dois anúncios elegíveis são comparados de forma reproduzível, sem IA obrigatória. O modo de duplicação só existe se validado; aplicação do resultado respeita os produtos compatíveis.                                                      |
| P09   | Vincular os vídeos de Matheus às tarefas pertinentes.                                | Arquivos/IDs, autorização de uso e roteiros aprovados.                         | A ação leva à aula correta, com distinção entre ferramenta gratuita e paga e acesso conferido.                                                                                                                                              |
| P10   | Fazer piloto completo e liberar por etapas.                                          | Entregas correspondentes e conteúdo final.                                     | Percurso real de comprador Pri e Zé, SLL sem Loja Pronta, montagem, dados, recomendações e recuperação de falhas é demonstrado antes da liberação ampla.                                                                                    |

P02 e a preparação de conteúdo de P09 podem avançar enquanto as capacidades da API são provadas. O plano SLL para lojas novas pode começar com roteiros aprovados; a parte baseada em dados só pode ser apresentada como automática quando P03/P04 funcionarem.

## 6. Diretrizes técnicas para a implementação

- Reaproveitar Next.js, Postgres, Drizzle, Better Auth, players, editor e componentes existentes. Preservar o design atual.
- Centralizar a conexão da loja e manter a autorização das ações por produto. Preservar vínculo com dona/sessão, cifra dos tokens e isolamento entre sandbox e produção.
- Registrar loja, produto/anúncio, origem do dado, intervalo da métrica e versão da metodologia aplicada. Não misturar o progresso da montagem com o progresso das aulas ou tarefas comerciais.
- Usar tarefas persistidas e execução agendada para coletas e janelas de cinco dias. Uma requisição de navegador ou um processo de instalação não pode ser o único relógio dessas rotinas.
- Preparar importação/publicação para reexecução, limites de API e recuperação de resultado incerto, conciliando IDs antes de repetir operações.
- Usar programação para coleta, comparações e regras fixas. Reservar IA para a orientação que realmente precisa dela, com dados e materiais aprovados e controle de custo.
- Uma recomendação deve informar a evidência utilizada e não inventar métricas, catálogo, resultados ou promessas de venda.
- Preservar cursos e progressos publicados. Planejar migrações aditivas para contexto da loja, planos, experimentos e variantes por expert.

## 7. Decisões e materiais ainda necessários

| Item               | O que falta definir/obter                                                                                                                   | Trabalho que desbloqueia                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Metodologia        | Conteúdo dos sete dias em cada caminho, regras para lojas com histórico, critérios da análise dos cinco produtos e dos testes de categoria. | P01, P05, P07 e P08.                            |
| Limites de tempo   | Exatamente sete dias; início dos cinco dias; dados insuficientes; lote parcial e anúncios anteriores.                                       | Regras de transição e testes.                   |
| Fornecedor         | Confirmar se Stock Shop era apenas o exemplo; identificar fornecedor real, catálogo, integração, preços, estoque e permissões de imagem.    | P06/P07.                                        |
| Shopee             | Provar quais métricas e operações o aplicativo efetivamente pode usar, com os escopos e lojas autorizados.                                  | P01, P03, P04, P06 e P08.                       |
| Dois experts       | Identificador das vendas por Pri/Zé, inventário das aulas, vídeos finalizados e regra para compras por ambos/legado/acesso manual.          | P02.                                            |
| Aulas de Matheus   | Conferir os três vídeos citados e formalizar a autorização de uso solicitada.                                                               | P09.                                            |
| Outras ferramentas | Obter o documento citado com cerca de 23 possibilidades. Não há como especificar seu conteúdo a partir da menção nos áudios.                | Inventário e priorização da evolução posterior. |

Esses itens não impedem concluir o planejamento ou investigar a API. Cada implementação pode avançar até a sua dependência concreta, sem inventar a regra de negócio que falta.

## 8. Ideias futuras preservadas

A menção a TikTok, a outro nível para sellers e a transformar a ferramenta em assinatura fica registrada para avaliação posterior. Os áudios não especificam planos, preço, cobrança, integrações ou migração de assinantes. O foco inicial continua na Shopee e nos fluxos descritos acima. O documento das 23 possibilidades pode alterar essa priorização quando for fornecido.

## 9. Como validar cada entrega

| Área                | Verificação necessária                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acesso              | Somente SLL, somente Loja Pronta quando permitido pela oferta, ambos, nenhum; comprador Pri e Zé; conta bloqueada e acesso removido.                          |
| Conteúdo por expert | Vídeo correto em páginas e players, cache entre usuários, publicação de variante, legado, acesso manual e falta de uma variante.                              |
| Plano SLL           | Menos de sete, exatamente sete e mais de sete dias; três estratégias; loja sem histórico, com dados suficientes, com dados atrasados e com falha de consulta. |
| Cinco produtos      | Limite no servidor, publicação parcial, reenvio após timeout, marco da contagem, virada dos cinco dias e recomendação sem dados suficientes.                  |
| Categorias          | Dados comparáveis, critérios reproduzíveis, elegibilidade das categorias e operação permitida pela plataforma.                                                |
| Operação            | Reinício do worker, atraso de coleta, token vencido/revogado, limite de API e recuperação sem repetir publicações ou cobranças.                               |
| Interface           | Desktop/celular, claro/escuro, teclado, leitor de tela e fluxos sem JavaScript conforme o projeto.                                                            |

Executar os testes unitários, de integração e E2E apropriados a cada alteração, além de typecheck, lint e build. Os testes de integrações simuladas não comprovam disponibilidade da API real: a matriz de capacidades e o piloto precisam de evidência própria.

O marco de sucesso é demonstrar a metodologia completa com dados e conteúdo corretos para cada comprador. Não usar somente uma tela pronta, uma conexão OAuth ou uma simulação como evidência de que o assistente ou a montagem automática estão concluídos.

## 10. Execução autorizada e estado da implementação

Após a aprovação do plano pelo dono, a implementação foi feita na branch `feat/sll-store-assistant`.
O registro de escopo acima continua preservado como referência dos áudios. A descrição atual do
código, os limites operacionais e as dependências externas estão em
[ASSISTENTE-SLL-OPERACAO.md](ASSISTENTE-SLL-OPERACAO.md).

P02–P08 têm fluxos, persistência e verificações locais implementados, com as limitações explícitas
na matriz de capacidades. Isso não encerra seus critérios de operação real: P01 e o piloto P10
continuam dependendo da Shopee, do fornecedor e do conteúdo final. P09 tem o vínculo tarefa/aula
preparado, mas os três vídeos e a autorização de uso ainda não foram fornecidos. Não se afirma
que houve cinco publicações reais, uma chamada paga de IA ou liberação para compradoras reais.
