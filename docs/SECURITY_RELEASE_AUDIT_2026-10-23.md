# STREET GOOSE 034 — Auditoria de segurança e lançamento
**SET77 LABS · 23/10/2026 · evidências de GitHub, Vercel e Supabase**

> Esta é uma auditoria pontual, não certificação ou garantia de segurança absoluta. Evitar "100% protegido", principalmente sem pentest, restauração ensaiada e teste físico de checkout.

## Alterações verificadas em produção
- Site Vercel: projeto `street-goose-034-landing`, commit de produção `97d5dfe3a3a420521ccf5251085fd78086ddcf78` em estado READY no começo desta revisão.
- **MFA de servidor aplicado em 23/10**: `public.is_admin()` passou a exigir cadastro em `public.admins` E claim JWT `aal = 'aal2'`, via `public.is_admin_identity()`. Migração aplicada com sucesso (`sg034_admin_mfa_enforcement`).
- Testes SQL transacionais: conta administrativa AAL1 negada, conta administrativa AAL2 autorizada, conta comum AAL2 negada; RPC `admin_overview` negada com AAL1 e aceita com AAL2. Os testes usaram claims simuladas, sem substituir testes de login real.
- Conta administrativa única no momento; 1 TOTP verificado. Cada novo administrador, incluindo o proprietário, deve possuir conta e TOTP próprios.
- **ATENÇÃO**: a frase de painel `777 admin` aparece no JavaScript público; é um filtro visual, não uma senha segura. Não usá-la como autorização nem como senha da conta.
- 38/38 tabelas `public` com RLS; 16 tabelas sem políticas (principalmente internas), o que pode ser intencional quando não há grants. NÃO conceder permissões para "corrigir alertas" sem justificar o caso de uso.
- Vercel: CSP sem scripts inline indiscriminados, HSTS, noindex nas rotas privadas, frame-ancestors none, nosniff, X-Frame-Options, política de permissões. Revisar política de caches/cookies separadamente.

## Backups e recuperação
- Job `cron.jobid=6`, `street-goose-commerce-snapshot-20h-brt`, agendado `0 23 * * *` UTC (= 20h em Brasília), ativo.
- Últimas duas execuções verificadas em 21/10 e 22/10 com status `succeeded`.
- Snapshots `sg_internal.commerce_snapshots` de 21/10 e 22/10: 25 tabelas, checksum SHA-256 conferido; `anon` e `authenticated` não têm SELECT na tabela de backup.
- **Atenção**: `public.tenant_backups` trata de outro tenant (`lana-demo`), portanto não utilizar como evidência de backup da Street Goose.
- Foi executado teste de carga do snapshot mais recente em tabela **temporária**: 25 coleções JSON / 125 linhas recuperadas, sem alterar dados reais; isso NÃO é restauração completa de banco, vínculos FK, Auth ou Storage. Não houve comprovação de restauração relacional integral nem de cópia externa. Também não há garantia de recuperação de senhas/usuários Supabase Auth e arquivos Storage nesses snapshots JSON. Essas etapas são pendências bloqueantes para plano completo de desastre.

## Alertas do Security Advisor
- `extension_in_public`: `pg_net` instalado em `public`; avaliar dependências antes de mover (migração sem teste pode quebrar notificações).
- `anon_security_definer_function_executable`: 7 funções, várias são **públicas por finalidade** (feed, ranking, newsletter); funções privilegiadas exigem revisão das regras de execução, não revogação cega, pois algumas políticas RLS para público consultam `is_admin()`.
- `authenticated_security_definer_function_executable`: 40 funções; os 16 RPCs `admin_*` verificados nesta revisão chamam `public.assert_admin()`, que passa pela checagem AAL2. Executabilidade não equivale a vazamento quando a autorização é validada no próprio SQL.
- `auth_leaked_password_protection`: **não ativado**. Habilitar proteção de senhas vazadas em Supabase Dashboard > Authentication > Security and Protection (verificar disponibilidade no plano).
- Não considerar alertas de índices nunca usados como indicação automática de remoção. `store_activity_audit` sem PK deve ser estudado antes de mudanças de schema.

## 20 requisitos dos prints: situação
| Item | Status | Evidência ou pendência |
|---|---|---|
| HTTPS | Implantado | Domínio ativo no Vercel/Cloudflare; renovar verificações TLS |
| Senhas com hash | Gerenciado | Supabase Auth; não armazenar senhas no código |
| MFA | **Ativado em banco** | AAL2 + identidade; validar também navegador e recuperação |
| Rate limiting | Parcial | Newsletter usa `sg_rate_ok`; conferir Auth, endpoints e limites de tentativas |
| Validação de inputs | Parcial | PostgreSQL/RPCs usam parâmetros e validações; auditar cada endpoint |
| Sanitização/XSS | Parcial | UI faz escaping; exigido teste dinâmico de todos os campos |
| SQL injection | Parcial | RPCs parametrizadas observadas; revisar `EXECUTE` e entradas futuras |
| Migrações | Presente | SQL versionado; testar em staging antes de novas alterações |
| Rollback | Parcial | Vercel disponibiliza histórico; DB rollback e migrações destrutivas precisam plano |
| Controle de acesso/IDOR | **Reforçado** | 38/38 RLS; MFA AAL2 em administrador, testes de cenários |
| Expiração de sessão | Pendente validar | Auth configurado para refresh; rever políticas de sessão/inatividade |
| Secrets | Parcial | Chaves de ambiente segregadas; proibir service_role no frontend |
| CORS | Pendente validar | Configurar apenas origens necessárias; não aplicar `*` indiscriminadamente |
| Logs | Parcial | Cron tem histórico; configurar retenção e logs de aplicação sem PII |
| Backups | Parcial | Snapshots diários válidos; sem restauração ensaiada e cópia externa |
| Criptografia | Gerenciado/parcial | HTTPS, Supabase; revisar proteção e retenção de PII |
| Dependências | Automatizado | npm audit e build/CI devem bloquear CVEs de alta severidade |
| PMP | Não especificado | Termo do print não é requisito técnico definido; precisa escopo |
| Monitoramento | Parcial | GA4/eventos; falta monitoramento estruturado de erros/alertas |
| Plano de recuperação | Pendente | Restauração segregada, RPO/RTO, cópia offsite e exercício |
 
**Checklist adicional 19 itens:** env privada, validação backend/frontend, injeção, auth, IDOR, hashing, brute-force, lock de envio, CSRF, uploads, exposição de dados, dependências, tokens, rate limit, segredos, SSRF, cookies e CORS: exige testes direcionados de API/cliente. Adicionar CDN ou biblioteca não substitui esses controles.

## SEO e ferramentas dos prints
- Existente: Search Console com propriedade conectada; sitemap/robots e SEO estático; GA4 com eventos; padrões de schema; CSS/JS focados em mobile. Consulta ao Search Console: 13 cliques e 27 impressões entre 19 e 21/10. Sitemap enviado 19/10 com 12 URLs submetidas, 0 erros e 0 avisos, último download 21/10. **Submetidas não significa indexadas**. Dados de campo mobile/CrUX ainda exigem verificação atual.
- Ferramentas opcionais conforme necessidade: Keyword Planner, Google Trends, AnswerThePublic, Ubersuggest, Screaming Frog e PageSpeed Insights **não precisam ser instaladas todas**; são recursos de pesquisa/auditoria, não camadas de segurança.
- O fluxo da loja finaliza por WhatsApp; Stripe não é uma dependência necessária até existir requisito de pagamento por cartão. Upstash Redis, Cloudflare R2, Trigger.dev, Sentry, PostHog e Zod só devem ser adicionados com caso de uso, custos, permissões e gestão de dados definidos. Resend, Supabase, Cloudflare e Vercel já constam na infraestrutura.
- Testes amplos de SEO/mobile em GitHub Actions apresentaram falhas em GA4, intro/áudio e WebKit; não alegar zero bugs.

## Gates para fechamento real
1. Teste real de login administrativo com e sem MFA; teste de conta sem privilégios; plano de recuperação do dispositivo autenticador.
2. Teste de ponta a ponta no iPhone/Android físico: cadastro, checkout WhatsApp, promoção de duas lupas, autenticação, sessão, mídia e acessibilidade.
3. Restauração isolada do snapshot e cópia externa segura. Definir RPO/RTO.
4. Corrigir a suíte Playwright mobile/GA4, ativar proteção de senha comprometida no Supabase e revisar Security Advisor.
5. Publicar somente mudanças validadas com rollback; monitorar disponibilidade, Lighthouse de campo e erros de produção.

**Referências:** [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa), [Supabase security advisor](https://supabase.com/docs/guides/database/database-linter), [Vercel deploy](https://vercel.com/docs/deployments).
