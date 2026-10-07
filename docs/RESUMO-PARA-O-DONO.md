# Loja Pronta Prime: o que já temos

Resumo em linguagem simples, para o dono do projeto. Situação em 7 de outubro de 2026.

## Em poucas palavras

A plataforma já funciona de verdade: a aluna entra, faz a conversa inicial, cria a marca da loja
(nome, logo e texto) e assiste ao curso SLL com o progresso salvo. A equipe já tem um painel para
editar o conteúdo e liberar acessos.

O que ainda falta depende quase todo de coisas de fora: dados da Hotmart, cadastro de parceiro na
Shopee, o fornecedor dos produtos e os materiais antigos que ainda precisam de arquivos válidos.
Os vídeos do SLL já usam o Panda e estão vinculados às aulas online.

## Os dois produtos

A plataforma vende dois produtos separados, pela Hotmart:

- **SLL (Sistema Loja Lucrativa):** curso em vídeo com ferramentas, para a aluna aprender a vender
  na Shopee por conta própria.
- **Loja Pronta:** a aluna monta a própria loja na Shopee pela plataforma, um passo de cada vez, sem
  precisar de ninguém da equipe.

Quem compra um não ganha o outro. Quem tem os dois escolhe a área ao entrar.

## O que já está pronto

### Entrada na plataforma

- Tela de entrar com e-mail e senha, recuperar senha e criar a senha no primeiro acesso.
- Não existe cadastro aberto: só entra quem comprou ou quem foi liberado pela equipe.
- Página de perfil, com foto.
- Tema claro e escuro e opção de letra maior.

### Loja Pronta

A jornada tem 7 fases. A aluna sempre vê em que fase está.

| Fase | O que é                                                  | Situação                      |
| ---- | -------------------------------------------------------- | ----------------------------- |
| 1    | **Conversa inicial:** perguntas sobre ela e sobre a loja | Pronta                        |
| 2    | **Sua marca:** nome, logo e texto da loja                | Pronta                        |
| 3    | **Conta na Shopee:** passo a passo para abrir a conta    | Pronta                        |
| 4    | **Conexão com a Shopee**                                 | Tela pronta, botão "em breve" |
| 5    | **Produtos** do fornecedor, com preço calculado          | Em breve                      |
| 6    | **Publicação** da loja na Shopee                         | Em breve                      |
| 7    | **Loja no ar**, com as vendas                            | Em breve                      |

Como funciona hoje:

- **Conversa inicial:** uma pergunta por tela, cerca de 5 minutos. Cada resposta fica salva, então
  ela pode parar e voltar depois. No fim, ela revisa tudo e salva o WhatsApp. Os avisos automáticos
  ainda estão em breve.
- **Vídeo de orientação:** aparece depois da conversa, quando houver um vídeo enviado (ainda não
  há).
- **Nome da loja:** a plataforma sugere nomes a partir das respostas dela, ou ela escreve o próprio.
- **Estúdio do logo:** ela faz escolhas simples (tipo, desenho, cores, letra, fundo, estilo) e vê um
  rascunho mudar na hora. Depois, a inteligência artificial desenha o logo de verdade. Ela pode
  pedir ajustes de um toque, escolher entre as versões ou enviar um logo que já tenha. Também pode
  falar em vez de escrever.
- **Texto da loja:** 3 textos prontos montados com as respostas dela, ou um escrito por ela.
- **Revisão:** logo, nome e texto juntos, com opção de mudar cada um. No fim, ela baixa o logo.
- **Conta na Shopee:** um passo a passo guiado. Só ela pode abrir a conta, porque a Shopee exige a
  própria pessoa (documento, selfie, conta no banco).

### SLL (o curso)

- **Painel** com banners de avisos que a equipe edita.
- **Comece aqui:** as aulas de boas-vindas.
- **Método SLL em 3 etapas:** a etapa seguinte só abre quando a anterior termina, e a tela explica o
  que falta.
- **Página da aula:** player Panda, lista das aulas ao lado, botões de anterior, próxima e
  "marcar como concluída". O progresso fica salvo e ela volta de onde parou.
- **Cursos complementares** da Shopee.
- **Recursos e ferramentas:** calculadoras de preço e lucro, descontos e anúncios; quatro guias
  de assistentes; guia em PDF e planilha de custos para baixar. Os arquivos são privados, com
  acesso conferido. O que ainda não tem arquivo ou destino válido aparece como "em breve".
- **Minhas lojas:** pronta para mostrar as lojas dela. A Shopee depende da conexão (em breve).
  TikTok Shop e Mercado Livre aparecem como "em breve".

O conteúdo levantado do curso antigo foi importado: títulos, textos, aulas e links. São **71
aulas com player Panda**, com 70 vídeos únicos, publicadas em cinco trilhas. A Etapa 2 reutiliza
as aulas das outras etapas, sem duplicar os vídeos. Reprodução, navegação e ferramentas foram
conferidas online; os 70 vídeos não foram reproduzidos individualmente.

Nove links antigos de materiais retornam páginas em vez de arquivos. Eles continuam "em breve"
até recebermos os originais ou links válidos. Envio Velox também depende de um destino real.
Os guias dos assistentes funcionam; as respostas dos GPTs dependem da conta da aluna no ChatGPT.
Detalhes em `docs/SLL-VIDEOS-PANDA.md` e `docs/SLL-FERRAMENTAS.md`.

### Vídeo de apresentação

- A apresentação tem versões para computador e celular, com 68 segundos e narração.
- A nova versão curta tem 30 segundos, formato vertical, o app num celular e música ambiente
  própria, sem narração. Os títulos explicam cada cena mesmo sem som.
- O código e os comandos de geração ficam em `video/README.md`. Esse vídeo de divulgação é
  separado do vídeo de orientação da Loja Pronta, que ainda precisa ser fornecido.

### Painel da equipe (admin)

- **Conteúdo:** criar, editar, reordenar e publicar trilhas, etapas, aulas e cursos. Dá para
  colocar texto, link, imagem, vídeo e arquivo em cada aula.
- **Rascunho e prévia:** a equipe vê a aula como a aluna vai ver antes de publicar. O que está
  publicado só muda quando alguém clica em publicar.
- **Banners, recursos e textos** do painel da aluna.
- **Arquivados:** o que foi apagado pode ser recuperado.
- **Acessos:** liberar ou retirar o SLL e a Loja Pronta de cada aluna, com o motivo registrado.
- **Hotmart:** tela para colocar os códigos dos produtos e o token da conta.

### Compra pela Hotmart

A plataforma já sabe receber os avisos da Hotmart:

- **Compra aprovada:** cria a conta e libera só o produto comprado.
- **Reembolso ou chargeback:** tira o acesso daquela compra.
- Aviso repetido não cria conta nem acesso duplicado.

Foi testado no computador de desenvolvimento, **ainda não com compras reais**.

### Qualidade e segurança

- Funciona no celular e no computador, nos temas claro e escuro.
- Pensado para quem tem pouca familiaridade com computador: texto simples, uma decisão por tela,
  botões grandes, funciona com teclado e com leitor de tela.
- Nada finge funcionar: o que ainda não existe aparece como "em breve".
- Em 6/10 foi feita uma revisão de segurança e desempenho: limites no envio de arquivos,
  conferência dos links, downloads mais leves para o servidor e consultas mais rápidas no curso.
  Detalhes em `docs/REVISAO-SEGURANCA-PERFORMANCE.md`.
- A publicação no servidor (Coolify) está documentada em `docs/DEPLOY-COOLIFY.md`.

## O que falta e do que depende

| O que falta                                       | Depende de                                                 |
| ------------------------------------------------- | ---------------------------------------------------------- |
| Vendas reais liberando acesso                     | Códigos dos produtos e token da Hotmart; serviço de e-mail |
| E-mail de boas-vindas com "Criar minha senha"     | Contratar e configurar o envio de e-mail                   |
| Vídeo de orientação da Loja Pronta                | Fornecer o vídeo e enviá-lo pelo comando existente         |
| Conectar a Shopee e publicar a loja (fases 4 e 6) | Cadastro de parceiro na Shopee Open Platform               |
| Sugestão de produtos (fase 5)                     | Nome e acesso ao sistema (API) do fornecedor               |
| Passo a passo da conta Shopee mais fiel           | Prints ou vídeo das telas atuais da Shopee                 |
| Categorias de produto definitivas                 | Catálogo do fornecedor (hoje é uma lista provisória)       |
| Limites de tamanho do nome e do texto da loja     | Confirmar na Central do Vendedor da Shopee                 |
| Envio do vídeo de orientação pelo painel          | Implementar essa tela; vídeos Panda do SLL já têm editor   |
| Imagens e arquivos originais do curso antigo      | Migrar capas, banners e materiais                          |
| Regra para cancelamento de assinatura             | Decisão do negócio (hoje não tira o acesso)                |

## Próximas decisões que precisam do dono

1. **Arquivos antigos e vídeo de orientação.** Fornecer os anexos válidos do curso e o vídeo da Loja Pronta.
2. **Dados da Hotmart e serviço de e-mail.** Trava as vendas reais.
3. **Cadastro na Shopee Open Platform.** Trava a conexão e a publicação automática da loja.
4. **Qual fornecedor de produtos.** Trava a fase de produtos.
5. **O que fazer quando uma assinatura é cancelada.**
