# Assistente SLL e produtos da Loja Pronta

Implementação de 17/10/2026, baseada nos 12 áudios e no plano
[registrado](PLANO-SLL-LOJA-PRONTA-2026-10-17.md). Código e testes locais não comprovam a
liberação das APIs externas. Nenhum anúncio real foi publicado nesta implementação.

## O que cada área faz

- `/sll/plano`: contexto da loja, estratégias orgânica/híbrida/paga, roteiro versionado de sete
  dias e tarefas próprias. Menos de sete dias usa roteiro; exatamente sete ou mais usa histórico.
  Uma tarefa não conclui automaticamente uma aula. Reiniciar preserva o histórico do plano.
- `/sll/minhas-lojas/conectar`: cadastro da vendedora e autorização Shopee usando apenas SLL.
  A conexão é a mesma usada pela Loja Pronta; desconectar afeta ambas. A origem fica no estado
  OAuth e não aceita um endereço de retorno arbitrário. Conectar pelo SLL não avança a montagem.
- `/loja-pronta/produtos`: cinco produtos distintos no primeiro lote; seleção variada exige mais
  de uma categoria, e seleção de nicho usa a mesma categoria preparada. Após a análise, novos
  lotes podem ter de um a cinquenta produtos. Preço e quantidade autorizados ficam registrados.
- `/sll/comparar-categorias`: compara dois anúncios existentes de categorias diferentes,
  no mesmo intervalo. O mínimo inicial de 100 visualizações por anúncio é configurável e é
  somente um filtro de exposição, sem significado de teste estatístico. Ajustes e novos anúncios para experimento são ações separadas em `/sll/anuncios`, quando habilitadas. A comparação não atribui causalidade à categoria.
- `/admin/assistente`: edita e publica roteiros; importa catálogo real; prepara publicações para
  uma loja específica; mostra jobs, falhas e conciliação. Os roteiros iniciais baseados nos áudios são publicados na inicialização, conforme a autorização do dono. Versões existentes são preservadas, sem atribuir aprovação pessoal a Pri ou Zé. Para disponibilizar uma ação com aula,
  selecione uma aula publicada dentro de módulo, etapa e trilha publicados.
- `/admin/experts`: mapeia códigos reais Hotmart para Pri/Zé, cadastra variantes Panda com
  rascunho, prévia e publicação, e define experiências de acessos manuais com registro de ator.

O código não gera um catálogo fictício ou vídeos substitutos. Aulas de Matheus podem ser
criadas no editor existente e vinculadas aos dias, quando os três vídeos e seus direitos de uso
forem fornecidos. Não há um fornecedor escolhido por inferência a partir do exemplo “Stock Shop”.

## Dados e orientação

A coleta usa a conexão cifrada existente. Pagina os anúncios ativos e lê informações básicas e
extras. Cada execução tem loja, aplicativo/ambiente, início, conclusão, estado e snapshots.
Uma coleta parcial nunca substitui uma completa. Ausência é `null`, e zero é mantido como zero.
A interface informa o horário da coleta em Brasília; após 12h sem coleta completa, mostra atraso.

A orientação do histórico usa diferenças entre as duas últimas coletas completas. Informa o
intervalo e não interpreta contador acumulado como desempenho de uma campanha. Regras fixas
sugerem coleta adicional, revisão de exposição, revisão de oferta ou observação. Somente com
`OPENAI_API_KEY` disponível a aluna pode solicitar priorização por IA. `ASSISTANT_AI_MODEL`
seleciona o modelo (padrão `gpt-5-mini`). A IA recebe diferenças numéricas e pares de ações/IDs
permitidos, sem email, senha, tokens ou URLs. A saída estruturada só pode ordenar até três
pares elegíveis; o texto e os fatos exibidos são controlados pelo código.

A entrada da IA limita-se a 24 anúncios elegíveis e uma opção geral; não envia todo o catálogo.
Há no máximo uma tentativa de IA por coleta e três por conta em 24h, inclusive falhas, com
reserva transacional, timeout, limite de saída e sem repetição automática. O recurso não executa
campanhas ou alterações na loja. A chave/modelo precisam ser validados com uma chamada real;
sem chave, regras e comparações continuam disponíveis. Não foi realizada chamada paga nesta entrega.

## Matriz de capacidades e limites atuais

| Operação                                 | Código preparado                                                                | Evidência local                                                        | Dependência externa / limite                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| OAuth SLL/Loja Pronta                    | Estado por dona/sessão/origem, cifra, aplicativo e ambiente                     | Integração de sessão, reuso, expiração, revogação, acesso e sandbox    | Credenciais e aplicativo Shopee autorizado; retorno/IPs/loja e escopos reais                 |
| Listar anúncios e categorias registradas | `get_item_list`, `get_item_base_info`                                           | Paginação e validação de respostas no banco                            | Confirmar contrato e permissões do aplicativo real                                           |
| Visualizações/vendas acumuladas          | `get_item_extra_info`, campos `views`/`sale`                                    | Ausência/zero, falha parcial e intervalos                              | Confirmar disponibilidade, significado, atualização e histórico desses campos no Brasil      |
| Impressões, cliques, CTR                 | Campos reais retornados pela API e adaptador de relatórios por período          | Período/origem preservados e CTR validado                              | Disponibilidade real depende do aplicativo e da fonte autorizada de relatórios               |
| Publicação simples                       | `product/add_item`, uma escrita por item                                        | Cinco itens, parcial, timeout, reexecução, SKU existente e conciliação | Imagens Shopee, categoria/atributos, frete e permissões conferidos; piloto real pendente     |
| Variações de produto                     | Publicação do pai, inicialização dos modelos, leitura de confirmação e ativação | Preços, estoques, combinações, timeout e ID do pai preservados         | Validar limites/contrato no aplicativo Shopee real                                           |
| Marca na Shopee                          | Upload do logo e envio de nome/descrição após confirmação                       | Fila, acesso, revogação e conciliação do perfil                        | Credenciais e permissões reais de perfil/mídia                                               |
| Comparar categorias                      | Dois anúncios existentes, período e limiar iguais                               | Dona, mudança de categoria, ausência e contador reiniciado             | Resultado descritivo; fotos, preço, tráfego e campanhas não são controlados pelo experimento |
| IA                                       | Priorização restrita e controle de custo                                        | Validação das ações/IDs e dados ausentes                               | Chave, modelo e chamada real ainda pendentes                                                 |
| Fornecedor                               | Feed HTTPS agendado, contrato validado, atualização e preparação por loja       | Dados antigos não substituem novos; ausentes perdem estoque            | Falta o endpoint/contrato e a credencial do fornecedor escolhido                             |
| Experts                                  | Origem preservada na compra; variante aplicada após cache comum                 | Compra, reembolso, legado, duas contas e ausência de vídeo             | Códigos reais das ofertas e vídeos finalizados de Zé não fornecidos                          |

A consulta de documentação oficial nesta máquina retornou HTTP 403; ela não foi usada como
prova das capacidades do aplicativo. Antes de ativar escrita, registrar o contrato oficial
atual e o resultado real por endpoint, escopo, loja e ambiente. `SHOPEE_PUBLICATION_ENABLED`
permanece desligado por padrão. O limite `SHOPEE_PILOT_USER_IDS` continua válido no servidor,
inclusive no worker. O modo de novos anúncios para comparação está implementado e permanece desativado por padrão (`SHOPEE_DUPLICATION_ENABLED`). Sua ativação depende da validação das regras da Shopee; o código não é evidência de permissão.

## Catálogo real e preparação da publicação

No painel, envie um JSON com uma lista de registros `{ product, publication? }`. Os formatos
validados estão em `src/features/shopee/catalog.ts` e
`src/features/assistant/model.ts` (`publicationPayloadSchema`). Não envie credenciais no arquivo.

`product` informa fornecedor/SKU, título, descrição, imagens HTTPS, custos e preços em centavos,
estoque, peso em gramas, dimensões em centímetros, `updatedAt` com fuso e variações. O instante
original é preservado: importar novamente não renova artificialmente preço ou estoque. Arquivos anteriores ou conflitantes não substituem uma versão mais recente, inclusive seus
mapeamentos de publicação. Datas futuras são recusadas na importação. Um
produto fica indisponível após 15 minutos sem atualização, com data futura, estoque vazio ou
preço incompatível com o custo.

`publication` é opcional, específico da loja e do aplicativo atuais: título, descrição, categoria,
SKU, preço em reais, quantidade, peso em kg, imagens já hospedadas na Shopee (`image_id_list`),
dimensões, logística habilitada, atributos e marca válidos. Importar exige selecionar a conta
pelo identificador e confirmar a preparação real desses dados. URL de imagem do fornecedor não
vira automaticamente um ID Shopee. O importador não faz upload de imagens nem consulta frete.
Preço/estoque/SKU são conferidos ao importar, selecionar e antes do envio. A seleção inicial
inclui a confirmação da oferta exibida e da dona/loja/aplicativo; mudança de oferta entre abrir
a página e confirmar exige atualizar a seleção. A quantidade do anúncio aparece junto do
estoque do fornecedor. Variações precisam das mesmas opções, combinações completas e SKUs distintos. A confirmação inclui os preços e estoques de cada modelo.

O caminho automático usa `SUPPLIER_FEEDS`, com leitura HTTPS limitada, destinos permitidos e preparação com a API Shopee. O importador manual continua disponível. O contrato e a ativação estão detalhados em [AUTOMACAO-SLL-ENTREGA-2026-10-17.md](AUTOMACAO-SLL-ENTREGA-2026-10-17.md).

## Worker, relógio e recuperação

As migrações aditivas são `0049` a `0053`. Use o migrador normal, preservando o histórico.
No desenvolvimento, com as mesmas variáveis do servidor:

```bash
bun --env-file=.env.local run db:migrate
bun run assistant:worker
# Uma execução curta consome no máximo um job devido e encerra:
bun run assistant:worker --once
```

O worker é um processo separado do Next. Conectar a loja agenda a primeira coleta; uma coleta
bem-sucedida agenda outra em seis horas. Falhas temporárias de consulta também mantêm a
próxima coleta; acesso removido ou configuração ausente não geram novas tentativas automáticas. A aluna também pode solicitar atualização, com deduplicação
em janelas de quinze minutos. A fila usa `FOR UPDATE SKIP LOCKED`, concessão de cinco minutos e
renovação a cada trinta segundos. Ao reiniciar, leituras interrompidas e publicações que ainda não chegaram a `sending` voltam
à fila. Escritas iniciadas sem resposta confirmada passam a resultado incerto. O worker antigo
precisa manter a posse da tarefa para iniciar a escrita e não pode interferir na nova tentativa.
Uma resposta real recebida após a expiração ainda é persistida como confirmação, sem reenviar. A rotina verifica novamente acesso, bloqueio da conta,
configuração do piloto e vínculo da loja antes de cada job.

O lote inicial só começa a observação quando **todos** os anúncios estão confirmados, nunca na seleção,
na primeira tentativa ou no primeiro anúncio. O relógio soma cinco períodos de 24h ao último
anúncio confirmado. A avaliação também exige duas coletas completas cobrindo ao menos cinco
dias após esse marco e dados válidos dos cinco anúncios. A coleta inicial atrasada pode atrasar
a análise; o sistema informa essa espera. Mudança de categoria, item ausente ou queda/ausência
intermediária do contador impede uma conclusão. O maior ganho observado de visualizações pode
orientar a próxima seleção, com empate e zeros explícitos e sem promessa de vendas.

Antes da escrita, o worker procura o SKU em anúncios ativos, não listados e banidos, e bloqueia
se já existir. Depois de um timeout ou queda de processo, **não reenvie** o anúncio: o painel
consulta esses mesmos estados e só concilia um SKU único com título correspondente. Ausência ou
ambiguidade permanece pendente, sem repetição automática. Se a última confirmação vier dessa
conciliação, o mesmo relógio e os mesmos jobs são criados uma única vez.

Erros definitivos ficam bloqueados. Após corrigir a integração/catálogo/mapeamento, o admin pode
recolocar o job na fila. A correção do payload só é reaproveitada se preservar SKU, preço e
quantidade autorizados. Se o preço mudar, a seleção existente continua bloqueada até nova confirmação da aluna em Produtos.
A tela mostra preço anterior, preço e quantidade atuais; a conferência dos dados evita confirmar
uma oferta que mudou depois da leitura. A confirmação atualiza o mesmo item e seu horário de
autorização e recoloca somente aquele job na fila. Itens incertos nunca usam esse caminho.

Os lotes seguintes terminam como publicados quando todos os seus itens são confirmados.
Eles não prometem uma nova análise de cinco dias, reservada ao lote inicial.

## Produção

O comando do `railpack.json` inicia `start-production.mjs`. Ele aplica as migrações, disponibiliza os roteiros iniciais ausentes e inicia web e worker sob supervisão no mesmo container. A queda de um dos processos encerra o outro com SIGTERM; após 30 segundos, processos que não terminarem recebem SIGKILL. A hospedagem deve manter a política de reinício.

`GET /api/health` responde 200 somente quando o banco pode ser consultado e existe um heartbeat de worker com menos de 90 segundos. Caso contrário, responde 503. O endpoint não expõe configuração. Configure o health check do Coolify nesse caminho. O `/api/auth/ok` continua sendo apenas o teste HTTP da autenticação.

O pacote inclui `assistant-worker.cjs` e `automation-check.cjs`. O diagnóstico é somente leitura:

```bash
cd /app/build/runtime
node automation-check.cjs
```

Mostra presença de configuração, estratégias publicadas, saúde do worker e contagens de resultados incertos, sem credenciais ou dados pessoais. No desenvolvimento: `bun run assistant:worker` e `bun run assistant:check`. O modo `--once` continua disponível para execução limitada. As migrações adicionais desta entrega são `0054` a `0057`.

## Conteúdo, compras e o que falta para o piloto real

Códigos de produto Hotmart identificam o expert. Uma nova compra salva essa origem, e atualizações
ou reembolsos não a reescrevem. Compras ativas de ambos os experts permitem escolher. Ao reembolsar
um deles, apenas a experiência correspondente deixa de ser elegível, salvo acesso manual explícito.
O padrão legado é Pri. A atribuição manual registra administrador e data, sem liberar o produto.
O ID da aula e o progresso permanecem comuns. Para Zé, falta de variante publicada mostra “Vídeo
em breve”; nunca usa um rascunho ou um vídeo da Pri silenciosamente. Materiais comuns permanecem comuns.

Antes de liberar para alunas reais, faltam entradas externas concretas: aplicativo/loja/escopos
Shopee, contrato do fornecedor e sua atualização automática, payloads reais conferidos, roteiros
editoriais finais e aulas correspondentes, vídeos e códigos de compra de Zé, e os três vídeos de
Matheus com autorização de uso. A lista das cerca de 23 ferramentas não foi anexada. Assinatura,
cobrança e TikTok permanecem evolução posterior, como registrado no plano.

A oferta adicional da Loja Pronta pode usar `LOJA_PRONTA_CHECKOUT_URL` com o checkout HTTPS real.
Sem esse endereço, a página explica o acesso adicional e não cria uma compra fictícia.

## Verificações da revisão

A suíte `test:integration` cobre oferta alterada entre exibição e seleção, estoque alterado durante
busca de SKUs, retomada de tarefa sem envio, resposta após expiração, continuidade de coleta e
importações atrasadas/concorrentes. Para conferir o catálogo habilitado no navegador, use:

```bash
bun --env-file=.env.local run test:e2e --config=playwright.assistant.config.ts
```

Essa configuração aplica credenciais exclusivamente de teste ao servidor do banco temporário.
Não inicia worker nem realiza publicações na Shopee. Os cenários verificam a mudança de preço
antes da confirmação em celular/computador e nos dois temas, com a fila real no banco isolado.
