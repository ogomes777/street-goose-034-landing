# Street Goose 034 — SEO comercial (20/10/2026)

## Diagnóstico
- SEO técnico existente: 12 URLs públicas com título e descrição individuais, sitemap, canonical, robots, dados estruturados e páginas de categoria pré-renderizadas em HTML.
- Search Console integrado via Windsor.ai: busca por consultas entre 13 e 20/10 retornou 0 linhas; agregado de 18/10 retornou 0 impressões e 0 cliques. **Ainda não existe uma base de consultas para inferir demanda nem posição.**
- Pesquisa SERP indicativa: termos amplos como "moletons streetwear" enfrentam marketplaces e redes grandes; termos como "lupas"/"Juliet" atraem lojas especializadas. Isto é uma observação qualitativa de concorrência, **não medição de volume, KD, conversão ou ranking local.**
- Fontes qualitativas: https://streetlupas.com.br/collections/juliet ; https://www.distritostreetwear.com.br/moletons ; https://lista.mercadolivre.com.br/moletons-masculino-streetwear ; https://developers.google.com/search/docs/appearance/title-link?hl=pt-br ; https://developers.google.com/search/docs/appearance/snippet ; https://developers.google.com/search/docs/crawling-indexing/links-crawlable

## Mapa principal de intenção e termos relacionados
| Página | Termo primário-alvo | Termos semânticos/long-tail a testar | Intenção |
|---|---|---|---|
| / | Street Goose 034 | loja Street Goose 034; streetwear Araxá; lupas Street Goose | navegação de marca / catálogo |
| /categoria/lupas | lupas e óculos de estilo urbano | lupas óculos; óculos streetwear; óculos estilo urbano | navegar/comprar |
| /categoria/acessorios | acessórios streetwear | mochilas streetwear; coletes; chapéus; acessórios urbanos | navegar/comprar |
| /categoria/relogios | relógios de estilo urbano | relógios para look streetwear; relógios estilo urbano | navegar/comprar |
| /categoria/perfumes | perfumes e fragrâncias | catálogo de perfumes; perfumes consulta preço; fragrâncias | navegar/consultar |
| /categoria/trajes | moletons streetwear | blusas de frio streetwear; roupas streetwear; moletons e trajes | navegar/comprar |

**Não usar termos referentes a marcas, originalidade, proteção UV, gêneros, linhas, tamanhos, aromas, frete ou estoque enquanto o proprietário não validar o catálogo.** Não criar páginas artificiais de marca/produto e não inventar notas/avaliações/preços em dados estruturados.

## Implementado nesta etapa
1. Títulos SEO e meta descrições comerciais específicos por URL, com H1 correspondente na categoria, sem alterar slug/canonical.
2. Texto editorial **visível e exclusivo** abaixo da grade de cada categoria, gerado pelo mesmo conjunto de textos no HTML SSR e na navegação por JavaScript.
3. Links internos com texto descritivo em cada categoria e no bloco explicativo da home. Mantidos rodapé e links originais.
4. Estilos leves e responsivos para títulos mais longos. Conteúdo abaixo da primeira dobra não compete com o carregamento do hero/LCP.
5. Testes Playwright de 5 categorias, H1 único, textos indexáveis, metadados, links e hidratação SPA.
6. Mantidos 12 URLs indexáveis e o sitemap existente. **Nenhuma meta keywords**: este campo não é sinal de ranking do Google.

## Futuro
- Após nomes e modelos aprovados pelo Kibão, tornar as descrições dos produtos específicas, gerar páginas próprias apenas se houver conteúdo realmente exclusivo e valor editorial, e avaliar Product structured data **somente com dados comerciais verificados**.
- Acompanhar Search Console: impressões, cliques, CTR, posições por URL/consulta, janela de 28–90 dias; ajustar metas se as consultas reais divergirem.
- Para SEO local, só avaliar perfil da empresa e endereço depois de confirmar elegibilidade, dados reais e operação presencial/área de atendimento. Não reivindicar estabelecimento físico sem essa validação.
- Divulgação externa legítima: perfis sociais e parcerias locais com links reais, sem backlinks comprados, tráfego sintético ou promessas de primeira posição.

SEO não chega a "100%" mensurável. Implementação e indexação dependem dos buscadores, concorrentes, catálogo aprovado, tráfego orgânico e tempo.
