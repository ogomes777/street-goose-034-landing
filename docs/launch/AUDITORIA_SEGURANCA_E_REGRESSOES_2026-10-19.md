# Auditoria de segurança, navegação e produção — Street Goose 034

Data da coleta: 2026-10-19. Projeto Supabase de produção: `hfmzlieixfkisbyweprv`.
Esta auditoria **não modifica dados nem autorizações do banco**. Ações que exigem mudança no esquema precisam de teste em projeto isolado, comparação antes/depois, backup e rollback.

## Resultado das verificações diretas

- PostgreSQL: papel `anon` **sem** CREATE no esquema `public`.
- PostgreSQL: papel `authenticated` **sem** CREATE no esquema `public`.
- Função `public.assert_admin()` foi lida: chama `public.is_admin()` e retorna erro `forbidden` quando não autorizado.
- Inspecionadas `admin_adjust_xp`, `admin_delete_order`, `admin_list_customers`, `admin_overview`, `admin_update_order`, `admin_order_counts`, `admin_delete_finance_entry`; todas começam exigindo `public.assert_admin()`. Isso não substitui auditoria integral das demais funções.
- Sete funções SECURITY DEFINER acessíveis a `anon`: `community_comments`, `community_feed`, `community_profile`, `get_ranking`, `get_ranking_page`, `is_admin`, `newsletter_subscribe`. Algumas dão suporte a áreas públicas intencionalmente. Revogação em lote **quebraria funcionalidades**. `newsletter_subscribe` implementa validação de e-mail e rate limiting em banco, mas precisa de revisão de ameaças própria.
- O linter detectou 39 funções SECURITY DEFINER acessíveis a `authenticated`: é um ponto de revisão por função, **não evidência automática de vazamento**.
- O linter também relata 16 tabelas RLS sem policies, 1 extensão `pg_net` no esquema `public` e verificação de senha vazada do Auth desativada.
- Performance Advisor: 14 chaves estrangeiras sem índice, 12 ocorrências de `auth_rls_initplan`, 24 ocorrências de políticas permissivas múltiplas, 1 tabela sem primary key e 4 índices reportados como não utilizados.

## Decisões de segurança tomadas

- **Não executar REVOKE em massa nas funções** sem testes regressivos de API/CRM.
- **Não alterar extensão pg_net** numa loja em produção sem mapear dependências.
- **Não criar políticas liberais para tabelas RLS sem policies** apenas para zerar avisos, pois elas podem estar intencionalmente bloqueadas.
- **Não redefinir senhas/credenciais** nem reconfigurar autenticação durante a auditoria.
- **Não remover índices** somente porque constam como não utilizados em um projeto recém-lançado.

## Pendente de investigação com autorização de mudança

1. Verificar no painel Supabase Auth se a proteção contra senhas vazadas pode ser habilitada no plano atual e avaliar impacto no cadastro/login; conferir configuração antes de mudar.
2. Revisar `SECURITY DEFINER` com foco em search_path, SQL dinâmico, validação de permissões internas e funções críticas (pedido, financeiro, autenticação).
3. Auditar políticas RLS de `profiles`, `orders`, `product_prices`, `community_posts` e tabelas administrativas antes de aplicar qualquer migration.
4. Priorizar índices mediante consultas reais com `EXPLAIN` e tráfego suficiente; não aplicar criação de índices especulativa na produção.
5. Validar execução agendada dos backups do Windows e restauração isolada antes de declarar a recuperação pronta.
6. Testar cadastro, sacola e checkout em iPhone e Android reais, com dados de teste e limpeza posterior.

## Qualidade de navegação automatizada

Novos testes em `tests/launch/security-mobile.spec.ts` verificam:
- consentimento recusado impede a inclusão da tag GA4;
- rotas privadas expõem `noindex`;
- links entre categorias continuam funcionais após a hidratação em viewport mobile;
- modo de economia de dados mantém poster sem instanciar vídeo do hero da categoria.

Eles rodam em GitHub Actions com Chromium. Não equivalem a testar celulares reais, pagamentos, consentimento na plataforma Google ou desempenho Core Web Vitals de campo.

## Referências da plataforma

- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Restrições externas ainda necessárias

Dados do proprietário (CNPJ, razão social, e-mail, endereço elegível, nomes e características reais de produtos); ajustes administrativos no GA4 e Cloudflare; confirmação de backup off-site/restauração; fotos e aprovação do ícone/favicon e áudio; métricas de performance aferidas em aparelhos reais; publicação de divulgação no Instagram/WhatsApp.
