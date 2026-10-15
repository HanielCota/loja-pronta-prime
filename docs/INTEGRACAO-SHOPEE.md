# Integração Shopee

Atualizado em 15 de outubro de 2026. O dono escolheu o aplicativo **Escala Shop** existente,
que aparece como Online na Shopee Open Platform. O dono autorizou migrar os domínios de retorno
para `https://lojaprontaprime.com/`, usando `/api/shopee/callback` no modo automático.
O modo manual continua disponível para cadastros que precisem manter um retorno antigo:
a aluna autoriza na Shopee e cola o endereço de retorno na Loja Pronta Prime. Ambos usam a
mesma validação de sessão, estado, código único e tokens cifrados.
O piloto é restrito a contas escolhidas. Uma loja live ainda precisa autorizar o aplicativo para
validar a conexão live; o login de desenvolvedor permite criar e testar lojas sandbox.
Importação do fornecedor e publicação automática continuam em breve.

## Acessos e configurações

O registro solicitado pelo dono fica em `docs/private/SHOPEE.md`: login do painel,
credenciais de teste e produção, configurações originais e histórico das alterações.
A pasta é ignorada pelo Git e não entra no contexto Docker. O arquivo tem permissão `600`
e a pasta `700`; é texto local, sem criptografia, e exige cópia de segurança privada.
Nunca copiar esses valores para este documento, commits, PRs, logs ou variáveis `NEXT_PUBLIC_*`.
A senha do painel não é usada pelo sistema: cada aluna autoriza a própria loja na Shopee.

## Autorização implementada

- Server Action exige sessão ativa, acesso à Loja Pronta e fase 4 ou posterior; limita o início
  a três tentativas por minuto por conta. A autorização brasileira abre o Escala Shop na Shopee.
- Estado aleatório de 32 bytes, guardado só como hash, ligado à dona, sessão e aplicativo,
  com validade de 10 minutos. Iniciar outra tentativa invalida a anterior.
- Retorno automático em `/api/shopee/callback`. Confere sessão, acesso, estado, código e `shop_id`;
  recusa parâmetros duplicados e conta principal com várias lojas (`main_account_id`).
- Consumo atômico e durável do estado antes da troca do código de uso único. Retorno à jornada
  sem propagar código, estado ou mensagem externa; resposta sem cache e sem referência ao callback.
  O `next.config.ts` define a exceção `no-referrer` depois da regra geral, para que o Next não
  sobrescreva a proteção da rota. As telas de autorização permitem o redirecionamento dos
  formulários somente para os provedores oficiais correspondentes, inclusive sem JavaScript.
- Loja exclusiva por aluna. Os tokens ficam cifrados com AES-256-GCM e identificação da dona,
  loja, aplicativo e ambiente como dado autenticado. As migrações `0046_shopee-preparation`
  e `0048_shopee-oauth-connection` estão aplicadas no servidor de produção.
- Troca e renovação com HMAC-SHA256, limite de 10 segundos, sem seguir redirecionamentos ou
  repetir automaticamente códigos e tokens de uso único. A validade usa `expire_in` da API.
- Renovação serializada por conta: persiste o novo par de tokens. Antes de tentar a renovação,
  bloqueia o par anterior no banco; timeout ou queda do processo exigem nova autorização.
- Conexão confirmada em produção avança a fase 4 para a 5 na mesma transação dos tokens.
  A escolha dos produtos continua em breve. Sandbox é restrito a admin ou às contas explícitas
  do piloto e não avança a fase. O piloto não concede papel administrativo.
- Desconectar apaga somente os tokens e estados da própria conta nesta plataforma. A revogação
  do Escala Shop na Shopee é feita pela titular na Central do Vendedor; não é automática porque
  o aplicativo existente pode ser usado em outro sistema.

A tela usa a moldura existente. O botão real de autorização só aparece com configuração completa
**e** `SHOPEE_ENABLED=true`. Sem isso, mantém “em breve”. Tokens não são enviados ao navegador.
A conexão não importa o nome da loja, catálogo, pedidos ou métricas e não publica anúncios.

## Configuração e ativação

Configure apenas no servidor, como Runtime no Coolify:

| Variável                      | Valor                                                             |
| ----------------------------- | ----------------------------------------------------------------- |
| `SHOPEE_PARTNER_ID`           | ID live do Escala Shop; em sandbox, o ID de teste                 |
| `SHOPEE_PARTNER_KEY`          | Chave do mesmo ambiente, preservada no registro privado           |
| `SHOPEE_TOKEN_ENCRYPTION_KEY` | Chave própria de 32 bytes aleatórios, em hexadecimal              |
| `SHOPEE_ENVIRONMENT`          | `live` ou `sandbox`; padrão `live`                                |
| `SHOPEE_ENABLED`              | `false` até a configuração e validação; padrão desligado          |
| `SHOPEE_CALLBACK_MODE`        | `automatic` (padrão) ou `manual`                                  |
| `SHOPEE_REDIRECT_URI`         | URL HTTPS exata no domínio autorizado; obrigatória no modo manual |
| `SHOPEE_PILOT_USER_IDS`       | IDs de contas separados por vírgula; restringe o piloto           |

Preserve a chave de cifra em backup: trocar sem recifrar perde os tokens existentes.
Não reutilizar a senha, a chave da API ou a chave do Bling. Os tokens são vinculados ao ID
mais ambiente; registros anteriores marcados como `legacy` exigem nova autorização.

O retorno automático é `https://lojaprontaprime.com/api/shopee/callback`. O cadastro do Escala
Shop deve usar `https://lojaprontaprime.com/` nos domínios live e sandbox. A migração foi
autorizada pelo dono em 15 de outubro; os valores anteriores estão no registro privado.
Como o campo live aceita um domínio, novas autorizações para o site antigo podem falhar após
a troca. Não recriar o aplicativo, redefinir chaves ou revogar lojas antigas para mudar o retorno.
A lista de IPs deve continuar ligada, preservando os atuais e acrescentando somente o IP de
saída confirmado do servidor da Loja Pronta. Não deduzir esse IP pelo DNS público do site.

O modo manual nunca baixa a URL colada. Confere origem e caminho exatos, recusa credenciais,
fragmentos e parâmetros ambíguos, e recebe o endereço por Server Action (POST). O código não
é colocado no URL da Loja Pronta Prime, no estado de erro, no armazenamento do navegador ou em
logs. A intenção continua vinculada à sessão que começou o processo e expira em 10 minutos.
Há limites separados de início e envio do retorno. A tela reaproveita a moldura, os botões e
o campo com rótulo flutuante existentes, com instruções e erros acessíveis.

Quando usado, o modo manual exige copiar o retorno entre os dois sites. O domínio antigo
recebe o código na requisição do navegador, como exige o cadastro atual; seus logs de hospedagem
não são controlados por este projeto. A aluna deve colar o endereço somente na plataforma.
Reautorizar uma loja que já usa o mesmo aplicativo pode renovar seus tokens e afetar outro
sistema. Preferir uma loja ainda não vinculada para o teste live. Não revogar autorizações do
sistema antigo nem usar tokens copiados dele.

Sequência para ativar:

1. Conferir o backup, o código e as migrações já publicados pelo PR #122.
2. Confirmar o IP de saída e preparar as variáveis privadas de Runtime, mantendo o recurso desligado.
3. Conferir os domínios de retorno autorizados pelo dono e a lista de IPs; incluir apenas o IP
   confirmado e registrar os valores anteriores e novos no arquivo privado. No modo automático,
   usar `/api/shopee/callback`, com `SHOPEE_PILOT_USER_IDS` limitado à conta de teste.
4. Validar primeiro em sandbox com uma conta admin ou do piloto e uma loja de teste autorizada.
   Usar as credenciais de sandbox e um endereço no domínio de teste já cadastrado. Não contornar
   bloqueios do navegador para realizar essa etapa.
5. Configurar live, autorizar uma loja real da titular e conferir a persistência e a renovação.
   Só liberar às alunas depois dessa validação. Não criar nem alterar anúncios nesse teste.

Na verificação de 15 de outubro, passaram 398 testes unitários e 17 testes de banco, incluindo
sessão incorreta, repetição do código e validação do endereço colado. Uma loja brasileira de
sandbox autorizou o aplicativo pela interface real. A aplicação trocou o código, salvou os tokens
cifrados e manteve a fase 4. Uma consulta real a `get_shop_info` retornou região BR e status NORMAL;
a renovação real também trocou e persistiu os dois tokens. Esses testes foram feitos primeiro
em uma cópia isolada do sistema. Os resultados da publicação ficam no registro privado.

Endereços usados no código:

| Ambiente | Autorização                                        | API de tokens                                        |
| -------- | -------------------------------------------------- | ---------------------------------------------------- |
| Live     | `https://open.shopee.com.br/auth`                  | `https://partner.shopeemobile.com`                   |
| Sandbox  | `https://open.sandbox.test-stable.shopee.com/auth` | `https://openplatform.sandbox.test-stable.shopee.sg` |

O Sandbox V2 usa o portal global de autorização, conforme o [guia oficial de teste](https://open.shopee.com/developer-guide/644).
No login, selecione Brasil e use a conta da loja sandbox criada na Open Platform. Para abrir
a Central do Vendedor de teste, use o botão Login Seller Center no painel Test Account-Sandbox v2.
O retorno continua dentro do domínio de teste já cadastrado no aplicativo.

Parâmetros de autorização: `partner_id`, `auth_type=seller`, `redirect_uri`,
`response_type=code` e `state`. Código de autorização: uso único e validade de 10 minutos.
Referência oficial: [Autorização de lojas](https://open.shopee.com/developer-guide/20),
atualizada pela Shopee em 23 de julho de 2026 e conferida no painel em 15 de outubro.

## Validação e publicação

Typecheck e lint aprovados; 398 testes unitários e 17 testes de integração aprovados.
Os testes de cabeçalhos usam o resolvedor de rotas do próprio Next para conferir exceções
de privacidade, destinos dos formulários e preservação da política geral nas outras páginas.
O Postgres dos testes é temporário e separado dos bancos existentes. Os testes exercitam
estado vencido e repetido, dona/sessão/aplicativo incorretos, exclusividade da loja, cifra,
renovação concorrente e com resultado desconhecido, isolamento de sandbox e desconexão.
O transporte da Shopee é simulado apenas nos testes; isso não comprova uma conexão externa.
O [PR #122](https://github.com/HanielCota/loja-pronta-prime/pull/122) foi publicado em 15 de outubro, com a migração `0048` aplicada, container saudável
e `/api/auth/ok` retornando `{"ok":true}`. O callback retorna 303 para o aviso de indisponibilidade
enquanto a configuração está ausente. Nenhuma loja real foi autorizada neste fluxo.

## Catálogo preparado

O contrato local tem preços em centavos, estoque inteiro, imagens HTTPS, peso, dimensões,
horário de atualização e variações. SKU duplicado, dados antigos, estoque esgotado e preço
igual ou abaixo do custo bloqueiam a preparação. A janela inicial de 15 minutos é uma escolha
local ajustável ao fornecedor; não é regra da Shopee. O resultado `prepared` exige ainda taxas,
margem, frete, categoria, atributos, limites e imagens confirmados para a loja real.

## Dados necessários do fornecedor

Solicitar nome e contato, documentação da API ou um arquivo real do catálogo, credenciais de
teste, permissão de uso das imagens, preços/custos, atualização de estoque, SKUs e variações,
peso e medidas, prazo de despacho, origem de envio, fretes, política de falta de estoque e
como o pedido é enviado e acompanhado. Não solicitar senha pessoal da loja.

Mapeamento inicial:

| Origem                      | Contrato local            | Destino a confirmar na Shopee                    |
| --------------------------- | ------------------------- | ------------------------------------------------ |
| Identificação do fornecedor | supplierId                | Controle interno                                 |
| Código do produto           | sku                       | SKU do anúncio/modelo                            |
| Nome e descrição            | title, description        | Nome e descrição dentro dos limites vigentes     |
| Fotos autorizadas           | images                    | Upload na Shopee e IDs das imagens               |
| Custo e preço de venda      | costCents, priceCents     | Preço após taxas e margem                        |
| Saldo e última consulta     | stock, updatedAt          | Estoque confirmado no momento do envio           |
| Peso e medidas              | weightGrams, dimensionsCm | Peso em unidade exigida e medidas/logística      |
| Opções e códigos            | variants                  | Variações e modelos autorizados para a categoria |

Categoria, marca, atributos e canais logísticos dependem da API e da loja; não inventar IDs.
URLs de imagens precisam de validação contra redes privadas, controle de redirecionamentos,
tamanho e formato antes de qualquer download pelo servidor. O validador atual não baixa imagens.

## Publicação e acompanhamento pendentes

Após obter fornecedor e credenciais: importar catálogo real com atualização, escolher produtos,
conferir categoria/atributos/frete/margem, enviar fotos, cadastrar anúncios e salvar os IDs
retornados. Usar fila e chave de deduplicação por loja/produto; se houver timeout após envio,
reconciliar com a Shopee antes de repetir. Consultar status e permitir correção de rejeições.
Pedidos, estoque sincronizado, nome/logo/descrição da loja e métricas exigem permissões e
endpoints próprios; confirmar cada operação em vez de prometer acesso pelo cadastro inicial.
