# Mapa de SEO — Street Goose 034

Fonte única dos títulos e descrições: `js/route-meta.js`. O build (`scripts/vite-seo-pages.ts`) grava esses valores no HTML de cada URL, e o `js/router.js` atualiza a aba quando o visitante navega dentro do site.
Domínio canônico: `https://www.streetgoose034.com.br` (sem barra final, exceto a home).

## Páginas indexáveis (no sitemap)

| URL | Intenção | Title | H1 | Conteúdo no HTML (sem JS) | Schema |
|---|---|---|---|---|---|
| `/` | marca / navegação | Street Goose 034 \| Lupas, relógios, perfumes e streetwear | Seu visual chega antes. | landing completa, links das 5 categorias, políticas no rodapé | Organization, WebSite |
| `/categoria/lupas` | categoria (comercial) | Lupas \| Street Goose 034 | Lupas | topo da categoria, descrição, 51 peças com foto e nome, links das outras categorias | BreadcrumbList |
| `/categoria/acessorios` | categoria | Acessórios \| Street Goose 034 | Acessórios | idem (5 peças) | BreadcrumbList |
| `/categoria/relogios` | categoria | Relógios \| Street Goose 034 | Relógios | idem (5 peças) | BreadcrumbList |
| `/categoria/perfumes` | categoria | Perfumes \| Street Goose 034 | Perfumes | idem (39 peças) | BreadcrumbList |
| `/categoria/trajes` | categoria | Trajes e moletons \| Street Goose 034 | Trajes | idem (16 peças) | BreadcrumbList |
| `/recompensas` | programa de membros | Recompensas e níveis \| Street Goose 034 | (montado por JS) | metadados próprios | BreadcrumbList |
| `/ranking` | comunidade | Ranking \| Street Goose 034 | (montado por JS) | metadados próprios | BreadcrumbList |
| `/comunidade` | comunidade | Comunidade \| Street Goose 034 | (montado por JS) | metadados próprios | BreadcrumbList |
| `/termos` | política | Termos de uso \| Street Goose 034 | (montado por JS) | metadados próprios | BreadcrumbList |
| `/privacidade` | política | Política de privacidade \| Street Goose 034 | (montado por JS) | metadados próprios | BreadcrumbList |
| `/trocas` | política | Trocas e devoluções \| Street Goose 034 | (montado por JS) | metadados próprios | BreadcrumbList |

As descrições completas estão em `js/route-meta.js`. Todas são diferentes entre si e só afirmam o que o site faz hoje (fechamento pelo WhatsApp, preço de perfume consultado, XP por pedido pago e foto aprovada). Não citam cidade, frete, retirada nem prazo: nada disso foi confirmado pela loja.

As contagens de peças acima são as de 19/10/2026. O build lê o catálogo publicado (peças ocultas no painel ficam de fora) a cada deploy.

## Páginas não indexáveis

`/busca`, `/favoritos`, `/sacola`, `/checkout`, `/conta`, `/conta/pedidos`, `/pedido/:id` e `/admin` abrem normalmente, mas levam:

- `<meta name="robots" content="noindex">` no HTML próprio, sem canonical;
- cabeçalho `X-Robots-Tag: noindex` (vercel.json).

Não ficam bloqueadas no `robots.txt`: o robô precisa conseguir ler o noindex.

## Regras técnicas

- `/sitemap.xml`: as 12 URLs acima, absolutas, sem `lastmod` (o build não sabe quando o conteúdo de cada página mudou de verdade; omitir é melhor que mentir).
- `/robots.txt`: `Allow: /` e o endereço do sitemap. O Cloudflare acrescenta por cima os "content signals" dele; essa decisão sobre robôs de IA é separada (ver PENDENCIAS_EXTERNAS.md).
- `/llms.txt`: resumo factual com links reais de catálogo, membros e políticas.
- Barra final (`/termos/`) redireciona para a versão sem barra; categoria inexistente responde 404 de verdade.
- Open Graph em todas as páginas: título, descrição e URL da página, imagem absoluta. As categorias usam o pôster da própria categoria.
- Imagens de produto com alt descritivo ("Lupas Street Goose 034 — peça 01"); imagens decorativas com `alt=""`.

## Interligação

- Home → 5 categorias (cards com link real) e políticas (rodapé).
- Cada categoria → as outras 4 (links no fim da lista) e a home (botão de fechar é um link para `/`).
- Não foram criadas páginas novas para volume: não há conteúdo editorial real (guias de tamanho, cuidados) para sustentá-las ainda.

## Melhorias que dependem de conteúdo real

- Nomes de produto: hoje as peças se chamam "Lupa — Peça 01". Com o modelo, a cor da lente e a armação reais (cadastrados no painel), os títulos de busca ficariam muito melhores. Não inventar.
- Páginas de produto próprias (com Product/Offer) só fazem sentido quando houver nome, preço e disponibilidade reais por peça.
- SEO local ("streetwear em Araxá") só depois de confirmar endereço ou área de atendimento.
