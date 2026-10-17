# Revisão do sistema — 17 de outubro de 2026

Branch: `feat/sll-store-assistant`. PR: [#132](https://github.com/HanielCota/loja-pronta-prime/pull/132).

A revisão abrange os pontos de entrada HTTP, as Server Actions, as permissões e os fluxos
persistidos da plataforma. O desenho das telas e a separação entre SLL e Loja Pronta foram
preservados. As correções usam o Postgres, o Better Auth, o armazenamento e os componentes já
existentes. Não há alteração de schema nem nova migração nesta revisão.

## Escopo conferido

| Área                   | Conferência                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acesso e perfil        | Login, primeiro acesso, recuperação, limites de tentativas, bloqueio de contas, troca de senha, fotos e isolamento de sessão.                                        |
| Compras e contas       | Hotmart autenticada, eventos repetidos/atrasados, reembolso, liberação/revogação manual, origem Pri/Zé e ações administrativas.                                      |
| Conteúdo e aprendizado | Trilhas, etapas, módulos, aulas, progresso, referências do plano, materiais, capas, banners, recursos, rascunhos, publicação e restauração.                          |
| Loja Pronta            | Conversa, marca, limites de geração/upload, imagens privadas, fases e conexão/publicação de produtos.                                                                |
| Integrações            | Estado OAuth, dono/sessão/aplicativo, cifra, renovação, remoção local da conexão, leituras Shopee/Bling, catálogo, fila e observações do assistente.                 |
| Leads e infraestrutura | Guardas administrativas, validação, conflito de versões, importação/exportação CSV, limites de corpo, armazenamento, cache, cabeçalhos, configuração e dependências. |

As integrações externas continuam sujeitas à matriz de capacidades e ao piloto do
[guia operacional](ASSISTENTE-SLL-OPERACAO.md). A leitura de código e os testes locais não
comprovam escopos da Shopee, configuração da hospedagem, backups ou entrega real de email.

## Problemas corrigidos

### Revogação manual podia ser desfeita por aviso Hotmart simultâneo

O aviso lia a compra e começava a alterá-la antes de obter a trava da conta. Se uma administradora
revogasse o acesso enquanto ele aguardava, o processamento podia restabelecer a compra e o acesso
com uma leitura anterior à revogação. A ordem inversa de travas também permitia deadlock.

Agora o aviso obtém a trava da conta antes de alterar a compra e relê o estado após a espera.
O processamento também mantém uma trava compartilhada dos mapeamentos; as configurações
administrativas esperam os avisos em andamento antes de decidir se um código já foi usado.
O teste segura as linhas e a trava como uma revogação administrativa em andamento e comprova
que o aviso posterior mantém a compra inativa e o acesso removido.

### Upload e edição podiam alterar conteúdo publicado durante outra operação

Aulas, capas e banners decidiam onde gravar pelo estado lido antes do envio ao bucket. Uma
publicação durante esse intervalo fazia o upload terminar diretamente no conteúdo das alunas.
Arquivar o item durante o envio também não impedia a gravação. Edições de textos e materiais
continham a mesma separação entre leitura do estado e escrita.

As operações agora compartilham a trava do item e do rascunho, com o estado atual relido na
transação. Uploads que encontram o item publicado entram no rascunho. Itens arquivados recusam
o envio com HTTP 409 e liberam o arquivo novo sem uso. Salvar aulas e metadados, ordenar/remover
materiais e publicar/despublicar usam a mesma coordenação. A publicação valida a versão que
está sob a trava. Testes cobrem os sete caminhos de edição e as três rotas de upload.

A limpeza após erro também consulta as referências do arquivo antes de removê-lo. Uma falha de
cache após o commit da capa preserva a imagem que o banco já usa, como verificado por uma
falha injetada no teste. Versões publicadas, rascunhos e histórico mantêm seus arquivos.

### Troca normal de senha podia manter outros aparelhos conectados após falha

A senha era confirmada pela API antes de tentar encerrar as outras sessões; a falha dessa
segunda operação era absorvida. Agora a senha e a revogação terminam na mesma transação.
O hash e a verificação continuam usando o contexto do Better Auth. A sessão atual permanece;
conta e sessão são conferidas novamente antes da escrita, e uma mudança concorrente de senha
invalida a confirmação anterior. O helper que absorvia a falha foi removido.

Os testes comprovam a troca, a preservação da sessão atual, a rejeição da senha incorreta e da
sessão encerrada, além do rollback integral quando a exclusão das sessões falha no banco.

### Lista de materiais bloqueava uma aula de apoio já autorizada

A aula e seu download respeitavam a referência de uma ação do plano, mas a lista de materiais
conferia apenas o desbloqueio de toda a etapa. A mesma aluna encontrava permissões divergentes.
A lista passou a usar a mesma decisão da aula, reaproveitando as trilhas já lidas. O teste
confere aula, progresso, listagem e download; retirar a referência fecha somente esse acesso.

### Restauração do email podia disputar a próxima digitação

Ao voltar ao login, o preenchimento do email lembrado criava uma intenção do Conform com
efeito posterior que remontava o campo. A execução no navegador registrou um valor duplicado
ao editar esse email e entrar novamente. A restauração agora atualiza o input existente e
comunica o valor pelo evento nativo, mantendo a proteção para foco ou preenchimento anterior.
O cenário de regressão repete a abertura e a edição imediata em cinco carregamentos.

### Atalho de teclado ficava fora dos marcos de navegação

O axe identificou o link “Pular para o conteúdo” fora de um marco na moldura administrativa.
As molduras do admin e do SLL agora identificam esse atalho em uma navegação nomeada.
O endereço, o foco e as classes visuais do link foram preservados.

### APIs recusavam o subdomínio de leads já autorizado no login

O Better Auth aceitava o domínio principal e o subdomínio de leads, mas a guarda de origem
das APIs aceitava apenas o principal. Presença e uploads administrativos feitos pelo subdomínio
podiam receber HTTP 403. A guarda passou a usar os dois endereços explícitos, preservando as
verificações de sessão e a rejeição de protocolos, portas, caminhos e domínios diferentes.
Os testes cobrem a lista de origens e o comportamento da rota sem autenticação.

### Registro automático de aula podia sobrescrever o botão Voltar

O cenário de avançar à segunda aula, recarregar e voltar falhou também na execução isolada.
O histórico chegava à aula anterior e recebia em seguida uma substituição pelo endereço da aula
atual. O registro de abertura usava uma Server Action em segundo plano, cujo retorno participava
do estado do roteador.

O registro passou para `POST /api/sll/progress/view`, com resposta JSON privada, limite de corpo,
origem explícita, sessão ativa, acesso SLL e a mesma conferência de aula publicada e desbloqueada.
A leitura usa a identidade da sessão. O navegador cancela registros antigos ao sair da aula e
trata falhas sem prometer um salvamento. O cenário completo passou após a correção; os testes
da API também verificam pedidos sem acesso, inválidos e excessivos.

## Validação

- Typecheck, lint e testes unitários: 439 passaram, sem falhas, incluindo os controles de design e de origem.
- Integração com Postgres: 60 passaram em 11 arquivos. Cada execução cria e remove uma base temporária.
- Suíte principal de navegador: 200 dos 201 cenários tiveram execução aprovada, combinando a execução ampla e as reexecuções após as correções. Uma comparação dos nomes dos testes confirmou a cobertura; não foram somados cenários repetidos.
- O cenário pendente é o fluxo completo de geração de logos pela OpenAI, que exige a chave real. O teste de microfone passou com captura e transcrição simuladas apenas no navegador e uma configuração isolada de teste; ele não comprova a API real. As recusas de formato e tamanho usam a rota real.
- Catálogo habilitado: quatro cenários passaram, em celular/computador e nos dois temas, com conferência de preço e fila real no banco isolado. Nenhum worker de publicação foi iniciado nesse teste.
- Produção: dez cenários passaram no build final: oito de planos, experts e cache, mais dois de entrada e navegação das boas-vindas. O worker Node passou com fila e banco isolados. O pacote standalone respondeu login/CSS com HTTP 200, recusou registro sem sessão (401) e origem externa (403), e redirecionou a página protegida (307).
- Vídeo de apresentação opcional (`video/`): os dois testes de duração e integridade do áudio passaram. Não foram geradas novas falas nem renderizados MP4.
- Formatação dos arquivos alterados e `git diff --check`: passaram.

As verificações locais usam serviços locais reais de Postgres e S3. As falhas de banco/cache e as
respostas externas são simuladas somente nos testes pertinentes. Os cenários cobrem desktop e
celular, claro e escuro, acessibilidade, teclado, erros e formulários sem JavaScript. Não há
workflows de GitHub Actions configurados neste repositório.

## Dependências e limites externos

`bun audit --production` da aplicação principal verificou 213 pacotes sem alertas em 17/10/2026. A auditoria completa
continua apontando os dois avisos já registrados na revisão de 6 de outubro:

- `braces@3.0.3`, por `shadcn → fast-glob → micromatch`: aviso alto de esgotamento de pilha em
  padrões profundamente aninhados. A consulta ao registro ainda retorna 3.0.3 como versão atual;
  não há correção publicada conforme [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- `esbuild@0.18.20`, por `drizzle-kit → @esbuild-kit/esm-loader → core-utils`: aviso moderado do
  servidor de desenvolvimento, conforme [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
  Os scripts deste projeto usam Bun para o Drizzle e não iniciam esse servidor esbuild. A versão
  corrigida fica fora do intervalo exigido pelo dependente; não foi imposto um override de API
  incompatível na ferramenta de migração.

A reprodução externa no Panda depende de IDs e permissões válidos; os testes de variantes
conferem a seleção e o isolamento dentro da plataforma. A geração paga de logos e as chamadas
reais da Shopee/Bling/OpenAI/Resend dependem de credenciais
e configuração externas. O fornecedor/feed, os roteiros finais e os vídeos autorizados continuam
listados no guia operacional. Publicação real continua desativada por padrão. Não houve merge,
deploy nem alteração em lojas de compradoras nesta revisão.
