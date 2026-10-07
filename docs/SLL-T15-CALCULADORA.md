# SLL — Etapa 15: calculadora de preço

> Registro histórico de 6 de outubro. A entrega de 7 de outubro liberou as três calculadoras,
> com taxas conferidas e opção personalizada. A rota usa a implementação atual de
> `docs/SLL-FERRAMENTAS.md`; a página antiga de preparação foi substituída.

**Implementação:** 6 de outubro de 2026
**Estado:** estrutura entregue; cálculo bloqueado até a regra ser validada

## O que foi aplicado

- A calculadora ganhou uma rota protegida em `/sll/recursos/calculadora-shopee`.
- O cartão de Recursos leva para essa rota, mesmo enquanto o cálculo está em preparação.
- A página informa o motivo do bloqueio sem pedir dados que não serão usados.
- O fluxo previsto ficou registrado na ordem: tipo de vendedora, custos, taxas, condições,
  resultado, revisão e preferência salva.
- Nenhuma taxa, porcentagem ou resultado foi inventado.
- O script de importação já aponta a ferramenta para a nova rota.

## Investigação das regras

Consulta feita em 6 de outubro de 2026 na fonte oficial:

- [Termos de Serviço da Shopee](https://help.shopee.com.br/portal/4/article/77113-Termos-de-Servi%C3%A7o-da-Shopee)

O documento confirma que a Tarifa de Marketplace pode ser aplicada a cada pedido concluído e que a
base considera o valor dos produtos do pedido, excluindo o frete pago pelo comprador e, quando
aplicável, descontos de cupons gerados pela vendedora. O documento não publica uma porcentagem
única nem uma tabela completa de CPF/CNPJ, categoria, programa, limite, vigência e exceções para
todas as contas.

As regras também podem depender de campanhas e condições exibidas na Central do Vendedor. Por isso,
a fonte pública consultada não é suficiente para liberar um cálculo universal na Prime.

## Decisão de produto

Enquanto não houver uma tabela operacional confirmada e versionada, a tela permanece em “Em breve”.
Ela não exibe campos de entrada nem um resultado fictício. A preferência de tipo de vendedora também
não é tratada como salva, porque ainda não existe um mecanismo persistente específico para essa
calculadora.

## Próxima validação necessária

Para liberar o formulário, é preciso registrar uma tabela atual da Central do Vendedor com:

- taxas por tipo de vendedora e categoria;
- programas e condições opt-in;
- valores fixos, limites e base de incidência;
- vigência e exceções;
- exemplo real reproduzível para CPF e CNPJ.

Depois disso, a fórmula deverá ficar em função pura, receber parâmetros explícitos, tratar valores
em pt-BR e ter testes para zero, decimais, valores altos, entradas inválidas e arredondamento.
