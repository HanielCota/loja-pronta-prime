# Painel de leads

Entrada prevista: `https://leads.lojaprontaprime.com`. Na aplicação, as telas ficam em `/leads`.
O domínio principal continua abrindo a área das alunas. A raiz do subdomínio abre o painel por
uma regra de host do Next.js, antes das páginas existentes.

## O que está disponível

- Cadastro e edição de nome, email, WhatsApp brasileiro, origem, produto de interesse,
  responsável, etiquetas, etapa, próximo contato e motivo de perda.
- Etapas: Novo, Em contato, Interessado, Oferta enviada, Venda concluída e Sem interesse.
- Resumo de contatos ativos, retornos até hoje, vendas marcadas e conversão dos contatos
  encerrados: vendas divididas por vendas mais perdas. Sem encerramentos, mostra um traço.
- Busca por nome, email, WhatsApp e etiqueta; filtros de etapa, produto, origem, responsável,
  retornos e arquivados. A lista tem 30 contatos por página.
- Histórico de cadastro, alterações (com mudança de etapa), anotações, arquivamento e restauração.
  A tela mostra os últimos 100 registros, preservando os demais no banco.
- Arquivamento reversível. Arquivados saem dos indicadores e da lista ativa.
- Abrir WhatsApp ou o aplicativo de email. A pessoa escreve e envia no próprio aplicativo.
  O painel não envia mensagens nem lê conversas automaticamente.
- Importação com prévia e confirmação: CSV UTF-8 do Excel ou Google Sheets, vírgula ou ponto e
  vírgula, até 2 MB e 1.000 contatos por arquivo. Há um modelo vazio para baixar.
- Todas as linhas são validadas antes da confirmação; linhas inválidas impedem a importação.
  Email ou WhatsApp repetido é ignorado, inclusive nos arquivados, sem sobrescrever dados.
  Reenviar o arquivo não duplica contatos. A gravação e o histórico são transacionais.
- Exportação CSV com os filtros atuais, até 10.000 contatos, com proteção contra fórmulas de
  planilha e sem cache público. O arquivo usa as mesmas colunas da importação.

## Acesso e regras

O painel, arquivos e Server Actions exigem administradora ativa com a primeira senha concluída.
As contas são as mesmas do admin. O login cria uma sessão no host usado, sem compartilhar cookies
com todos os subdomínios. A origem HTTPS dos leads está explicitamente permitida no Better Auth;
os links de recuperação continuam usando a URL canônica em `BETTER_AUTH_URL`.

Email é normalizado para minúsculas, e WhatsApp para os dígitos com DDD. Índices únicos protegem
contra duplicados, inclusive em gravações simultâneas. Nome pode se repetir. Quando email e telefone
já pertencem a contatos diferentes, a importação ignora a linha; a união de contatos é manual.

Marcar Venda concluída é uma informação comercial do painel. Não confirma pagamento, cria conta
nem libera cursos. Uma etapa encerrada limpa o próximo contato. Sem interesse exige um motivo.
Uma edição feita sobre dados que já mudaram em outra tela é recusada para evitar sobrescrita.

## Colunas do CSV

`nome`, `email`, `whatsapp`, `origem`, `produto`, `etapa`, `proximo_contato`, `etiquetas`, `motivo_perda`.
Nome e pelo menos um meio de contato são obrigatórios. Outras colunas podem ser omitidas.
Produtos usam `undecided`, `loja-pronta`, `sll` ou `both`; etapas usam `new`, `contacted`,
`qualified`, `proposal`, `won` ou `lost`. Datas: `AAAA-MM-DD`, no dia de São Paulo.
Etiquetas são separadas por vírgula. O responsável é escolhido no painel ao confirmar a importação.

## Publicação

1. Integrar o PR na `main` e publicar a aplicação existente no Coolify. O inicializador aplica
   `0045_leads-dashboard.sql` antes de iniciar o servidor, como as demais migrações.
2. Criar no provedor DNS o registro `leads`, apontando para o mesmo destino da aplicação atual
   (A/AAAA ou CNAME, conforme a configuração real do domínio).
3. Acrescentar `https://leads.lojaprontaprime.com` em Domains da aplicação existente no Coolify,
   preservando o domínio principal. Conferir o certificado HTTPS do novo domínio.
4. Manter `BETTER_AUTH_URL` no endereço canônico atual. Não precisa criar outra aplicação,
   outro banco nem expor o PostgreSQL.
5. Conferir a raiz dos dois domínios, login de admin, bloqueio de aluna, cadastro e download CSV.

## Próximas evoluções possíveis

Formulários de captação com consentimento e origem de campanha; sincronização de compras Hotmart;
integração oficial com WhatsApp; tarefas e avisos automáticos de retorno; permissões comerciais
separadas do admin; união de duplicados; importação XLSX e mapeamento de colunas; métricas por
período, campanha e responsável. Esses recursos dependem de escopo e integrações adicionais e
não estão representados por controles sem função no painel atual.
