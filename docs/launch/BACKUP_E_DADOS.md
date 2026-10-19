# Backup e inventário de dados — 20/10/2026

## Inventário

| Item | Onde | Tamanho hoje | Coberto por backup? |
|---|---|---|---|
| Código do site | GitHub `ogomes777/street-goose-034-landing` (privado) + deploys na Vercel | — | **sim**: Git + histórico de deploys (rollback em minutos) |
| Estrutura do banco (tabelas, funções, regras) | `supabase/migrations/` | 45 arquivos | **sim**: as 6 migrações que existiam só no banco foram copiadas em 20/10 (md5 conferido) |
| Dados do banco (clientes, pedidos, financeiro, XP) | Supabase, projeto `hfmzlieixfkisbyweprv` | 20 MB | **não** (ver abaixo) |
| Contas de login | Supabase Auth | 4 usuários | **não**: só vão junto com um dump completo |
| Arquivos enviados (fotos de perfil) | Supabase Storage `avatars` | 2 arquivos, 0,2 MB | **não**: backup do banco não inclui arquivos |
| Buckets `products` e `community` | Supabase Storage | vazios | — |
| Segredos (Resend, push) | Supabase Vault (4 nomes) | — | não exportar; recriar a partir das contas de origem |
| Rotinas agendadas | pg_cron (5 jobs) | — | estão nas migrações |
| Planilha de clientes | Google Sheets via edge function `customer-sheet-export` | — | é cópia, não fonte |
| E-mail | Resend + DNS no Cloudflare (SPF, DKIM, DMARC) | — | DNS fica no Cloudflare; não mexer |

## Ponto crítico: o banco não tem backup acessível hoje

O projeto está no **plano gratuito** do Supabase. A documentação oficial (supabase.com/docs/guides/platform/backups) diz que backups diários acessíveis existem a partir do plano Pro (7 dias), e recomenda que projetos gratuitos façam export próprio com `supabase db dump`. Hoje, se o banco for apagado ou corrompido, **não há como restaurar clientes e pedidos**.

Decisão do responsável (escolha uma):

1. **Plano Pro (US$ 25/mês):** backups diários de 7 dias com restauração pelo painel. RPO até 24 h.
2. **Export manual semanal (grátis):** feito por quem tem a senha do banco, num computador de confiança:
   ```bash
   # senha do banco: Supabase → Project Settings → Database (nunca colar em chat)
   supabase db dump --db-url "postgresql://postgres.hfmzlieixfkisbyweprv:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" -f schema.sql
   supabase db dump --db-url "...mesma URL..." --data-only -f dados.sql
   supabase db dump --db-url "...mesma URL..." --role-only -f roles.sql
   # cifrar antes de guardar (exemplo com 7-Zip, senha forte guardada no gerenciador de senhas):
   7z a -p -mhe=on backup-AAAA-MM-DD.7z schema.sql dados.sql roles.sql && rm schema.sql dados.sql roles.sql
   ```
   Guardar o `.7z` em drive privado da loja. **Nunca** em `public/`, no Git ou em link público. RPO = 7 dias.
   As fotos de perfil (bucket `avatars`) baixam pelo painel do Storage. Hoje são 2 arquivos.

RPO/RTO sugeridos para começar: RPO 24 h (Pro) ou 7 dias (manual); RTO 4 h. **Quem define é o responsável pela loja.**

## Teste de restauração (pendente)

Restaurar uma amostra num projeto Supabase **separado** (gratuito, criado só para isso), nunca em produção. Conferir as contagens de pedidos e clientes e o login de um usuário de teste. Depois, apagar o projeto de teste.

## Achado: dados de outro sistema no mesmo banco

O banco da Street Goose também guarda um sistema de agendamentos chamado **"lana-demo"**. São as tabelas `tenant_state`, `tenant_backups`, `tenant_security`, `admin_users`, `admin_sessions` e `admin_audit_log`. Elas contêm clientes, pagamentos e reservas desse outro sistema, além de hashes de senha e segredos de dois fatores dos administradores dele. Algo externo grava uma cópia diária às 12:53 UTC.

As tabelas estão protegidas (RLS sem acesso pela API), mas misturam dados de dois negócios num mesmo projeto. Isso afeta LGPD, backups e acesso: quem administra um vê o outro. **Recomendação:** mover o "lana-demo" para um projeto Supabase próprio, ou apagá-lo se for só demonstração. É decisão de quem é dono dele (SET77/MASSON). Nada foi alterado.

## Dados de teste

- O alerta de teste por e-mail de 19/10 foi apagado em 20/10.
- Os testes do painel rodaram dentro de transações desfeitas e não deixaram registros.
- As 2 peças ocultas (trajes-13, perfumes-36) são decisão de catálogo, não teste.
