# Integração com a Hotmart

> **Status (T25):** recebimento de eventos v2, verificação do Hottok, mapeamento dos dois produtos, criação de conta, liberação e retirada de acessos e histórico básico implementados. Configure em `/admin/hotmart`.
> **Ainda não está pronta para compras reais:** falta configurar os códigos e o token da conta Hotmart, contratar/configurar o envio de email e concluir o convite de primeiro acesso. O formulário atual não testa a conexão externa; não confundir salvar com validar a Hotmart.

O webhook é `/api/hotmart/webhook`. Cadastre na Hotmart o endereço HTTPS público mostrado no painel. São tratados `PURCHASE_APPROVED`/`PURCHASE_COMPLETE` como liberação e `PURCHASE_REFUNDED`/`PURCHASE_CHARGEBACK` como retirada imediata da transação. Cancelamento de assinatura continua sem política definida e não remove acesso. Reembolsar uma transação não remove outra compra ativa do mesmo produto nem um acesso concedido manualmente. A transação é a chave da compra: se a compradora trocar o email na Hotmart, os avisos seguintes (inclusive o reembolso) continuam valendo para a conta ligada à compra, e o histórico registra a troca. Um aviso da mesma transação com outro produto fica no histórico sem mudar acesso. Um aviso de produto sem mapeamento aparece no histórico e responde com erro temporário para permitir nova entrega após corrigir o código. O histórico não armazena o corpo completo do evento.

O token é criptografado no banco com chave derivada de `BETTER_AUTH_SECRET`; trocar esse segredo exige migrar a configuração antes, ou cadastrar o token de novo. Até isso, o webhook responde erro temporário (503) e registra no log do servidor que o token precisa ser salvo de novo, para a Hotmart reenviar os avisos depois. O painel não devolve o token ao navegador.

---

## 1. Por que essa integração existe

A área de membros **não tem cadastro público**. Toda conta de aluna nasce de uma compra feita na Hotmart.

Sem essa integração, **ninguém consegue entrar no sistema**, porque não existe outra forma de criar conta.

A tela de login entregue na primeira etapa já parte desse princípio: ela **assume que a conta já existe** e, por enquanto, orienta a aluna a usar o email da compra e a senha temporária recebida por email. Com a integração, a senha temporária dá lugar a um link de primeiro acesso (ver [4.1](#41-primeiro-acesso-por-link-sem-senha-temporária)). O login já funciona de verdade (Better Auth + Postgres), mas enquanto a integração não existir só entram contas de teste criadas com `bun run dev:aluna`.

---

## 2. O que a integração vai fazer

Visão geral, sem detalhes de implementação:

1. **Receber o aviso de compra da Hotmart.** A Hotmart avisa o sistema automaticamente a cada evento de compra. Ela chama esse recurso de _Webhook_; em versões antigas, de _Postback_.
2. **Criar a conta da aluna** usando o email da compra, **sem senha temporária** (ver [Primeiro acesso por link](#41-primeiro-acesso-por-link-sem-senha-temporária)).
3. **Liberar o acesso** ao conteúdo correspondente ao produto comprado.
4. **Tratar reembolso, cancelamento e chargeback**, bloqueando ou removendo o acesso conforme a política definida (ver [Pendências](#5-pendências-e-perguntas-em-aberto)).
5. **Enviar o email de boas-vindas** com um botão **"Criar minha senha"**, que leva direto à tela de criar a senha.

Cada aviso recebido precisa ser **verificado**, para confirmar que veio mesmo da Hotmart, e precisa ser **idempotente**: se o mesmo aviso chegar duas vezes, a aluna não pode ganhar duas contas nem receber dois emails.

---

## 3. Decisão obrigatória: tudo configurável por um painel administrativo

O cliente final é **leigo em tecnologia**. Por isso:

> **Nenhuma credencial ou configuração da Hotmart pode ficar em arquivo `.env` ou no código.**
> Tudo deve ser configurado por uma tela do painel administrativo.

### 3.1 Como deve ser a tela de configuração

- Campos com **linguagem simples**. Por exemplo, "Token de verificação da Hotmart" em vez de "Hottok", com o nome técnico entre parênteses quando ajudar o suporte.
- Um **passo a passo ilustrado** (prints) mostrando onde encontrar cada informação dentro da Hotmart.
- Um botão **"Testar conexão"** com resultado claro:
  - ✅ **Funcionou**: a conexão está ok;
  - ❌ **Não funcionou**: explica o que provavelmente está errado e o que fazer, sem mensagens técnicas cruas.
- Um **indicador de status** da integração, sempre visível. Por exemplo: _Ativa_, _Não configurada_, _Com erro desde 12/03_.

### 3.2 O que o painel deve permitir configurar

- [ ] **Credenciais da Hotmart** e a **chave/token de verificação** dos avisos.
- [ ] **Mapeamento produto → acesso**: quais produtos da Hotmart liberam quais acessos no sistema. Um produto pode liberar mais de um acesso.
- [ ] **Email de boas-vindas**: remetente, assunto e texto, com pré-visualização.
- [ ] **Link da página de venda**, para um possível "Ainda não é aluna? Conheça o curso" no login.
- [ ] O **endereço que deve ser cadastrado na Hotmart** para receber os avisos. Esse campo é somente leitura, com botão "Copiar".

### 3.3 Segurança das configurações

- Segredos (credenciais e token) ficam guardados no **banco de dados, criptografados**.
- Eles são usados **somente no servidor**.
- Na tela, aparecem **sempre mascarados** (ex.: `••••••••a91f`). O valor completo **nunca** volta para o navegador. Para trocar, a pessoa digita um novo valor.
- **Só administradores** podem ver ou alterar essas configurações.
- Toda alteração de configuração fica registrada: quem alterou e quando, sem gravar o valor do segredo.

### 3.4 Registro (log) dos avisos recebidos

Deve existir uma tela com o **histórico legível** de todos os avisos recebidos da Hotmart, para o cliente ou o suporte entenderem o que aconteceu com cada compra. Por exemplo:

| Quando         | Evento    | Aluna               | Produto      | Resultado                         |
| -------------- | --------- | ------------------- | ------------ | --------------------------------- |
| 12/03 às 14:02 | Compra    | m\*\*\*@gmail.com   | Curso Shopee | ✅ Conta criada e email enviado   |
| 12/03 às 15:40 | Reembolso | j\*\*\*@hotmail.com | Curso Shopee | ✅ Acesso bloqueado               |
| 12/03 às 16:11 | Compra    | —                   | Produto X    | ⚠️ Produto sem acesso configurado |

- Linguagem simples no resultado; detalhe técnico só num "ver detalhes" para o suporte.
- Possibilidade de **reprocessar** um aviso que falhou depois que o problema for corrigido.
- Cuidado com dados pessoais: mostrar o email parcialmente mascarado na listagem e definir por quanto tempo o histórico é guardado (LGPD).

---

## 4. O que muda na tela de login

**Agora, nada.**

Quando a integração existir:

- O **link de compra** ("Ainda não é aluna?") e os **textos de apoio** do login poderão vir das configurações do painel, em vez de ficarem fixos no código.
- A **troca obrigatória da senha temporária** já funciona. Toda conta nasce com `mustChangePassword: true`: no primeiro login, a aluna vai pra `/primeiro-acesso` e cria a própria senha antes de seguir. A decisão fica no ponto único de redirecionamento pós-login (`src/features/auth/server/post-login.ts`). Se ela usar "Esqueci a senha" antes, a marca também é desligada.
- A conta da aluna deve ser criada no servidor com `auth.api.createUser` do Better Auth (plugin admin, já configurado em `src/server/auth/auth.ts`), com `emailVerified: true` (a compra comprova o email) e a senha temporária. Não é preciso passar `mustChangePassword`: o padrão já é `true`. O script `scripts/criar-aluna-teste.ts` mostra a chamada.
- **Liberar o produto:** inserir uma linha em `student_products` (`user_id` + `product`, que é `sll` ou `loja-pronta`; a lista fica em `src/config/products.ts`). Com os dois produtos, a aluna escolhe a área no início; com um só, entra direto nele; sem nenhum, vê o aviso de acesso ainda não liberado.
- **Loja Pronta:** a fase da loja de cada aluna fica em `stores` (`user_id` + `phase`, de 1 a 7; os nomes das fases ficam em `src/config/store-phases.ts`). Sem linha, a área mostra a fase 1. A equipe avança a fase (por enquanto direto no banco; depois, pelo painel).
- **Reembolso de um produto só** (quem tem os dois): remover a linha daquele produto. A área dele deixa de abrir na hora.
- **Bloquear acesso** (reembolso, chargeback): marcar a conta como desativada com `auth.api.banUser` do plugin admin, que também encerra as sessões abertas. O login já mostra a mensagem certa pra esse caso. Se o bloqueio for feito direto no banco (`banned = true`), as telas já tratam a sessão como encerrada (`getActiveSession` em `src/features/auth/server/session.ts`), mas as sessões continuam guardadas até expirar.
- O **envio de emails** (boas-vindas e redefinição de senha) entra em `src/server/auth/emails.ts`, que já concentra os emails de acesso (redefinição de senha e confirmação de email); o de boas-vindas entra ao lado. As mensagens de erro já estão prontas em `src/features/auth/messages.ts`.

### 4.1 Primeiro acesso por link, sem senha temporária

**Decisão (outubro de 2026):** a compra não gera mais senha temporária. O email de boas-vindas traz um botão **"Criar minha senha"** que abre a tela de criar a senha já identificada, como a Apple faz ao criar uma conta.

**Por quê:** com senha temporária, a aluna precisa copiar uma senha do email, entrar com ela e então criar outra. Isso exige uma dica no campo de senha do login ("Primeiro acesso? Use a senha temporária…"), confunde quem não acha o email ("qual senha eu uso?") e cria uma senha que circula por email. Com o link, o login fica só com email, senha e "Esqueceu ou não recebeu a senha?".

**Como fazer (proposta):**

- Criar a conta com `auth.api.createUser` e uma senha aleatória longa que **nunca é enviada** (a conta precisa de uma senha, mas ninguém a conhece), com `emailVerified: true`.
- Gerar um **convite de uso único** com validade maior que a do link de redefinição (1 hora é pouco pra um email de boas-vindas; sugestão: 7 dias), guardado só como hash, e mandar o link no email.
- A tela do convite reaproveita a de criar senha (`/redefinir-senha` e o medidor de força). Ao salvar: grava a senha, apaga o convite, desliga `mustChangePassword` e já entra (sessão nova).
- Convite vencido ou usado: a mesma tela de link inválido de hoje, com "Pedir um link novo", que já manda um link de redefinição pro email da compra.
- Quando isso existir, saem: a dica de senha temporária no login (`login-form.tsx`), a tela `/primeiro-acesso` (ou ela fica só pra contas antigas, enquanto houver) e o texto "Serve também se a senha temporária não chegou" da recuperação.

---

## 5. Pendências e perguntas em aberto

Decidir com o cliente antes de implementar:

- [ ] **Reembolso:** bloquear o acesso na hora ou só depois do prazo de garantia? E no _chargeback_?
- [ ] **Reembolso parcial ou cancelamento de assinatura:** o acesso vai até o fim do período já pago?
- [ ] **Mesmo email comprando dois produtos:** a aluna mantém a conta e a senha atuais e só ganha o novo acesso? Recebe algum email avisando?
- [ ] **Email da compra diferente do email que a aluna quer usar:** existe processo pra trocar? Quem faz?
- [ ] **Reenvio do convite:** além de "Esqueceu ou não recebeu a senha?" (que já resolve sozinho), o suporte também reenvia pelo painel?
- [ ] **Validade do convite** de primeiro acesso: 7 dias está bom?
- [ ] **Falha no aviso da Hotmart:** quem recebe o alerta (email? WhatsApp?) e em quanto tempo alguém precisa agir?
- [ ] **Compras feitas antes da integração existir:** vamos importar as alunas antigas? De que forma (planilha exportada da Hotmart)?
- [ ] **Produto sem acesso configurado:** a compra fica pendente e gera alerta, ou é ignorada?
- [ ] **Contato de suporte** exibido para conta desativada: email, WhatsApp ou link? Também deve ser configurável pelo painel.
- [ ] **Remetente do email** de boas-vindas: qual domínio e serviço de envio? Isso afeta a chance de cair no spam.
- [ ] **Retenção do histórico** de avisos: por quanto tempo guardar (LGPD)?

---

## 6. Ordem sugerida de trabalho

1. **Login** ✅ (etapa atual: telas de login e recuperação de senha)
2. **Painel administrativo básico**: acesso de administrador, layout e permissões.
3. **Tela de configuração da Hotmart**: campos, segredos criptografados, "Testar conexão" e status.
4. **Recebimento das compras**: verificação dos avisos, registro legível e criação de conta com o convite de primeiro acesso no email de boas-vindas.
5. **Liberação de acesso**: mapeamento produto → acesso, reembolso e cancelamento.

> Os nomes exatos dos eventos e o formato dos avisos devem ser conferidos na documentação oficial da Hotmart no momento da implementação, porque eles podem mudar.
