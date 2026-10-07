# Resend — Loja Pronta Prime

Domínio de envio: **mail.lojaprontaprime.com**. Remetente: **Loja Pronta Prime
&lt;acesso@mail.lojaprontaprime.com&gt;**. Região: São Paulo (`sa-east-1`). Rastreamento
de abertura e cliques desligado para preservar os links de acesso.

## DNS da Cloudflare

Na zona `lojaprontaprime.com`, adicione estes registros retornados pela Resend em
7 de outubro de 2026. Use TTL **Auto**. O CNAME precisa ficar como **DNS only**,
com a nuvem cinza.

| Tipo  | Nome                     | Conteúdo                                | Prioridade |
| ----- | ------------------------ | --------------------------------------- | ---------- |
| TXT   | `resend._domainkey.mail` | Veja a chave DKIM abaixo                | —          |
| MX    | `send.mail`              | `feedback-smtp.sa-east-1.amazonses.com` | 10         |
| TXT   | `send.mail`              | `v=spf1 include:amazonses.com ~all`     | —          |
| CNAME | `rsend.mail`             | `send.forge.rmta.net`                   | —          |

Conteúdo completo do TXT de DKIM (chave pública, não é uma credencial):

```text
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCigt77fRl2EXo23NmX5dgcDHBLTmi7U9FYgQocPhVdOXrYpGcdnljj9EwaV0e6lt6e+o/JebGgrE02Pc0unNCBiptna/V8snshFT5EXvoln+utLomzVLH8WC5pciWXnF/HxjxR928evD85cVN/bwcoBMz7XzHZ0rpOjJ30BgeJ1wIDAQAB
```

Preserve os registros existentes do site e de outras caixas de email. Se já houver
um registro com o mesmo nome e tipo, confira o conteúdo antes de criar duplicatas.
Depois, abra o domínio na [Resend](https://resend.com/domains) e inicie a verificação.
O envio só estará pronto quando o domínio aparecer como **Verified**.

## Configuração do servidor

Crie uma chave **Sending access**, limitada a `mail.lojaprontaprime.com`. Guarde a
chave em `RESEND_API_KEY`, sem enviá-la ao Git. Configure também
`EMAIL_FROM=acesso@mail.lojaprontaprime.com`. No Coolify, ambas são **Runtime**,
sem **Build Variable**. `EMAIL_REPLY_TO` é opcional e deve apontar para uma caixa
real de suporte. Não há recebimento de email configurado nesse subdomínio.

O código precisa estar integrado na `main` e publicado para enviar os emails de
recuperação e confirmação. A integração não envia o convite inicial da Hotmart.
Validação e comportamento em desenvolvimento: [DEPLOY-COOLIFY.md](DEPLOY-COOLIFY.md#emails-de-acesso-pela-resend).
