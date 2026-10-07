# Ferramentas do SLL

Entrega de 7 de outubro de 2026, em `/sll/recursos`.

## O que funciona

- **Preço e lucro:** recomenda o menor preço que cobre os custos de uma unidade e alcança a margem escolhida, considerando as mudanças de faixa da Shopee.
- **Descontos:** aplica primeiro o desconto percentual e depois a parte do cupom paga pela loja. Recalcula as taxas sobre o preço recebido e mostra a mudança no lucro.
- **Anúncios:** calcula a verba por venda para cobrir os custos e para manter a margem. Mostra o ROAS mínimo, arredondado para cima, sem subtrair anúncios duas vezes.
- **Assistentes:** quatro guias com instruções e texto para copiar. O botão abre o GPT original no ChatGPT. A Mentora Pri acompanha as aulas; os demais ficam associados às aulas relevantes. Não há envio automático de mensagens.
- **Materiais:** guia em PDF e planilha XLSX próprios das ferramentas, com downloads privados. A página também reúne arquivos publicados das aulas, respeitando o desbloqueio das etapas.

Todos os cálculos são estimativas por unidade. Embalagem, frete da loja, outros custos, anúncios, impostos e campanhas são entradas da aluna. Campos opcionais vazios valem zero; campos obrigatórios e taxas personalizadas exigem valores explícitos. Custos não informados não entram na conta. Margem é a porcentagem do preço final que sobra, não um acréscimo sobre o custo.

## Taxas conferidas

A [política oficial da Shopee para CNPJ e CPF](https://seller.shopee.com.br/edu/article/26839) foi conferida em 7 de outubro de 2026. O ajuste de 1º de outubro mudou a taxa da primeira faixa para R$ 4,50.

| Preço da unidade      | Comissão total | Taxa por item |
| --------------------- | -------------- | ------------- |
| R$ 9,00 a R$ 79,99    | 20%            | R$ 4,50       |
| R$ 80,00 a R$ 99,99   | 14%            | R$ 16,00      |
| R$ 100,00 a R$ 199,99 | 14%            | R$ 20,00      |
| R$ 200,00 ou mais     | 14%            | R$ 26,00      |

Para CNPJ abaixo de R$ 9,00, a taxa por item é metade do preço. CPF com mais de 450 pedidos em 90 dias acrescenta R$ 3,00 por item nas faixas verificadas. A [política para CPF](https://seller.shopee.com.br/edu/article/18484) descreve cobrança regressiva para preços baixos, mas não fornece uma fórmula completa atualizada: abaixo de R$ 9,00, ou R$ 12,00 para CPF com maior volume, a simulação exige taxas personalizadas. O subsídio Pix pago pela Shopee não é descontado como custo da loja.

As taxas não são atualizadas automaticamente. Uma alteração oficial exige revisão de `fees.ts`, dos testes, das datas da interface e dos materiais. A opção personalizada permite informar condições diferentes.

## Código e publicação

- `src/features/sll/tools/fees.ts`: política e faixas, em centavos e pontos-base.
- `calculations.ts`: motor único de preço, desconto e anúncios; sem banco ou interface.
- `form-input.ts` e `number-input.ts`: leitura e apresentação de números.
- `catalog.ts`: rotas, materiais e instruções dos assistentes.
- `components/`: campos, formulário e resultado, usando os componentes e tokens existentes.
- `server/actions.ts`: exige acesso ao SLL antes de validar e calcular. Não grava os valores da simulação.
- `server/materials.ts`: reúne os arquivos publicados e confere as etapas.
- `server/import-tools.ts`: entrega transacional única de três novos recursos, ativação da calculadora original e ligações às aulas.
- `server/publish-materials.ts`: valida os arquivos versionados e confere o SHA-256 no bucket privado.

A migração `0040_sll_content_imports` cria o registro de entregas. A chave `sll-tools-2026-10-07` impede que outro deploy reponha ligações removidas pelo admin. Recursos com rascunho, histórico, arquivados ou não publicados são preservados. Alterações da entrega nos recursos existentes têm uma versão anterior no histórico. Vídeos, aulas e progresso não são alterados.

Os dois arquivos ficam em `data/sll/tools/` e são copiados para o runtime. O início publica somente chaves ausentes em `sll/tools/2026-10-07/`; um arquivo diferente na mesma chave interrompe o início em vez de sobrescrever. Os downloads passam por `/api/sll/ferramentas/material/[slug]`, com produto e publicação conferidos, nome de anexo e `private, no-store`. Os arquivos não ficam em `public/`.

## Verificação

Typecheck, lint, 271 testes e build passaram. Os testes cobrem limites das faixas, arredondamentos, prejuízo, cupom, margem impossível, taxas personalizadas e entradas inválidas. Uma busca independente confere o menor preço recomendado.

Também foram conferidos: migração em banco novo; duas entregas concorrentes; preservação de edições e rascunhos em deploy repetido; dois inícios do migrador compilado para Node; formulários sem JavaScript; bloqueio das ações e downloads para conta sem SLL; MIME e SHA-256 dos downloads; telas no computador e no celular, nos temas claro e escuro. Os 71 vídeos continuam vinculados.

## Dependências restantes

Os nove links de anexos antigos inventariados em T02 retornam HTML, não PDF, ZIP ou XLSX. Esses materiais aparecem como “em breve”, sem download fictício. O dono precisa fornecer os arquivos originais ou links válidos; o admin já permite anexá-los às aulas. O guia e a planilha novos não substituem esses anexos.

Envio Velox continua “em breve” até existir um destino real confirmado. Os quatro destinos de GPT foram preservados. Os guias e links internos foram conferidos; a resposta dos GPTs depende da conta no ChatGPT e não foi validada, pois a sessão externa apresentou erro de carregamento da conta.
