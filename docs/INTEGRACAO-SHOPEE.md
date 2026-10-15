# Integração Shopee

Atualizado em 15 de outubro de 2026. O dono escolheu o aplicativo **Escala Shop** existente,
que aparece como Online na Shopee Open Platform. O fluxo de autorização está implementado,
mas a ativação e o teste com uma loja real ainda dependem da configuração do retorno e dos IPs.
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
- Retorno fixo em `/api/shopee/callback`. Confere sessão, acesso, estado, código e `shop_id`;
  recusa parâmetros duplicados e conta principal com várias lojas (`main_account_id`).
- Consumo atômico e durável do estado antes da troca do código de uso único. Retorno à jornada
  sem propagar código, estado ou mensagem externa; resposta sem cache e sem referência ao callback.
- Loja exclusiva por aluna. Os tokens ficam cifrados com AES-256-GCM e identificação da dona,
  loja, aplicativo e ambiente como dado autenticado. As migrações `0046_shopee-preparation`
  e `0048_shopee-oauth-connection` precisam estar aplicadas no servidor.
- Troca e renovação com HMAC-SHA256, limite de 10 segundos, sem seguir redirecionamentos ou
  repetir automaticamente códigos e tokens de uso único. A validade usa `expire_in` da API.
- Renovação serializada por conta: persiste o novo par de tokens. Antes de tentar a renovação,
  bloqueia o par anterior no banco; timeout ou queda do processo exigem nova autorização.
- Conexão confirmada em produção avança a fase 4 para a 5 na mesma transação dos tokens.
  A escolha dos produtos continua em breve. Sandbox é restrito a admin e não avança a fase.
- Desconectar apaga somente os tokens e estados da própria conta nesta plataforma. A revogação
  do Escala Shop na Shopee é feita pela titular na Central do Vendedor; não é automática porque
  o aplicativo existente pode ser usado em outro sistema.

A tela usa a moldura existente. O botão real de autorização só aparece com configuração completa
**e** `SHOPEE_ENABLED=true`. Sem isso, mantém “em breve”. Tokens não são enviados ao navegador.
A conexão não importa o nome da loja, catálogo, pedidos ou métricas e não publica anúncios.

## Configuração e ativação

Configure apenas no servidor, como Runtime no Coolify:

| Variável                      | Valor                                                    |
| ----------------------------- | -------------------------------------------------------- |
| `SHOPEE_PARTNER_ID`           | ID live do Escala Shop; em sandbox, o ID de teste        |
| `SHOPEE_PARTNER_KEY`          | Chave do mesmo ambiente, preservada no registro privado  |
| `SHOPEE_TOKEN_ENCRYPTION_KEY` | Chave própria de 32 bytes aleatórios, em hexadecimal     |
| `SHOPEE_ENVIRONMENT`          | `live` ou `sandbox`; padrão `live`                       |
| `SHOPEE_ENABLED`              | `false` até a configuração e validação; padrão desligado |

Preserve a chave de cifra em backup: trocar sem recifrar perde os tokens existentes.
Não reutilizar a senha, a chave da API ou a chave do Bling. Os tokens são vinculados ao ID
mais ambiente; registros anteriores marcados como `legacy` exigem nova autorização.

O retorno previsto para produção é `https://lojaprontaprime.com/api/shopee/callback`.
O Escala Shop ainda permite o domínio `https://membros.priscianemsl.com/` e apresenta um único
campo de domínio live. A substituição precisa ser coordenada com o dono: novos retornos para
o sistema antigo podem parar de funcionar. Nenhum domínio ou IP foi alterado nesta entrega.
A lista de IPs deve continuar ligada, preservando os atuais e acrescentando somente o IP de
saída confirmado do servidor da Loja Pronta. Não deduzir esse IP pelo DNS público do site.

Sequência para ativar:

1. Publicar o código e as migrações pelo fluxo normal de PR para `main`, com backup do banco.
2. Confirmar o IP de saída e preparar as variáveis privadas de Runtime, mantendo o recurso desligado.
3. Coordenar a troca do domínio de retorno e a inclusão do IP na Shopee. Guardar os valores
   anteriores e os novos no registro privado antes de salvar.
4. Validar primeiro em sandbox com uma conta admin e uma loja de teste autorizada. Isso exige
   retorno de teste HTTPS permitido no aplicativo e as credenciais de teste correspondentes.
5. Configurar live, autorizar uma loja real da titular e conferir a persistência e a renovação.
   Só liberar às alunas depois dessa validação. Não criar nem alterar anúncios nesse teste.

Endereços usados no código:

| Ambiente | Autorização brasileira                        | API de tokens                                        |
| -------- | --------------------------------------------- | ---------------------------------------------------- |
| Live     | `https://open.shopee.com.br/auth`             | `https://partner.shopeemobile.com`                   |
| Sandbox  | `https://open.test-stable.shopee.com.br/auth` | `https://openplatform.sandbox.test-stable.shopee.sg` |

Parâmetros de autorização: `partner_id`, `auth_type=seller`, `redirect_uri`,
`response_type=code` e `state`. Código de autorização: uso único e validade de 10 minutos.
Referência oficial: [Autorização de lojas](https://open.shopee.com/developer-guide/20),
atualizada pela Shopee em 23 de julho de 2026 e conferida no painel em 15 de outubro.

## Validação local

Typecheck e lint aprovados; 389 testes unitários e 16 testes de integração aprovados.
O Postgres dos testes é temporário e separado dos bancos existentes. Os testes exercitam
estado vencido e repetido, dona/sessão/aplicativo incorretos, exclusividade da loja, cifra,
renovação concorrente e com resultado desconhecido, isolamento de sandbox e desconexão.
O transporte da Shopee é simulado apenas nos testes; isso não comprova uma conexão externa.
A migração ainda não foi aplicada em produção e nenhuma loja real foi autorizada neste fluxo.

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
