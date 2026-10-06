# Revisão de layout, UI e UX do SLL

Revisão em 6 de outubro de 2026. Escopo: painel, menu, boas-vindas, método, três etapas,
biblioteca, cursos e suas aulas, recursos e Minhas Lojas. A revisão considera o uso por alunas
iniciantes e mantém as cores, a fonte, os cartões e os componentes de `DESIGN.md`.

## Problemas corrigidos

| Local                          | Problema encontrado                                                                                                              | Correção                                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu lateral                   | Rótulos e espaçamentos exigiam uma segunda rolagem em alturas comuns; Cursos ficava escondido.                                   | Método tem nome curto, itens de 16px com alvos de 44px e menos espaço entre grupos. Etapas aparecem só no Método. O cartão continua até o final da página. |
| Cartões do método e dos cursos | Títulos competiam com o título da página; colunas estreitas alongavam demais os cartões.                                         | Títulos internos de 20px, preenchimento de 24px e grade que respeita uma largura mínima de 18rem, sem cortar nomes ou descrições.                          |
| Aula                           | Duas colunas começavam em 1024px, deixando vídeo e sequência estreitos com o menu lateral.                                       | Duas colunas a partir de 1280px; abaixo disso, conteúdo e sequência se empilham. Anterior/próxima ocupam a largura disponível no celular.                  |
| Sequência de aulas             | Ao abrir uma aula perto do fim, a lista podia recomeçar no topo e esconder a aula atual.                                         | A lista mostra a aula atual ao montar. A rolagem fica dentro da sequência, preservando a posição da página. Foco tem espaço para aparecer inteiro.         |
| Retorno                        | Etapas e cursos mostravam Voltar numa linha separada depois do título. A última aula não oferecia uma saída no lugar de Próxima. | Retorno antes do título e link real para a lista ao terminar o módulo. A aula complementar retorna ao seu curso, pelo endereço publicado.                  |
| Biblioteca                     | Buscar sem acentos não encontrava títulos acentuados; não havia envio sem JavaScript nem endereço para retomar a busca.          | Busca em título, descrição e categoria, ignorando acentos e maiúsculas. Formulário GET, contagem visível, limpeza e busca confirmada no endereço.          |
| Recursos                       | Botões de cartões vizinhos ficavam em alturas diferentes. Links externos não anunciavam outra aba.                               | Altura determinada pelo conteúdo mais alto da linha e ação no fim do cartão. Outra aba é anunciada para leitor de tela.                                    |
| Painel                         | O aviso de lojas ainda indisponíveis ocupava a primeira posição.                                                                 | O caminho de aprendizagem aparece antes do aviso de lojas.                                                                                                 |
| Imagens                        | Capas e banners não tinham dimensões explícitas.                                                                                 | Dimensões reservadas e carregamento adiado das capas da biblioteca. Arquivos ausentes continuam identificados, sem imagens inventadas.                     |
| Teclado                        | Era preciso atravessar o menu para chegar ao conteúdo.                                                                           | Atalho Pular para o conteúdo, com foco visível. O destino é a coluna do conteúdo; as outras áreas mantêm o comportamento existente.                        |
| Texto importado                | A descrição antiga da Biblioteca anunciava 27 aulas, apesar das 19 publicadas.                                                   | A descrição antiga foi corrigida na base local usando o texto de 19 aulas já previsto no importador. Nenhuma aula fictícia foi acrescentada.               |

## Padrões conferidos e mantidos

Os passos da Etapa 1 e as prioridades da Etapa 2 continuam em controles expansíveis nativos,
operáveis por teclado. A conclusão de aulas usa o formulário real e mantém a aula aberta.
Contagens e barras usam o progresso salvo; etapas fechadas continuam explicando o bloqueio.
Títulos e descrições publicados seguem administráveis, inclusive nomes longos.

Manrope, corpo de 17px, rótulos de no mínimo 16px, azul de ação, tema grafite, foco visível e
cartões de 28px foram mantidos. O ajuste em `AreaShell` acrescenta somente um destino opcional
para o atalho do SLL. A Loja Pronta, o perfil, o acesso e o admin não foram redesenhados.

## Validação

O roteiro local usa uma aluna descartável, sem alterar a conta do site de referência. A matriz
cobre 15 páginas em larguras de 390, 768, 1024, 1280 e 1440px, nos dois temas. Também confere
320px, alvos de toque, alto contraste, movimento reduzido, texto ampliado, teclado, conclusão
persistida, busca compartilhável e formulários sem JavaScript.

`bun run typecheck` e `bun run lint` passaram, sem avisos. `bun test src` passou com 218 testes,
incluindo as regras da marca e quatro casos da busca. As 16 verificações locais de navegador
passaram, incluindo 150 verificações de acessibilidade e largura na matriz principal.
Capturas e roteiro ficam em
`.data/sll-review-screens` e `.data/sll-review.spec.ts`, fora do versionamento.

## Conteúdo que ainda depende de arquivos ou integração

Capas e banners originais precisam ser enviados pelo admin. Os banners locais continuam em
rascunho; o carrossel com arquivos reais não foi validado nesta revisão. Vídeos, conexão Shopee
e calculadora continuam com a disponibilidade real do sistema. Os espaços dizem Em breve.

Critérios usados: [design do projeto](DESIGN.md), [referência do SLL](SLL-REFERENCIA-VISUAL.md)
e [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).
