# URLs dos vídeos Panda do SLL

Catálogo das 71 aulas com player da área [SLL](https://membros.escalashop.com.br/sll), conferido em **7 de outubro de 2026**. São **70 vídeos únicos**. A Etapa 2 reutiliza aulas da Etapa 1 e da Biblioteca.

Os dados estruturados estão em [`data/sll/panda-videos.json`](../data/sll/panda-videos.json). Cada aula tem título, ordem, página de origem, URL completa do player e ID Panda. Os campos `project` e `projectLessonSlug` identificam a aula correspondente nos importadores deste projeto.

As URLs foram lidas do atributo `src` dos players incorporados. Os IDs alimentam o player das aulas e das prévias do admin. A reprodução foi conferida no projeto local, com navegação entre aulas e visualização no computador e celular, nos temas claro e escuro. A validação não reproduziu os 70 vídeos individualmente nem verificou o domínio de produção.

## Vincular os vídeos ao banco

Depois de importar a estrutura das aulas do SLL, execute no banco do ambiente desejado:

```bash
bun run db:import-sll-videos --check # informa o que será preenchido
bun run db:import-sll-videos         # vincula os IDs às aulas existentes
```

O script usa a conexão de `.env.local`, como os demais comandos de banco. A importação é transacional e pode ser repetida: preenche espaços vazios ou adiciona o bloco de vídeo quando ele não existe. Preserva vídeos diferentes já editados, aulas com rascunho pendente, textos, materiais, publicação e progresso. Se faltar uma aula, interrompe antes de escrever e informa qual estrutura precisa ser importada.

No banco local, foram adicionados 50 blocos e preenchidos 21 espaços. A conferência seguinte encontrou as 71 aulas já vinculadas. A Etapa 2 mantém seus links para essas aulas, sem duplicar vídeos. Para trocar um vídeo, use o campo “Link ou ID do vídeo Panda” no editor da aula; alterações publicadas continuam seguindo o fluxo de rascunho e publicação do admin.

## Quantidade por seção

| Seção                                | Aulas com player |
| ------------------------------------ | ---------------: |
| Comece aqui                          |                6 |
| Etapa 1                              |               15 |
| Etapa 3 — Biblioteca de Conhecimento |               19 |
| Shopee ADS - Do Zero                 |               12 |
| Afiliados do Vendedor                |                8 |
| Blindada De Mim Mesma                |               11 |
| Total                                |               71 |

## Comece aqui

| Ordem | Aula                                              | Página de origem                                                                                           | Player Panda                                                                                                     |
| ----: | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Boas-vindas ao SLL                                | [Abrir aula](https://membros.escalashop.com.br/sll/comece-aqui?aula=boas-vindas)                           | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=9d49ad09-6743-43db-9672-d9a90c68575d) |
|     2 | A tribo das soberanas                             | [Abrir aula](https://membros.escalashop.com.br/sll/comece-aqui?aula=a-tribo-das-soberanas)                 | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=0bebd2fd-4c28-47d5-b570-459e5ba74133) |
|     3 | A decisão para se tornar uma soberana             | [Abrir aula](https://membros.escalashop.com.br/sll/comece-aqui?aula=a-decisao-para-se-tornar-uma-soberana) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=31cd6a6f-b7dc-4542-9da6-ed2d464cd360) |
|     4 | Como eu saí de CLT para faturar mais de 2 milhões | [Abrir aula](https://membros.escalashop.com.br/sll/comece-aqui?aula=de-clt-a-2-milhoes)                    | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=8d4e27be-7211-41e7-b481-8c2cc33de949) |
|     5 | Entrevista Lari e Leo                             | [Abrir aula](https://membros.escalashop.com.br/sll/comece-aqui?aula=entrevista-lari-e-leo)                 | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=59426f57-bb38-42c8-9fb3-2701bcf37c35) |
|     6 | Você vai agir por decisão e não por condição      | [Abrir aula](https://membros.escalashop.com.br/sll/comece-aqui?aula=agir-por-decisao)                      | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=58b7f164-5ae2-4ccb-b107-3bf2ae5868aa) |

## Etapa 1 — Sua loja no ar em 7 dias

### Passo 1 — Ativando Sua Conta de Vendedora em 10 minutos

| Ordem | Aula                                              | Página de origem                                                            | Player Panda                                                                                                     |
| ----: | ------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Comece por aqui                                   | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/1) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=44408d11-f282-4a43-9949-8b3c44b94ee4) |
|     2 | Credenciamento na Shopee + vinculação Escala Shop | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/1) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=0b7a6732-eb05-417b-9882-5f82fd0d1a58) |

### Passo 2 — Resgate Seus Produtos Validados Pra Vender

| Ordem | Aula                                              | Página de origem                                                            | Player Panda                                                                                                     |
| ----: | ------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Se ambientando com a Envio Velox                  | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/2) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=505dc639-8eef-419e-9b85-0d32b6468887) |
|     2 | Conectando sua loja na Envio Velox + Fornecedor   | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/2) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=ed0c85a8-f080-45b0-9d74-3c0fac16b79a) |
|     3 | Configurações essenciais da loja (pós-fornecedor) | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/2) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=0f6faae7-e265-43a0-999e-fde1b914fe80) |

### Passo 3 — Colocando Seus Produtos no Ar Com Poucos Cliques

| Ordem | Aula                                  | Página de origem                                                            | Player Panda                                                                                                     |
| ----: | ------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Criando anúncios automáticos — Fotos  | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/3) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=f32dabf6-93be-456b-a359-a9576a07752d) |
|     2 | Títulos, Descrição e Precificação     | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/3) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=9e6a17d5-b60f-4c04-8275-cd9e05f2e8b8) |
|     3 | Categoria do produto — o GPS da venda | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/3) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=0f2c3049-11bc-49ef-bc4c-7dc244317104) |
|     4 | Especificações do produto             | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/3) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=f02ea8c0-ae4a-4cb7-a0bc-7917a3c89721) |
|     5 | Informações Fiscais                   | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/3) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=2a05978e-4bd9-4e1c-b912-99dd524b737f) |

### Passo 4 — Bora Comemorar Sua Primeira Venda?

| Ordem | Aula                                                   | Página de origem                                                            | Player Panda                                                                                                     |
| ----: | ------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Ativar uma promoção                                    | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/4) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=8fb68ac0-9d48-4f1d-b2c7-06c2b4c599d8) |
|     2 | Impulsionar anúncios gratuitamente                     | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/4) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=ca93c11e-550f-42cf-976e-1bf79285c56c) |
|     3 | Envio de pedidos — quem NÃO é assinante da Envio Velox | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/4) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=a356dda4-b74b-490e-8be1-ca2d6f22db06) |
|     4 | Envio de pedidos — quem É assinante da Envio Velox     | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/4) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=bc34236a-8395-4d5b-9a12-6047a61f7f60) |
|     5 | Próximos passos — o que fazer agora                    | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/missao/1/etapa/4) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=2eb94f03-3d8d-4870-b139-fbb80c455356) |

## Etapa 3 — Biblioteca de Conhecimento

### Conheça sua nova fonte de renda

| Ordem | Aula                    | Página de origem                                                                    | Player Panda                                                                                                     |
| ----: | ----------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | O que é um marketplace? | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/o-que-e-marketplace) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=017c676d-533b-4bfa-b70a-d125da557377) |
|     2 | Por que a Shopee?       | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/por-que-a-shopee)    | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=7721d5e3-de57-41ea-a514-9cdb9fd618e3) |

### Pedido

| Ordem | Aula                | Página de origem                                                                    | Player Panda                                                                                                     |
| ----: | ------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Como gerar etiqueta | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/como-gerar-etiqueta) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=9d9bdbfc-e5a9-41cd-bd6d-daa7c6125331) |

### Central de Marketing

| Ordem | Aula                                          | Página de origem                                                                         | Player Panda                                                                                                     |
| ----: | --------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Desconto                                      | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/desconto)                 | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=2438bd11-391a-43dd-90ae-b9e6d7fffade) |
|     2 | Oferta Relâmpago da Loja                      | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/oferta-relampago-da-loja) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=621a6734-9668-4767-95a3-b3d5cd2f9462) |
|     3 | Cupons                                        | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/cupons)                   | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=bc02f9c3-7867-411a-b4c0-cc4aa787c0a8) |
|     4 | Campanha — se inscrevendo em ofertas oficiais | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/campanha)                 | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=8bd4b495-bd00-43ee-93b3-ee7f6557a437) |

### Estratégias de visibilidade

| Ordem | Aula                                      | Página de origem                                                                                         | Player Panda                                                                                                     |
| ----: | ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Duplicando anúncios do jeito certo        | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/duplicando-anuncios-do-jeito-certo)       | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=85eff1db-bb6e-42e7-878c-8460063c96b5) |
|     2 | Teste de categoria                        | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/teste-de-categoria)                       | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=2252af34-236a-4d03-b6f8-8e3b5dba3d6b) |
|     3 | Como conseguir vídeos para Shopee Vídeos? | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/como-conseguir-videos-para-shopee-videos) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=dafc236c-7d4d-41fd-a439-e6895db53fb4) |
|     4 | Como conseguir as primeiras avaliações?   | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/como-conseguir-primeiras-avaliacoes)      | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=0d4bd4db-04af-4743-876d-189634dd1bb5) |

### Atendimento ao cliente

| Ordem | Aula                                 | Página de origem                                                                                  | Player Panda                                                                                                     |
| ----: | ------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Chat de Ouro, Avaliações e Reputação | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/chat-de-ouro-avaliacoes-reputacao) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=e114fc65-322d-46ae-aa41-8e2ef3730df7) |

### Finanças

| Ordem | Aula              | Página de origem                                                                  | Player Panda                                                                                                     |
| ----: | ----------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Minha Renda       | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/minha-renda)       | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=a916b27d-9068-45aa-aebb-a3cd81a1a6c3) |
|     2 | Saldo da Carteira | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/saldo-da-carteira) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=cb00889e-db36-46cc-8cc8-51dfd5c1dc6c) |

### Dados

| Ordem | Aula                   | Página de origem                                                                       | Player Panda                                                                                                     |
| ----: | ---------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Informações Gerenciais | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/informacoes-gerenciais) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=34cd7ce9-b04e-4a00-b91e-08aabd32bc10) |
|     2 | Desempenho da Conta    | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/desempenho-da-conta)    | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=eef9de3d-33d3-4d48-b5be-d4334237805d) |

### Loja

| Ordem | Aula                  | Página de origem                                                                      | Player Panda                                                                                                     |
| ----: | --------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Decoração da Loja     | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/decoracao-da-loja)     | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=72ea4381-792b-421f-a5c7-0a760b6d8fd9) |
|     2 | Configurações da Loja | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/configuracoes-da-loja) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=0f6faae7-e265-43a0-999e-fde1b914fe80) |
|     3 | Gestão de Contestação | [Abrir aula](https://membros.escalashop.com.br/sll/metodo/aula/gestao-de-contestacao) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=ae0c4aa6-d107-4469-9bef-73a03409437f) |

## Cursos complementares

### Shopee ADS - Do Zero

| Ordem | Aula                                | Página de origem                                                                                                        | Player Panda                                                                                                     |
| ----: | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Introdução às aulas                 | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/shopee-ads-completo/aula/introducao-as-aulas-ze)              | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=f2004b88-65d2-4eef-977e-030e64599ac3) |
|     2 | Introdução ao curso                 | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/shopee-ads-completo/aula/introducao-ao-curso)                 | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=40075dbd-3dc1-45fd-9541-3abf18e4a1bc) |
|     3 | Introdução ao Shopee Ads            | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/shopee-ads-completo/aula/introducao-ao-shopee-ads)            | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=e51f2107-b3c8-4b5f-8231-70434b02c601) |
|     4 | Os 3 erros que iniciantes cometem   | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/shopee-ads-completo/aula/os-3-erros-que-iniciantes-cometem)   | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=26da5ac0-e5fc-4419-a500-f29c4b3cddda) |
|     5 | Encontrando seu ROAS perfeito       | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/shopee-ads-completo/aula/encontrando-seu-roas-perfeito)       | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=3acd66c7-8ae0-4045-89df-8e4198abf30e) |
|     6 | Promover novos produtos             | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/shopee-ads-completo/aula/promover-novos-produtos)             | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=a569923d-1a24-48a8-b045-e6e74ac673d6) |
|     7 | Promover produtos com avaliação     | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/shopee-ads-completo/aula/promover-produtos-com-avaliacao)     | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=180bce6b-920e-4aa8-b95f-792596fd5334) |
|     8 | GMV Max da Loja                     | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/shopee-ads-completo/aula/gmv-max-da-loja)                     | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=40848968-0d15-432b-8340-dc52bef27902) |
|     9 | Métricas dos anúncios               | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/shopee-ads-completo/aula/metricas-dos-anuncios)               | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=fc2788ef-e122-4bc3-8826-c36b1ded1d84) |
|    10 | O que fazer para melhorar o anúncio | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/shopee-ads-completo/aula/o-que-fazer-para-melhorar-o-anuncio) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=d5ea6dde-c0d4-4f65-9649-53adda2103ce) |
|    11 | Como evitar o prejuízo              | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/shopee-ads-completo/aula/como-evitar-o-prejuizo)              | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=b246ebeb-dbc1-40fa-b59d-29fa72784c0a) |
|    12 | Métricas dos anúncios (parte 2)     | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/shopee-ads-completo/aula/metricas-dos-anuncios-parte-2)       | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=c828bba3-19e0-4c89-aa28-48f9cb3305b7) |

### Afiliados do Vendedor

| Ordem | Aula                            | Página de origem                                                                                                     | Player Panda                                                                                                     |
| ----: | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Introdução                      | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/afiliados-do-vendedor/aula/introducao)                     | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=10537723-617d-4681-90ca-61cbfad26485) |
|     2 | Como funciona para o afiliado   | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/afiliados-do-vendedor/aula/como-funciona-para-o-afiliado)  | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=2959c340-f620-466b-8a76-ee1da23b7d91) |
|     3 | Qual comissão oferecer          | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/afiliados-do-vendedor/aula/qual-comissao-oferecer)         | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=3016b4e7-a32c-42ef-b76c-586766c23fe2) |
|     4 | Campanha aberta                 | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/afiliados-do-vendedor/aula/campanha-aberta)                | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=f07252da-01a1-4586-b0c4-146c0d3d4364) |
|     5 | Como atrair organicamente       | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/afiliados-do-vendedor/aula/como-atrair-organicamente)      | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=ae513e51-131c-44cc-8447-1de087e47e54) |
|     6 | Campanha exclusiva              | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/afiliados-do-vendedor/aula/campanha-exclusiva)             | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=783c2dad-fe8d-495e-87ad-b10191c15950) |
|     7 | Vale a pena para o meu produto? | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/afiliados-do-vendedor/aula/vale-a-pena-para-o-meu-produto) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=447b0244-085b-4311-9068-2cdb72675ede) |
|     8 | Atualizações fiscais            | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/afiliados-do-vendedor/aula/atualizacoes-fiscais)           | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=15aa3e01-d081-4591-b60d-521acb6d2a90) |

### Blindada De Mim Mesma

| Ordem | Aula                                            | Página de origem                                                                                                   | Player Panda                                                                                                     |
| ----: | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
|     1 | Seja bem-vinda                                  | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/mentalidade-blindada/aula/seja-bem-vinda)                | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=d48212fc-f743-4670-9f4d-389878b0d3f2) |
|     2 | Quem é Prisciane Pereira de verdade             | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/mentalidade-blindada/aula/quem-e-prisciane-pereira)      | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=aaedcf24-765a-46ac-b230-615c34a8524b) |
|     3 | O foco no que você controla                     | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/mentalidade-blindada/aula/o-foco-no-que-voce-controla)   | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=1dbffddb-d462-434e-9d95-62696970edc8) |
|     4 | A comparação acaba com o que você nem construiu | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/mentalidade-blindada/aula/a-comparacao)                  | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=1b1d2f08-4ff9-4064-a5a3-b0d64d34684c) |
|     5 | O ambiente forma quem você é                    | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/mentalidade-blindada/aula/o-ambiente-forma-quem-voce-e)  | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=36eec2f6-8fce-4e58-9287-0afca8f65f82) |
|     6 | Um plano ruim bem executado                     | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/mentalidade-blindada/aula/um-plano-ruim-bem-executado)   | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=3438a9aa-07a7-4a93-bfa9-e1788b3767ad) |
|     7 | O que me fez de fato ser próspera               | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/mentalidade-blindada/aula/o-que-me-fez-ser-prospera)     | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=92e2e817-5fbb-44b3-8587-9fd0de5190ba) |
|     8 | Propósito é diferente de meta                   | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/mentalidade-blindada/aula/proposito-e-diferente-de-meta) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=41864503-836e-4360-a35b-d8435d9bbf76) |
|     9 | Você acredita de verdade em Deus                | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/mentalidade-blindada/aula/voce-acredita-em-deus)         | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=deb51b06-7745-4029-bfc9-331ffa06b3e1) |
|    10 | Você nasceu para prosperar                      | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/mentalidade-blindada/aula/voce-nasceu-para-prosperar)    | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=e227ecc1-89eb-4fa5-80a8-793423d52508) |
|    11 | Estabeleça uma relação verdadeira com Deus      | [Abrir aula](https://membros.escalashop.com.br/sll/cursos/mentalidade-blindada/aula/relacao-verdadeira-com-deus)   | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=cbe6c71f-2a08-42af-b990-d3bcdfddb79a) |

## Etapa 2 — Aulas relacionadas

O plano tem seis ações principais e sete complementares. A primeira ação é somente texto; as outras 12 referências abrem 11 aulas já listadas acima.

| Tipo e ordem   | Ação                                              | Aula relacionada                                                                                                                        | Player Panda                                                                                                     |
| -------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Dia 1          | Completar o perfil da loja (foto, nome, bio)      | Somente instruções                                                                                                                      | Sem vídeo                                                                                                        |
| Dia 2          | Reescrever título e descrição dos seus 5 produtos | [Títulos, Descrição e Precificação](https://membros.escalashop.com.br/sll/metodo/aula/titulos-descricao-precificacao)                   | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=9e6a17d5-b60f-4c04-8275-cd9e05f2e8b8) |
| Dia 3          | Trocar a foto de capa de cada anúncio             | [Criando anúncios automáticos — Fotos](https://membros.escalashop.com.br/sll/metodo/aula/anuncios-automaticos-fotos)                    | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=f32dabf6-93be-456b-a359-a9576a07752d) |
| Dia 4          | Ativar desconto nos seus produtos                 | [Desconto](https://membros.escalashop.com.br/sll/metodo/aula/desconto)                                                                  | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=2438bd11-391a-43dd-90ae-b9e6d7fffade) |
| Dia 5          | Organizar atendimento e pedidos                   | [Como gerar etiqueta](https://membros.escalashop.com.br/sll/metodo/aula/como-gerar-etiqueta)                                            | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=9d9bdbfc-e5a9-41cd-bd6d-daa7c6125331) |
| Dia 6          | Conferir as ações e os primeiros dados            | [Informações Gerenciais](https://membros.escalashop.com.br/sll/metodo/aula/informacoes-gerenciais)                                      | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=34cd7ce9-b04e-4a00-b91e-08aabd32bc10) |
| Complementar 1 | Criar cupom de novo seguidor                      | [Cupons](https://membros.escalashop.com.br/sll/metodo/aula/cupons)                                                                      | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=bc02f9c3-7867-411a-b4c0-cc4aa787c0a8) |
| Complementar 2 | Publicar 3 vídeos curtos no Shopee Vídeos         | [Como conseguir vídeos para Shopee Vídeos?](https://membros.escalashop.com.br/sll/metodo/aula/como-conseguir-videos-para-shopee-videos) | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=dafc236c-7d4d-41fd-a439-e6895db53fb4) |
| Complementar 3 | Criar uma Oferta Relâmpago                        | [Oferta Relâmpago da Loja](https://membros.escalashop.com.br/sll/metodo/aula/oferta-relampago-da-loja)                                  | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=621a6734-9668-4767-95a3-b3d5cd2f9462) |
| Complementar 4 | Duplicar seus 2 melhores anúncios                 | [Duplicando anúncios do jeito certo](https://membros.escalashop.com.br/sll/metodo/aula/duplicando-anuncios-do-jeito-certo)              | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=85eff1db-bb6e-42e7-878c-8460063c96b5) |
| Complementar 5 | Aprender a gerar etiqueta antes do 1º pedido      | [Como gerar etiqueta](https://membros.escalashop.com.br/sll/metodo/aula/como-gerar-etiqueta)                                            | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=9d9bdbfc-e5a9-41cd-bd6d-daa7c6125331) |
| Complementar 6 | Responder o chat em até 12 horas                  | [Chat de Ouro, Avaliações e Reputação](https://membros.escalashop.com.br/sll/metodo/aula/chat-de-ouro-avaliacoes-reputacao)             | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=e114fc65-322d-46ae-aa41-8e2ef3730df7) |
| Complementar 7 | Conseguir suas primeiras avaliações               | [Como conseguir as primeiras avaliações?](https://membros.escalashop.com.br/sll/metodo/aula/como-conseguir-primeiras-avaliacoes)        | [Abrir vídeo](https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=0d4bd4db-04af-4743-876d-189634dd1bb5) |

## Vídeo reutilizado

“Configurações essenciais da loja (pós-fornecedor)”, no Passo 2 da Etapa 1, e “Configurações da Loja”, na categoria Loja da Biblioteca, incorporam o mesmo vídeo Panda: `0f6faae7-e265-43a0-999e-fde1b914fe80`. As duas aulas continuam registradas separadamente no catálogo.

## Organização dos dados

- `sections`: Comece aqui, Etapa 1, Biblioteca e cursos, na ordem do SLL.
- `groups`: passos, categorias ou cursos, com a identificação correspondente no projeto.
- `lessons`: ordem começando em 1 dentro do grupo, título e URLs observados.
- `stage2.references`: ligações do plano com as aulas completas.
- `videoId`: parâmetro `v` da URL do player.
- `embedUrl`: URL completa observada no player; não é endereço de arquivo MP4.

Na Etapa 1, várias aulas usam o mesmo endereço de página do passo. Para localizar uma aula na origem, abra o passo e escolha o título na lista lateral. No projeto, use a combinação de `trackSlug`, `stageSlug`, `moduleSlug` e `projectLessonSlug`, pois alguns slugs diferem dos usados no site antigo.
