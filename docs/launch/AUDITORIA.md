# Auditoria — Street Goose 034

Data: 19/10/2026. Base auditada: `main` em `2ad1c74` (produção em https://www.streetgoose034.com.br).

## 1. Arquitetura confirmada no código

O pacote de instruções supunha Next.js/App Router. **Não é.** O que existe de fato:

| Camada | O que é | Evidência |
|---|---|---|
| Front-end | Vite 8 (rolldown) + JavaScript modular; React 18 só no componente do personagem interativo | `package.json`, `vite.config.ts`, `src/main.tsx` |
| Página | SPA de um documento: `index.html` é a landing; as rotas abrem como overlays por cima dela | `js/router.js` |
| Motion/3D | GSAP 3.12 + ScrollTrigger, Three.js r128, WebGL próprio (cristais, ranking) | `js/*.js` |
| Hospedagem | Vercel (saída estática `dist/` + uma função `api/crm-assistant.mjs` que hoje só responde 410) | `vercel.json` |
| DNS/CDN | Cloudflare (proxy, robots.txt gerenciado, Web Analytics automático) | cabeçalho `server: cloudflare`, robots.txt de produção |
| Backend | Supabase: login (com captcha), banco com RLS, 5 rotinas agendadas, 2 edge functions | auditoria anterior de 19/10 |
| E-mail | Resend via SMTP do Supabase (domínio verificado, DMARC) | auditoria anterior |
| CRM | `/admin` dentro do próprio site; toda função administrativa confere `is_admin()` no servidor | testado em transação desfeita, 19/10 |
| Planilha | edge function `customer-sheet-export` (exportação para Google Sheets) | `list_edge_functions` |

Comandos reais: `npm run dev`, `npm run build` (`tsc --noEmit` + `vite build`), `npm test` (vitest), `npm run test:e2e` (Playwright).
Gerenciador: npm. Branch de trabalho: `claude/gifted-planck-7zfuhj`; publicação por PR → squash → deploy automático da Vercel.

## 2. Inventário de rotas

| URL | Tipo | Conteúdo no HTML antes | Observação |
|---|---|---|---|
| `/` | pública | sim (landing completa) | sem H1 no HTML; título genérico |
| `/categoria/{lupas,acessorios,relogios,perfumes,trajes}` | pública, comercial | **não** (só JS) | mesmo título/descrição da home |
| `/termos`, `/privacidade`, `/trocas` | pública | não (só JS) | mesmo título da home |
| `/recompensas`, `/ranking`, `/comunidade` | pública | não (só JS) | mesmo título da home |
| `/busca`, `/favoritos`, `/sacola`, `/checkout` | utilitária | — | deveriam ser noindex |
| `/conta`, `/conta/pedidos`, `/pedido/:id` | privada (login) | — | dados protegidos por RLS no servidor |
| `/admin` | privada (equipe) | — | protegida por `is_admin()` no servidor |
| `/api/crm-assistant` | API | — | responde 410 (IA paga desativada) |

Não há páginas individuais de produto: cada peça abre numa visualização rápida (modal) dentro da categoria.

## 3. Caminho real de venda

1. Visitante vê o catálogo (categorias).
2. Para pôr na sacola ou favoritar é preciso **entrar na conta** (login por e-mail/senha, código ou Google).
3. Checkout em 4 etapas (identificação, endereço, pagamento, revisão). O único meio ativo é **WhatsApp**; Pix e cartão aparecem desativados.
4. Ao enviar, o pedido é **registrado** no banco (`create_whatsapp_order`, preço calculado no servidor) e o WhatsApp abre com a mensagem pronta.
5. A equipe confirma disponibilidade e pagamento pelo WhatsApp e marca o pedido como pago no painel (só então entra no financeiro e gera XP).
6. Perfumes não têm preço fixo: o card leva direto ao WhatsApp.

Consequência para medição: **pedido registrado não é venda**. Venda só existe quando a equipe marca "pago" no painel.

## 4. Achados

Prioridade: **P0** funcional, **P1** descoberta/medição, **P2** melhoria.

| # | Pri. | Achado | Evidência | Situação |
|---|---|---|---|---|
| 1 | P0 | Nenhum defeito funcional aberto. A varredura completa de 19/10 (PR #30) corrigiu popup sobre o checkout, 404 em inglês, fotos pesadas e erros de console | 17 rotas × 2 dispositivos sem erro em produção | resolvido antes |
| 2 | P1 | `/sitemap.xml` inexistente (404) | `curl` em produção | corrigido |
| 3 | P1 | `robots.txt` era só o texto gerenciado do Cloudflare: nenhuma regra, nenhum `Sitemap:` | `curl /robots.txt` | corrigido (arquivo próprio; o Cloudflare continua acrescentando os sinais dele) |
| 4 | P1 | Todas as URLs com o mesmo `<title>` e descrição; sem canonical | HTML de produção | corrigido |
| 5 | P1 | Categorias, políticas e programa de membros só existiam via JavaScript; robôs sem JS viam a home | HTML de `/categoria/lupas` = HTML da home | corrigido: cada rota tem HTML próprio; categorias com H1 e lista de peças |
| 6 | P1 | Home sem H1 no HTML (o título do hero era montado por JS) | `grep <h1 index.html` = 0 | corrigido |
| 7 | P1 | `og:image` relativo (prévias de redes sociais exigem URL absoluta); sem `og:url`, `og:locale`, cartão do Twitter | HTML de produção | corrigido |
| 8 | P1 | Nenhum dado estruturado | HTML | corrigido: Organization + WebSite na home, BreadcrumbList nas demais públicas |
| 9 | P1 | `favicon.ico` 404 | `curl /favicon.ico` | corrigido (mesma arte oficial) |
| 10 | P1 | `/categoria/lupas/` (barra final) dava 404; `/categoria/qualquer-coisa` devolvia a home com 200 (soft 404) | `curl` | corrigido: barra final redireciona; slug inexistente dá 404 real |
| 11 | P1 | Link "Consultar no WhatsApp" da visualização rápida sem `href` (não rastreável) | Lighthouse `crawlable-anchors` | corrigido |
| 12 | P1 | Nenhuma camada de eventos; só pageviews automáticos do Cloudflare | código | corrigido: `js/analytics.js` (ver PLANO_EVENTOS.md) |
| 13 | P1 | Páginas pessoais (sacola, conta, admin...) indexáveis | sem noindex | corrigido: meta robots + cabeçalho `X-Robots-Tag: noindex` |
| 14 | P2 | Celular baixava as duas versões do vídeo da intro (540p + 720p, ~8 MB) | medição por CDP | corrigido |
| 15 | P2 | Link direto para qualquer página baixava a intro e os filmes da home escondidos atrás dela: 8,8 MB em `/termos` no celular, 13,9 MB em `/categoria/trajes` no desktop | medição por CDP | corrigido: 1 MB e 4 MB |
| 16 | P2 | Os 5 vídeos de prévia das categorias (~4,8 MB) baixavam no carregamento, antes de aparecer | medição | corrigido: carregam ~600 px antes de entrar na tela |
| 17 | P2 | Desempenho de laboratório da home no celular: 57, LCP 4,2 s, TBT 775 ms | Lighthouse, mediana de 3 | parcialmente tratado (ver RESULTADOS_QA.md) |
| 18 | P2 | Trilha da intro (`street-goose-theme.mp3`) tem 11 MB a 320 kbps e é pré-carregada durante a intro para sincronizar com o vídeo | `ffprobe` | **não alterado** (decisão de produto: reencodar a 128–160 kbps cortaria ~60%) |
| 19 | P2 | `http://streetgoose034.com.br` faz 2 saltos até o domínio canônico | `curl` | pendência externa (regra no Cloudflare) |
| 20 | P2 | Favicon é o logo horizontal: ilegível em 16 px | inspeção | pendência de design (versão símbolo) |
| 21 | P2 | Link do Instagram no rodapé vai para instagram.com (sem @ configurado) | `js/config.js` | pendência externa |
| 22 | P2 | Home tinha um segundo H1 ("Visão em movimento", componente React) | DOM renderizado | corrigido (virou H2; mesmo visual) |
| 23 | P2 | Descrição antiga falava só de "óculos e lupas"; o catálogo tem 5 categorias | meta description | corrigido |

## 5. Segurança e dados

- `robots.txt` e `llms.txt` não protegem nada; a proteção é server-side: RLS nas tabelas com dados pessoais e `is_admin()` em todas as 17 funções administrativas (testado: visitante sem login e cliente comum recebem `forbidden`).
- Nenhuma chave secreta no repositório. O build usa só a URL e a chave **pública** do Supabase (as mesmas que o navegador já recebe) para ler o catálogo publicado.
- O service worker não guarda páginas em cache: conta e checkout sempre vão à rede.
