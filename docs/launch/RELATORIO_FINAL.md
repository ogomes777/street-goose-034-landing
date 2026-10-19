# Relatório final — lançamento técnico Street Goose 034

19/10/2026 · PRs [#31](https://github.com/ogomes777/street-goose-034-landing/pull/31) e [#32](https://github.com/ogomes777/street-goose-034-landing/pull/32) · produção: https://www.streetgoose034.com.br (commit `5ff1034`)

## Implementado e publicado (verificado em produção)

**Descoberta**
- Cada página pública tem HTML próprio, com título, descrição, canonical, Open Graph e dados estruturados (Organization e WebSite na home, BreadcrumbList nas demais).
- As 5 categorias trazem no HTML o título (H1), a descrição e a lista de peças com foto e nome, sem depender de JavaScript. As peças ocultas no painel ficam de fora.
- `sitemap.xml` (12 URLs), `robots.txt` com o sitemap, `llms.txt`, `favicon.ico` e ícone de atalho no iPhone.
- `noindex` em sacola, checkout, conta, pedido, busca, favoritos e painel.
- 404 de verdade para categoria inexistente; barra final redireciona.
- Um H1 por página; rodapé com links para as 5 categorias.

**Medição**
- Camada de eventos pronta (`dataLayer`): adicionar à sacola, favoritos, abrir peça, início do checkout, pedido registrado, clique no WhatsApp, popup, newsletter, login e cadastro.
- Nenhum fornecedor ligado, nenhum dado pessoal e nenhuma "venda" disparada por clique.

**Velocidade (sem mudar o visual)**
- Intro: um arquivo de vídeo por aparelho, e nenhum nas páginas abertas por link direto.
- Filmes da home e prévias das categorias carregam só quando o visitante está na landing e perto deles.
- Páginas abertas por link direto ficaram 60–70% mais leves: `/termos` no celular baixava 8,8 MB de mídia e agora baixa 1 MB.

Detalhes: AUDITORIA.md, MAPA_SEO.md, PLANO_EVENTOS.md, RESULTADOS_QA.md, CHECKLIST_EXECUCAO.md.

## Arquivos alterados e por quê

| Arquivo | Motivo |
|---|---|
| `js/route-meta.js` (novo) | títulos, descrições e indexação de cada rota: fonte única |
| `scripts/vite-seo-pages.ts` (novo), `vite.config.ts`, `tsconfig.json` | gerar o HTML de cada rota e o sitemap no build |
| `js/catalog-data.js` (novo), `js/catalog.js` | dados do catálogo compartilhados entre site e build (sem mudar ids) |
| `js/router.js` | título/canonical na navegação; assumir a categoria que já veio no HTML |
| `js/category-page.js`, `styles.css` | título da categoria como H1 e lista como H2; estilo da versão estática |
| `index.html` | head completo (canonical, OG, JSON-LD), H1 do primeiro slide no HTML, intro sob demanda, link do WhatsApp rastreável, categorias no rodapé |
| `js/hero.js`, `js/scroll-film.js`, `js/category-portals.js` | vídeos carregam só quando a landing está visível e perto deles |
| `js/analytics.js` (novo), `js/boot-shop.js`, `js/checkout-page.js`, `js/main.js`, `public/entry-popup.js`, `src/services/AuthService.ts` | camada de eventos |
| `src/components/interactive-character/*` | segundo H1 da home virou H2 (mesmo visual) |
| `vercel.json` | rotas → HTML próprio, barra final, `X-Robots-Tag`, novo hash de CSP da intro |
| `public/robots.txt`, `public/llms.txt`, `public/favicon.ico`, `public/icons/apple-touch-icon.png` | arquivos públicos de descoberta |
| `docs/launch/*` | pacote de instruções e entregáveis |

## Não publicado / pendente

Nada de código ficou sem publicar. Depende de terceiros (ver PENDENCIAS_EXTERNAS.md):

1. **Search Console:** verificar o domínio, enviar o sitemap e pedir indexação. Depois, Bing.
2. **GA4/GTM:** ID real e aviso de consentimento (LGPD); a infraestrutura de eventos está pronta.
3. **Cloudflare:** redirecionamento do domínio sem www em um salto só; decisão sobre robôs de IA.
4. **Dados da loja:** Instagram, CNPJ, razão social e e-mail. Endereço só se houver loja física (aí entram Perfil da Empresa e SEO local).
5. **Conteúdo:** nomes reais das peças no painel. É o que mais melhora a busca por produto.
6. **Design e áudio:** versão símbolo do ícone; trilha da intro mais leve (11 MB).
7. **Testes em iPhone e Android reais** e **Core Web Vitals de campo** depois de algumas semanas de tráfego.

## Limites desta entrega

- Indexação, posição no Google e recomendação por IA não são garantidas; dependem dos buscadores, do conteúdo e da divulgação.
- Lighthouse é laboratório. A nota da home no desktop variou de 90 para 85 (LCP ainda "bom"); no celular, o LCP de laboratório segue em ~4,3 s e só cai com uma reestruturação maior do carregamento da landing.
- Vendas dependem de oferta, atendimento, estoque e divulgação; o site agora está pronto para ser encontrado e medido.
