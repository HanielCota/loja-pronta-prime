# Preparação da integração Shopee

Atualizado em 9 de outubro de 2026. O perfil enviado está em análise, conforme a tela recebida.
Não há loja conectada, catálogo importado ou publicação automática nesta entrega.

## Preparado no código

- Cliente de troca de código e renovação de tokens, assinatura HMAC-SHA256, limite de 10 segundos,
  sem seguir redirecionamentos e sem repetição automática de operações com tokens de uso único.
- Mensagens em português para configuração ausente, falha temporária, autorização recusada e
  resposta inválida. Mensagens externas, códigos e tokens não entram no erro exibido.
- Cifra AES-256-GCM com nonce aleatório e identificação da dona como dado autenticado.
- Migração `0046_shopee-preparation`: conexão exclusiva por loja, estado de autorização com hash,
  validade e consumo, e catálogo por fornecedor/SKU. Migração gerada; não aplicada em produção.
- Contrato do catálogo com preços em centavos, estoque inteiro, imagens HTTPS, peso, dimensões,
  horário de atualização e variações. SKU duplicado é recusado. Dados antigos, estoque esgotado
  ou preço igual/abaixo do custo bloqueiam a preparação. A janela inicial de 15 minutos é uma
  escolha local ajustável ao fornecedor; não é uma regra da Shopee.
- Testes usam apenas dados unitários e transporte simulado. Não criam anúncios nem chamam a API.

Validação desta entrega: typecheck e lint aprovados; 373 testes unitários aprovados.
A migração foi aplicada em um Postgres temporário isolado: 4 testes de integração aprovados,
incluindo exclusividade da loja, remoção dos tokens com a conta e consumo do estado por sessão.
O banco local que pertence a outro projeto e o banco de produção não foram alterados.

O resultado `prepared` significa que o contrato local passou. Ainda exige taxas, margem, frete,
categoria, atributos obrigatórios, limites e imagens confirmados para a loja real na Shopee.
As telas e fases continuam como antes, com as funções indisponíveis indicando “em breve”.

## Depois da aprovação

1. Criar o aplicativo com o serviço e dados reais. Guardar `partner_id` e `partner_key` no servidor.
2. Gerar uma chave aleatória de 32 bytes em hexadecimal para `SHOPEE_TOKEN_ENCRYPTION_KEY`.
   Não reutilizar senha ou chave da API. Preservar a chave nas cópias de segurança; trocar sem
   recifrar perde o acesso aos tokens armazenados. Não colocar segredos no Git ou em `NEXT_PUBLIC_*`.
3. Confirmar no aplicativo a origem da API atribuída à região e as permissões aprovadas.
   O cliente preparado usa a origem de tokens documentada `https://partner.shopeemobile.com`.
   Ainda não foi testado para este aplicativo brasileiro. Sandbox não está configurado.
4. Registrar o domínio real do retorno na Shopee. Implementar início e callback antes de abrir
   a conexão: sessão ativa, acesso Loja Pronta, estado aleatório de pelo menos 32 bytes, hash no
   banco ligado à sessão e à dona, validade de 10 minutos, consumo atômico de uso único.
   Validar código, shop_id, estado, dona e sessão antes de trocar tokens. Não aceitar
   `main_account_id` no fluxo de loja única sem implementar a seleção e autorização das lojas.
5. Usar o endereço de autorização brasileiro `https://open.shopee.com.br/auth` com
   `partner_id`, `auth_type=seller`, `redirect_uri`, `response_type=code` e `state`.
   O link não é um endpoint de consulta de produtos. A cliente autoriza a própria loja;
   não precisa cadastrar uma plataforma parceira para simplesmente conceder acesso.
6. Salvar os dois tokens cifrados numa transação. Usar `expire_in` da resposta para a validade;
   não confundir validade do token com prazo da autorização. Renovação deve ser serializada
   por conexão, salvando os dois tokens novos, porque o refresh token é de uso único.
7. Implementar revogação e reconexão, limpeza de estados vencidos, retorno seguro à jornada e
   testes de estados vencidos/reutilizados, conta errada e renovação concorrente num banco isolado.
8. Validar em sandbox e depois numa loja de teste autorizada. Só então ativar a tela e avançar
   a fase da aluna após uma conexão real, confirmada pelo servidor.

O callback e a persistência/renovação automática ainda não estão implementados. A aprovação
por si só não ativa a integração. Nenhuma chamada de publicação foi acrescentada nesta entrega.

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

## Mensagem para a cliente

“O cadastro ficou em análise na Shopee. Agora precisamos aguardar o email de aprovação.
Enquanto isso, estamos preparando a integração e o formato dos produtos. Pode me enviar o
nome do fornecedor e o link do catálogo ou da documentação dele? Quando chegar a resposta da
Shopee, me encaminhe para continuarmos a configuração e os testes de conexão.”

Referência oficial consultada: [Autorização de lojas](https://open.shopee.com/developer-guide/20),
atualizada pela Shopee em 23 de julho de 2026. Os endereços e regras precisam ser confirmados
novamente no aplicativo antes da ativação.
