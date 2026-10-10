# Piloto Bling da MSL

Preparado em 10 de outubro de 2026. A conta Bling da cliente/MSL e o aplicativo privado foram
criados e conferidos no navegador. O dono aprovou os três escopos abaixo e a autorização do
BlingV2 na loja Shopee. O canal foi criado, mas o teste real retornou `No permission`: a Shopee
exige concluir o cadastro de vendedor na Central do Vendedor antes de liberar a API. A conexão
não está operacional. As cinco
variáveis foram configuradas no Coolify somente para runtime de produção, com valores ocultos.
Prévias ficam sem credenciais e com o piloto desligado. Deploy do callback e autorização da
Loja Pronta Prime ainda pendentes. Nenhuma consulta real da API foi realizada.

## Entrega no código

- Página `/admin/bling`, exclusiva para administradores, no visual existente do painel.
- Aplicativo privado para o piloto da própria empresa. A integração das contas das alunas
  exige outro escopo de produto e um aplicativo público/homologado.
- Início da autorização por Server Action e callback `/api/bling/callback`.
- Estado aleatório de 32 bytes, só hash no banco, ligado à conta, à sessão e ao aplicativo.
  Vence em cinco minutos, aceita apenas a última intenção da administradora e é consumido uma
  vez, inclusive quando a API falha. O código Bling vence em um minuto; a troca é imediata.
- Troca e renovação com `enable-jwt: 1`, credenciais Basic no cabeçalho e tokens só no servidor.
- Conferência do CNPJ retornado por `/empresas/me/dados-basicos` antes de salvar a conexão.
- Tokens cifrados com AES-256-GCM e dono incluindo empresa e aplicativo. A trava no Postgres
  serializa autorização, renovação e remoção da conexão entre processos.
- Consulta do canal Shopee habilitado e até 20 produtos ativos, por endpoints oficiais. Um canal
  habilitado no ERP não prova que o token Shopee continua válido ou que um anúncio foi publicado.
- Limite de tentativas e respostas sem segredos ou corpo de erro externo. O callback elimina
  código/estado da URL ao retornar ao painel, com `no-store` e `no-referrer`.

Não há criação de anúncios, alteração de preço/estoque, compartilhamento do catálogo da MSL
com alunas, sincronização de pedidos ou mudança automática das fases da Loja Pronta.
A remoção pelo painel apaga os tokens locais; a revogação externa é feita no Bling, em
Central de Extensões → Minhas instalações. Falha ou resultado incerto durante a renovação
exige uma autorização nova, em vez de repetir o refresh token.

## Configurar a conta piloto

1. Criar a conta Bling da MSL com os dados reais da empresa e conectar a loja Shopee.
   A senha e o aceite dos termos são concluídos pelo responsável no navegador. Na conta:
   Central de Extensões → Área do Integrador → Criar aplicativo.
   A autorização da Shopee não substitui o cadastro de vendedor. Se o teste no Bling retornar
   `complete the Seller Registration`, concluir as etapas reais em `seller.shopee.com.br`,
   depois testar novamente e reinstalar a integração apenas se continuar sendo necessário.
2. Escolher **Privado**, pois este piloto opera somente a própria conta.
3. Nome sugerido: **Loja Pronta Prime — Piloto MSL**. Categoria: **Dashboards e BI**, pois a
   entrega atual consulta dados. Não declarar publicação ou sincronização ainda inexistentes.
4. Email informado pelo dono para o cadastro e contato: `financeiro@hanielfialho.com`.
5. Descrição: “Consulta do catálogo e dos canais de venda da própria empresa na Loja Pronta
   Prime. Piloto administrativo com autorização segura pelo Bling.”
6. Callback de produção: `https://lojaprontaprime.com/api/bling/callback`. Ele estará disponível
   somente após publicar este código e aplicar a migração. Para desenvolvimento, registrar
   exatamente o callback do ambiente de teste; o Bling não substitui o callback pela URL.
7. Na tela conferida em 10/10/2026, o piloto precisa dos escopos **Produtos** (`98309`),
   **Visualizar os dados básicos da empresa** (`13645013013`) e **Integrações e Lojas Virtuais**
   (`182224097`). Não selecionar os subescopos de criação, alteração ou exclusão de produtos.
   O Bling descreve o último escopo como configuração de integrações: ele é mais amplo que as
   consultas realizadas pelo código e precisa de aprovação explícita antes de salvar o app.
   Esses IDs são documentação da tela, não substituem a configuração no Bling.
8. Guardar Client ID e Client Secret no servidor. Não enviar senha pessoal, não colocar chaves
   no Git, no navegador ou em variáveis `NEXT_PUBLIC_*`.
9. Gerar uma chave aleatória de 32 bytes em hexadecimal para `BLING_TOKEN_ENCRYPTION_KEY`,
   preservando-a nas cópias de segurança. Trocar sem recifrar invalida os tokens armazenados.
10. Configurar `BLING_CLIENT_ID`, `BLING_CLIENT_SECRET`, `BLING_TOKEN_ENCRYPTION_KEY`,
    `BLING_EXPECTED_CNPJ` (14 dígitos da empresa piloto) e `BLING_ENABLED=true`.
    Sem os cinco valores válidos, a página mostra “Conexão em breve”, sem botão de autorização.
11. Aplicar a migração `0047_bling-company-pilot` no ambiente de teste e depois no deploy
    aprovado. Não acionar um deploy sem concluir a configuração.
12. Entrar como admin em `/admin/bling` → Autorizar no Bling. Conferir a empresa exibida e
    os dados retornados em “Consultar catálogo e canal Shopee”.

Os dados cadastrais fornecidos pelo dono vêm de documento de 2023 e não representam uma
consulta atual da Receita. O código confere a empresa autorizada no ERP, sem declarar sua
situação cadastral atual. Os dados completos foram deixados num arquivo local de cadastro,
fora do Git; são desnecessários na interface das alunas.

## Colocar produtos à venda agora

Após criar a conta MSL e conectar a Shopee, é possível operar diretamente no Bling.
Conferir catálogo real, SKUs,
imagens, preços, estoque, categoria e atributos obrigatórios. Em Cadastros → Produtos,
selecionar os produtos → Exportar produtos multiloja → Shopee → Exportar produtos.
Essa operação altera anúncios reais: escolher os produtos e a loja antes de executar.
Não exportar exemplos de testes. Confirmar os anúncios publicados no painel da Shopee.

Para automatizar esse envio pela Loja Pronta ainda precisamos validar o recurso de anúncios
para o canal Shopee da conta, implementar deduplicação/reconciliação e obter permissão de
escrita. A existência de um endpoint de anúncios na API não garante suporte a todos os canais.
Não abrir escrita para alunas usando o aplicativo privado da empresa.

Fontes oficiais:

- [Cadastro e OAuth](https://developer.bling.com.br/aplicativos)
- [Autenticação com a Shopee](https://ajuda.bling.com.br/hc/pt-br/articles/360058301693-Autentica%C3%A7%C3%A3o-com-a-Shopee)
- [JWT](https://developer.bling.com.br/migracao-jwt)
- [Referência da API](https://developer.bling.com.br/referencia)
- [Aplicativos privados e públicos](https://ajuda.bling.com.br/hc/pt-br/articles/35472175289751-Diferen%C3%A7a-entre-aplicativo-p%C3%BAblico-e-aplicativo-privado-no-Bling)
- [Exportação para Shopee](https://ajuda.bling.com.br/hc/pt-br/articles/4414423105815-Exporta%C3%A7%C3%A3o-de-produtos-para-a-Shopee)
