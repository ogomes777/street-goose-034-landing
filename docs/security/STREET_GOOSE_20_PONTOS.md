# Street Goose 034 — Segurança e conformidade pré-lançamento

Auditoria inicial de 21/10/2026. Responsável técnico: SET77 LABS.

## O que a automação faz
- GitHub Actions executa uma auditoria de dependências de produção (níveis high e critical) e bloqueia falhas críticas das dependências de build.
- Gitleaks verifica segredos no repositório, inclusive histórico Git, com permissões de leitura.
- Dependabot propõe atualizações semanais de pacotes NPM e ações GitHub.
- Vercel aplica HSTS de duração moderada, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy e Permissions-Policy.
- Frontend usa chave pública do Supabase e sessão via Supabase Auth; serviço privilegiado não deve ser exportado para VITE_*.
- Dados sensíveis dependem de autorização no Supabase, RLS e RPC. Produtos e conteúdos públicos são exceções intencionais.

## Checklist: resultado verificável, sem prometer invulnerabilidade
1. API Keys: chave pública no browser; verificar existência de segredos em código compilado e Git.
2. Secrets Git: scanner automático adicionado; qualquer alerta exige revogação/rotação antes de divulgar detalhes.
3. Public Key DB: SDK usa VITE_SUPABASE_ANON_KEY, que não é credencial privilegiada.
4. RLS: todas as 38 tabelas do esquema public encontradas com RLS ligado em 21/10.
5. Criptografia: TLS/criptografia gerenciada da plataforma; auditar retenção e dados sensíveis em separado.
6. Auth server-side: operações protegidas por Supabase Auth/RPC; realizar teste de contas com papéis distintos.
7. Acessos: RLS e função de administrador; revisar todas as funções SECURITY DEFINER sem impedir comunidade/ranking.
8. Mass assignment: RPC de checkout usa listas controladas; validar que payload não altera campos internos.
9. Cookies/sessão: verificar persistência segura e políticas de cookies; SDK Supabase guarda sessão no navegador.
10. Senhas: Supabase Auth; checagem de vazamento do navegador não substitui proteção no servidor.
11. Rate limit: newsletter e pedidos têm controle no banco; auditar todas as rotas de auth.
12. Bots: Turnstile deve ser validado em aparelhos reais e no painel Supabase.
13. SQL: parâmetros via SDK e funções Postgres; revisar SQL dinâmico residual.
14. Inputs: sanitização e limites no checkout e cadastro; realizar fuzz/validação negativa.
15. Vazamento: testar acesso anônimo e usuários cruzados em APIs, Storage e logs.
16. Uploads: Storage restringe MIME, tamanho e políticas; confirmar verificação de conteúdo e extensão.
17. Respostas: revisar payloads de APIs e evitar PII ou erro interno em respostas públicas.
18. Headers: CSP e demais cabeçalhos Vercel; HSTS sem includeSubDomains.
19. HTTPS: domínio oficial deve redirecionar HTTP->HTTPS; validar Cloudflare e resposta real.
20. Dependências: npm audit, gitleaks e Dependabot adicionados.

## Pendências de infraestrutura externas ao código
- Ativar a checagem de senhas vazadas no servidor Supabase Auth se o plano permitir.
- Verificar chaves vazadas apontadas por Gitleaks e rotacionar pelo provedor (nunca publicar os segredos no issue).
- Confirmar regras e logs de WAF/rate limiting do Cloudflare e validar em produção sem bloquear usuários reais.
- Rever o aviso `pg_net extension_in_public` com análise de dependências antes de mover a extensão.
- Confirmar o backup externo de auth/storage e recuperação completa; snapshot comercial privado não substitui dump completo.
- Teste de exploração autorizado, completo e controlado, ainda não realizado. Nenhum sistema pode ser certificado como 100% seguro.

## Supabase advisors (21/10/2026)
- 16 tabelas RLS sem políticas. Esperado para tabelas exclusivamente administrativas em alguns casos, mas revisar cada caso.
- 7 funções SECURITY DEFINER chamadas por anon (comunidade, ranking, newsletter e is_admin). Exposição pode ser intencional; revisar dados retornados e autorização.
- 39 funções SECURITY DEFINER chamadas por authenticated. As rotinas administrativas analisadas contêm assert_admin, mas precisam de testes funcionais e checagem completa.
- Proteção de senha vazada no Supabase Auth não habilitada.
