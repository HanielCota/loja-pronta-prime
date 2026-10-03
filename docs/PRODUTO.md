# Loja Pronta Prime — O que é a plataforma

## Em uma frase

A Loja Pronta Prime ([lojaprontaprime.com](https://lojaprontaprime.com)) é uma área de membros para mulheres iniciantes que querem ganhar uma renda vendendo na Shopee. Ela oferece um curso com ferramentas e uma montagem de loja automática, passo a passo, em que a própria aluna cria a loja com tudo já preparado.

## O problema que resolve

Muitas mulheres querem vender online, mas não sabem escolher o que vender, criar anúncios, precificar considerando as taxas da Shopee, nem montar a identidade da loja (nome, logo, descrição). A plataforma resolve isso de duas formas: ensinando, ou levando ela pela mão, um passo de cada vez.

## Para quem é

- **Aluna:** mulher iniciante em vendas online, sem conhecimento técnico.
- **Equipe interna:** operação e suporte, que acompanha alunas e lojas.
- **Dono do sistema:** quem opera o negócio e não é técnico.

## Os dois produtos

Ambos são vendidos pela Hotmart, e a compra libera o acesso na plataforma.

### SLL — Sistema Loja Lucrativa

Curso em vídeo com ferramentas, para a aluna aprender e vender por conta própria.

- Trilha de boas-vindas.
- Método em 3 Etapas: as etapas seguintes só abrem depois que a aluna conclui a anterior.
- Minicursos complementares.
- Marcação de aulas concluídas e acompanhamento do progresso.
- Painel de métricas da loja Shopee, depois que a aluna conecta a loja dela.
- Ferramentas: calculadora de preço da Shopee e assistentes de IA prontos para uso.

### Loja Pronta

A aluna monta a própria loja na Shopee pela plataforma, sem equipe: tudo é automático e passo a passo, com uma decisão por tela e ideias já prontas. O público é muito iniciante (muitas mal sabem usar o computador), então nada pode exigir conhecimento técnico.

A jornada tem 7 fases, da primeira conversa até a loja no ar:

1. **Conversa inicial:** o perfil e as preferências da aluna (detalhes abaixo).
2. **Sua marca:** ela escolhe o nome, monta o logo num estúdio e escolhe o texto da loja (detalhes abaixo).
3. **Conta na Shopee:** ela abre a conta de vendedora (CPF, documento, selfie, conta bancária) com um passo a passo guiado. Só ela pode fazer isso: a Shopee exige a própria pessoa.
4. **Conexão com a Shopee:** um botão liga a conta dela à plataforma (autorização da Shopee Open Platform).
5. **Produtos:** a plataforma sugere produtos do fornecedor (dropshipping), com o preço já calculado com as taxas da Shopee.
6. **Publicação:** a plataforma publica a marca e os produtos na loja dela, pela API da Shopee.
7. **Loja no ar:** acompanhamento das vendas.

A aluna sempre sabe em que fase está. Fases sem tela ainda aparecem como "em breve", com aviso no WhatsApp quando abrirem.

Pendências de fora: as fases 3 a 7 ainda não têm telas. A 3 precisa de prints ou vídeo das telas atuais da Shopee; a 4 e a 6, do cadastro de parceiro na Shopee Open Platform; a 5, do nome e da API do fornecedor. Os limites de nome (30) e de texto da loja (500) em `src/config/brand.ts` precisam ser confirmados na Central do Vendedor.

#### Conversa inicial (fase 1)

Feita na própria plataforma, uma pergunta por tela, com o mascote "fazendo" cada pergunta. Leva uns 5 minutos e dá para parar e continuar depois: cada resposta fica salva.

- **Sobre você:** se já vendeu pela internet, o que a motivou, o que mais a preocupa, que tipo de produto gostaria de vender (até 3) e quanto tempo tem por semana.
- **Sua marca:** nome da loja (ou "ainda não decidi", e a plataforma sugere), estilo, cor principal (ou "escolho depois"), como quer que as clientes se sintam (até 3) e um toque pessoal opcional.
- **Confirmar:** revisão de todas as respostas, com edição, e o WhatsApp em que ela recebe os avisos de cada fase.

Ao enviar, a loja passa para a fase 2 e ela já pode criar a marca.

#### Sua marca (fase 2)

Mesmo formato da conversa: um passo por tela, tudo salvo a cada escolha. Leva uns 10 minutos.

1. **Nome:** o nome que ela deu na conversa e 6 ideias montadas com as respostas dela (categorias, estilo e o nome dela), ou um nome escrito por ela. Cada nome é um botão: um toque escolhe e segue.
2. **Modelo do logo:** 6 logos prontos, um por formato (ícone em cima, ícone ao lado, selo redondo, inicial em destaque, só o nome e faixa), já com o nome, a letra do estilo, a cor e um ícone da categoria.
3. **Estúdio:** ela muda a cor (12, com fundo branco ou colorido), o desenho (29 ícones ou nenhum), a letra (6 fontes) e o formato, vendo o logo mudar na hora e como ele fica no círculo da Shopee. Tem "Desfazer" e "Voltar ao modelo".
4. **Texto da loja:** 3 textos prontos com as respostas dela, ou um escrito por ela.
5. **Revisão:** logo, nome e texto juntos, cada um com "Mudar". Ao confirmar, a loja passa para a fase 3 e ela pode baixar o logo em PNG (1000×1000).

Não há IA de imagem: o logo é desenhado pela plataforma a partir dos modelos, então sai igual na tela e no arquivo.

Pendências: as categorias de produto ainda são uma lista provisória (devem vir do catálogo de fornecedores) e o vídeo de boas-vindas da Pri, que existia no sistema antigo, fica para quando houver o vídeo.

### Aluna com os dois produtos

Ao entrar, ela escolhe qual área quer acessar.

## Como o acesso funciona

1. A aluna compra na Hotmart.
2. A conta é criada automaticamente e o produto comprado é liberado.
3. Ela recebe um e-mail de boas-vindas com o botão "Criar minha senha".
4. O botão abre a tela de criar a senha; ao salvar, ela já entra.
5. Depois, entra com e-mail e senha.

Hoje, até a integração com a Hotmart existir, as contas de teste usam uma senha temporária no lugar do botão (ver `docs/INTEGRACAO-HOTMART.md`, seção 4.1).

Não existe cadastro público: só entra quem comprou ou quem a equipe liberou manualmente. Reembolso ou cancelamento bloqueia o acesso.

## O que a equipe interna faz

A equipe não participa da montagem das lojas. No painel administrativo (ainda a construir), ela:

- Vê todas as lojas e a fase de cada uma.
- Consulta o histórico de cada loja.
- Libera ou remove acessos manualmente, registrando o motivo.
- Acompanha quantas compradoras chegaram a entrar na plataforma.
- Configura o sistema por tela, sem mexer em arquivos técnicos.

## Glossário

- **Aluna:** cliente final que comprou um dos produtos.
- **SLL:** Sistema Loja Lucrativa, o curso com ferramentas.
- **Loja Pronta:** produto em que a aluna monta a loja na Shopee pela plataforma, passo a passo e de forma automática.
- **Shopee:** marketplace onde as lojas vendem.
- **Dropshipping:** venda sem estoque próprio; o fornecedor envia o produto ao cliente.
- **Hotmart:** plataforma onde os produtos são vendidos.
- **Fase:** cada etapa da jornada da Loja Pronta.
- **Senha temporária:** senha das contas de teste, usada só no primeiro acesso. Com a integração com a Hotmart, dá lugar ao link "Criar minha senha" do email de boas-vindas.
