# Complementação da automação — 17/10/2026

Esta entrega complementa a PR #132. O código não comprova credenciais, permissões, conteúdo não fornecido ou publicações reais. O plano original continua em `PLANO-SLL-LOJA-PRONTA-2026-10-17.md`.

## Entregas

- Feed HTTPS agendado por fornecedor, com token privado opcional, snapshot completo, datas originais, importação monotônica, estoque zerado para itens removidos e preparação gradual por loja. Um produto inválido não impede os demais. URLs de imagens usam lista explícita de hosts, DNS público fixado na conexão TLS, sem redirecionamento e com limites de tempo/tamanho.
- Preparação pela API: categoria final, atributos obrigatórios, marca de produto e canais de envio; imagens decodificadas, redimensionadas e enviadas ao Media Space. Uploads são reutilizados quando as URLs de origem não mudam. Dados de categoria e atributos vêm do fornecedor, sem classificação inventada.
- Variações com até duas opções, combinações completas, SKUs próprios, preço e estoque por modelo. O pai começa fora do ar; seu ID é salvo antes das variações. Só é ativado após conferência dos modelos. Falhas incertas não recriam o pai. Há conciliação e ativação explícita de modelos já confirmados.
- Nome, descrição e logo da marca podem ser enviados após confirmação da aluna. Fila, estado anterior e resultado permanecem registrados. A conciliação verifica o perfil real sem repetir a escrita.
- Ajustes de título, descrição, categoria, atributos e imagem de anúncios existentes, com seleção e confirmação em `/sll/anuncios`. Cada anúncio tem uma tarefa e um resultado próprios. Revogação de SLL impede a execução mesmo se Loja Pronta continuar ativa.
- Novos anúncios para comparação, condicionados a `SHOPEE_DUPLICATION_ENABLED`. A confirmação inclui preço, estoque e variantes consultados na loja. Identificadores derivados da intenção impedem duplicação de envio. O original é preservado; novos anúncios precisam de título, categoria e imagem próprios. A primeira coleta completa com o par inicia o experimento uma vez.
- Métricas opcionais reais da API e relatórios de tráfego com origem e período explícitos. Relatórios não são subtraídos como contadores acumulados. CTR só usa cliques/impressões do mesmo relatório e período.
- Roteiros iniciais dos três caminhos publicados na inicialização, com vínculos a aulas existentes/publicadas. A inicialização é repetível e preserva roteiros já publicados e planos em andamento. Não atribui uma aprovação pessoal a Pri ou Zé nem substitui os vídeos de Matheus.
- Inicialização supervisionada de web e worker, heartbeat, `/api/health` e diagnóstico somente leitura. O worker faz parte do comando de produção; não exige configurar manualmente um segundo processo para a instalação padrão.

## Contrato do fornecedor

`SUPPLIER_FEEDS` recebe uma lista JSON de fontes. Cada fonte tem `id`, `name`, `url` HTTPS, `imageHosts`, `intervalSeconds` entre 60 e 600 (padrão 300) e `tokenEnv` opcional. `tokenEnv` contém apenas o nome de uma variável privada no formato `SUPPLIER_<NOME>_TOKEN`. Valores de tokens não ficam no JSON nem no repositório.

O endpoint retorna `{ generatedAt, complete: true, products: [...] }`. `products` usa o contrato `supplierProductSchema` em `src/features/shopee/catalog.ts`. Cada produto tem o mesmo `supplierId` da fonte, SKU único, preço/custo em centavos, estoque, imagens autorizadas, dimensões, peso, data e variações.

Para preparação automática, `marketplace` informa `categoryId`, `brandId` (0 quando aplicável), `attributes: [{id, values: [{id, name}]}]` e `logisticIds` opcionais. A API confirma a compatibilidade; não escolhe valores arbitrários. Todas as combinações de variações devem estar presentes, inclusive as sem estoque.

Na página Produtos, a aluna escolhe o fornecedor configurado e ativa a atualização. A autorização do feed prepara ofertas; a publicação exige confirmação separada. O produto antigo não recupera preço/estoque após chegar uma atualização mais recente. O horário de download não substitui o horário do fornecedor.

Um provedor com outro contrato precisa de um adaptador real. Não foi identificado um fornecedor contratado nem fornecido seu endpoint/credencial nesta sessão. Esta implementação não afirma integração comercial com Stock Shop ou Envio Velox.

## Relatórios de tráfego

`SHOPEE_TRAFFIC_REPORT_URL` aponta para uma fonte HTTPS autorizada; o coletor acrescenta `shopId`. `SHOPEE_TRAFFIC_REPORT_TOKEN` é opcional e enviado somente em Authorization. O retorno segue `trafficReportSchema`: `shopId`, `applicationId`, `source`, `start`, `end` e `items` com `itemId`, `categoryId`, `views`, `impressions`, `clicks`, `sales`.

Contagens são inteiras não negativas; cliques não excedem impressões. Loja, aplicativo, itens únicos e período são conferidos. A origem e o período aparecem na comparação. Falha do relatório não elimina a coleta de anúncios; fica registrada separadamente. Não foi provado que o aplicativo Shopee disponibiliza impressões/cliques diretamente. A fonte de relatórios precisa existir e estar autorizada; não há métricas simuladas em produção.

## Ativação real e materiais pendentes

`SHOPEE_PUBLICATION_ENABLED` e `SHOPEE_DUPLICATION_ENABLED` permanecem desligados por padrão. Os limites de aplicativo, ambiente e piloto continuam obrigatórios no servidor. O modo de duplicação só deve ser habilitado após validação das regras oficiais aplicáveis ao experimento. Uma resposta aceita pela API não comprova permissão comercial.

Faltam credenciais/escopos e loja autorizada para provar as chamadas reais, fonte/contrato do fornecedor, fonte de relatórios quando disponível e acesso ao Coolify para conferir a execução publicada. Nesta sessão, as consultas à documentação oficial Shopee foram recusadas pelo proxy com HTTP 403. Os testes de transporte usam respostas controladas somente em testes.

Os arquivos/IDs finais de Zé, os códigos reais das ofertas e os três vídeos autorizados de Matheus não foram fornecidos. Os editores e vínculos existem; não foram inseridos vídeos substitutos nem oferecido conteúdo inexistente. O documento das cerca de 23 ferramentas também não foi anexado. TikTok e assinatura continuam sem especificação implementável no plano original.

O piloto P10 continua exigindo demonstração real do percurso, inclusive as cinco publicações e a observação de cinco dias. Nenhum teste local ou deploy HTTP substitui esse período. A operação real da IA também exige chave/modelo disponíveis e uma chamada verificada.

## Validação

Passaram 457 testes unitários, 74 testes de integração com Postgres isolado e nove cenários de navegador: cinco de ajustes/experimentos e quatro de publicação com preço alterado. As telas foram verificadas em celular/computador e claro/escuro, incluindo acessibilidade. Typecheck, lint e build de produção passaram.

O runtime standalone aplicou migrações, publicou os três roteiros iniciais, iniciou web/worker e respondeu saúde positiva. O diagnóstico confirmou banco e worker. Encerrar o worker encerrou a web e terminou o supervisor com erro para reinício pela hospedagem. Login, fontes, autenticação e recusas 401/403 foram conferidos no pacote gerado.

Testes locais usam Postgres isolado e transporte externo controlado; os testes de interface nunca iniciam publicação real. O preload `e2e/support/shopee-readonly-api.cjs` exige o nome de banco temporário e não pertence ao runtime de produção. A conferência do deploy real fica registrada no corpo da PR.
