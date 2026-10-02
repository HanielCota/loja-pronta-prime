# Integração com a Hotmart

> **Status:** ainda não implementada. Este documento é a referência para as próximas etapas.
> Nada aqui deve ser codificado antes de o painel administrativo existir (ver [Ordem de trabalho](#6-ordem-sugerida-de-trabalho)).

---

## 1. Por que essa integração existe

A área de membros **não tem cadastro público**. Toda conta de aluna nasce de uma compra feita na Hotmart.

Sem essa integração, **ninguém consegue entrar no sistema**, porque não existe outra forma de criar conta.

A tela de login entregue na primeira etapa já parte desse princípio: ela **assume que a conta já existe** e orienta a aluna a usar o email da compra e a senha temporária recebida por email. O login já funciona de verdade (Better Auth + Postgres), mas enquanto a integração não existir só entram contas de teste criadas com `bun run dev:aluna`.

---

## 2. O que a integração vai fazer

Visão geral, sem detalhes de implementação:

1. **Receber o aviso de compra da Hotmart.** A Hotmart avisa o sistema automaticamente a cada evento de compra. Ela chama esse recurso de _Webhook_; em versões antigas, de _Postback_.
2. **Criar a conta da aluna** com uma **senha temporária**, usando o email da compra.
3. **Liberar o acesso** ao conteúdo correspondente ao produto comprado.
4. **Tratar reembolso, cancelamento e chargeback**, bloqueando ou removendo o acesso conforme a política definida (ver [Pendências](#5-pendências-e-perguntas-em-aberto)).
5. **Enviar o email de boas-vindas** com as instruções de primeiro acesso: endereço do login, email da compra e senha temporária.

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
- A **troca obrigatória da senha temporária** no primeiro acesso será ligada no ponto único de redirecionamento pós-login: `src/features/auth/server/post-login.ts`.
- A conta da aluna deve ser criada no servidor com `auth.api.createUser` do Better Auth (plugin admin, já configurado em `src/server/auth/auth.ts`), com `emailVerified: true` (a compra comprova o email) e a senha temporária. O script `scripts/criar-aluna-teste.ts` mostra a chamada.
- **Bloquear acesso** (reembolso, chargeback): marcar a conta como desativada (`banned`) com o plugin admin. O login já mostra a mensagem certa pra esse caso.
- O **envio de emails** (boas-vindas e redefinição de senha) entra em `src/server/auth/emails.ts`, que já concentra os emails de acesso (redefinição de senha e confirmação de email); o de boas-vindas entra ao lado. As mensagens de erro já estão prontas em `src/features/auth/messages.ts`.

---

## 5. Pendências e perguntas em aberto

Decidir com o cliente antes de implementar:

- [ ] **Reembolso:** bloquear o acesso na hora ou só depois do prazo de garantia? E no _chargeback_?
- [ ] **Reembolso parcial ou cancelamento de assinatura:** o acesso vai até o fim do período já pago?
- [ ] **Mesmo email comprando dois produtos:** a aluna mantém a conta e a senha atuais e só ganha o novo acesso? Recebe algum email avisando?
- [ ] **Email da compra diferente do email que a aluna quer usar:** existe processo pra trocar? Quem faz?
- [ ] **Reenvio da senha temporária:** a aluna usa "Esqueci minha senha" ou o suporte reenvia pelo painel? Ou as duas coisas?
- [ ] **Validade da senha temporária:** ela expira? Em quanto tempo?
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
4. **Recebimento das compras**: verificação dos avisos, registro legível e criação de conta com senha temporária e email de boas-vindas.
5. **Liberação de acesso**: mapeamento produto → acesso, reembolso e cancelamento.

> Os nomes exatos dos eventos e o formato dos avisos devem ser conferidos na documentação oficial da Hotmart no momento da implementação, porque eles podem mudar.
