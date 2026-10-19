# Checklist de execução — 19/10/2026

Estados: não iniciado · em andamento · implementado não verificado · verificado · bloqueado.
"Verificado" significa conferido em produção (https://www.streetgoose034.com.br), salvo indicação.

## Método (prompt mestre)

| Requisito | Estado | Evidência |
|---|---|---|
| Confirmar framework, comandos, branch, git, ambientes | verificado | AUDITORIA.md §1 (Vite, não Next.js) |
| Inventário de páginas, APIs, catálogo, formulários e caminho de venda | verificado | AUDITORIA.md §2–3 |
| Baseline (commit, build, métricas com dispositivo/rede) | verificado | RESULTADOS_QA.md §1, commit `2ad1c74` |
| Rollback preparado antes de editar | verificado | RUNBOOK_ROLLBACK.md; deploy anterior marcado como candidato a rollback na Vercel |
| AUDITORIA.md | verificado | docs/launch/AUDITORIA.md |
| Implementação em blocos pequenos | verificado | PRs #31 e #32 |
| Validação (types, testes, build, integrado) | verificado | RESULTADOS_QA.md §3 |
| Release revisável e publicação autorizada | verificado | PR #31 e #32 → squash → Vercel produção |
| Submissões externas só depois do deploy | não iniciado | PENDENCIAS_EXTERNAS.md (dependem de acesso do cliente) |

## Especificação técnica

| Item | Estado | Evidência |
|---|---|---|
| 1. Domínio canônico HTTPS com www | verificado | canonical em todas as públicas; apex redireciona para www |
| 1. Redirect sem cadeia | bloqueado | `http://` apex faz 2 saltos; regra no Cloudflare (pendência 6) |
| 1. sitemap.xml real, absoluto, só públicas, sem lastmod falso | verificado | `/sitemap.xml` com 12 URLs, todas 200 |
| 1. robots.txt liberando e declarando sitemap | verificado | `/robots.txt` |
| 1. noindex nas utilitárias sem bloquear no robots | verificado | meta + `X-Robots-Tag` em /conta, /pedido/x |
| 1. Privados com auth server-side | verificado | RLS + `is_admin()`, testado em 19/10 |
| 1. Previews protegidos/noindex | verificado | preview exige login Vercel e responde `x-robots-tag: noindex` |
| 1. 404 verdadeiro, redirects | verificado | `/categoria/xyz` → 404; `/termos/` → 308 `/termos` |
| 2. Title e description únicos e verdadeiros | verificado | MAPA_SEO.md; HTML de produção |
| 2. H1 claro, conteúdo sem depender de JS | verificado | um H1 por página no HTML; categorias com lista de peças no HTML |
| 2. Links reais com texto descritivo; alt | verificado | rodapé com categorias; Lighthouse SEO 100 |
| 2. Open Graph absoluto | verificado | `og:image` absoluto, `og:url` por página |
| 3. Organization + WebSite | verificado | JSON-LD da home |
| 3. LocalBusiness/ClothingStore | bloqueado | sem endereço confirmado (pendências 9 e 10) |
| 3. BreadcrumbList | verificado | demais páginas públicas |
| 3. Product/Offer | não iniciado (de propósito) | não há página de produto nem nome real de peça |
| 4. llms.txt factual | verificado | `/llms.txt` |
| 5. favicon.ico, apple-touch-icon, sem 404 | verificado | ambos 200; ícone com a arte oficial |
| 5. Ícone legível em 16 px | bloqueado | precisa da versão símbolo (pendência 11) |
| 6. Medir antes/depois, 3 execuções, mediana | verificado | RESULTADOS_QA.md §2 |
| 6. Mídia sob demanda, sem baixar desktop no celular | verificado | intro 1 arquivo por aparelho; filmes e prévias sob demanda |
| 6. Pausar fora da viewport, reduced motion | verificado (já existia) | QualityGovernor, sg:overlay, prefers-reduced-motion |
| 6. Sem cache público de páginas autenticadas | verificado | service worker sem cache; `cache-control: max-age=0` |
| 6. Testes 320–430 px e desktop | verificado em laboratório | iPhone 13 (390), Pixel 7, 1440; 320 coberto pelos testes do repo |
| 6. Safari iOS e Android reais | não iniciado | pendência 14 (Ramon) |
| 6. Core Web Vitals de campo | bloqueado | precisa de tráfego real (pendência 15) |
| 6. Popup: botão, ESC, foco, frequência | verificado | QA de 19/10 + não abre sobre páginas |
| 7. Interligação, sem órfãs | verificado | home → categorias → outras categorias; rodapé |
| Eventos sem duplicação e sem venda por clique | verificado | PLANO_EVENTOS.md; dataLayer conferido |
| Analytics com ID real | bloqueado | sem ID e sem aviso de consentimento (pendência 5) |
