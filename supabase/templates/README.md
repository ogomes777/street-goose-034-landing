# E-mails de login (Supabase Auth via Resend)

Os e-mails de cadastro, código de acesso e nova senha saem pela Resend
(domínio `streetgoose034.com.br`, já verificado), não pelo envio padrão do
Supabase, que tem limite baixo e cai no spam.

## SMTP — Supabase → Authentication → Emails → SMTP Settings

| Campo | Valor |
|---|---|
| Sender email | `acesso@streetgoose034.com.br` |
| Sender name | `Street Goose 034` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | uma API key da Resend com "Sending access" só para `streetgoose034.com.br` |

## Modelos — Supabase → Authentication → Emails → Templates

| Modelo no Supabase | Assunto | Arquivo |
|---|---|---|
| Confirm signup | Confirme sua conta Street Goose 034 | `confirm-signup.html` |
| Magic link | Seu código de acesso Street Goose 034 | `magic-link.html` (usa `{{ .Token }}`: o site pede o código) |
| Reset password | Crie uma nova senha Street Goose 034 | `reset-password.html` |

## DNS — Cloudflare

Registro TXT `_dmarc` com o valor `v=DMARC1; p=none;` (o Gmail exige DMARC).

## Limites

Plano gratuito da Resend: 100 e-mails por dia e 3.000 por mês, somando os
avisos (`avisos@`) e os e-mails de login.
