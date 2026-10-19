# Resultados de QA — 19/10/2026

Ambiente de teste: container Linux, Chromium headless (Playwright e Lighthouse 12.8.2), rede real até https://www.streetgoose034.com.br.
"Antes" = produção em `2ad1c74`. "Depois" = produção em `5ff1034` (PRs #31 e #32).

## 1. Laboratório: Lighthouse (mediana de 3 execuções)

Celular = emulação padrão do Lighthouse (Moto G Power, 4G lento simulado). Desktop = preset desktop.

| Página | Perf. antes → depois | SEO | Acessib. | Boas práticas | LCP | TBT | Peso total |
|---|---|---|---|---|---|---|---|
| Home, celular | 57 → 61 | 92 → **100** | 100 → 100 | 100 → 100 | 4,24 → 4,40 s | 775 → **471 ms** | 17,0 → 14,7 MB |
| Home, desktop | 90 → 85 | 92 → **100** | 100 → 100 | 100 → 100 | 1,40 → 1,80 s | 19 → 58 ms | 17,1 → 18,0 MB |
| /categoria/lupas, celular | 64 → 65 | 92 → **100** | 100 → 100 | 100 → 100 | 4,34 → 4,79 s | 479 → 472 ms | 13,7 → **5,6 MB** |
| /termos, celular | 64 → 69 | 92 → **100** | 100 → 100 | 100 → 100 | 4,35 → 4,26 s | 413 → 396 ms | 9,7 → **4,0 MB** |

Leitura honesta:
- **SEO 100 em todas.** A falha de antes (link sem `href`) foi corrigida.
- **Peso das páginas abertas por link direto caiu 60–70%.** Antes elas baixavam a intro e os filmes da home escondidos atrás.
- **Celular:** o bloqueio do processador na home caiu 40%. O LCP não mudou de forma significativa.
- **Desktop (home):** nota 90 → 85 e LCP 1,4 → 1,5–1,8 s, ainda na faixa "boa" (≤ 2,5 s). O pôster que define o LCP é pedido no mesmo instante de antes (logo após o HTML, conferido na lista de rede). A variação está no tempo de renderização simulado, que já oscilava entre 87 e 90 nas 3 medições de antes. O peso total varia com o quanto da intro baixa durante a medição.
- **O LCP no celular continua alto (~4,3 s em laboratório)**: o maior elemento é o pôster do filme da home, e o tempo é dominado pela espera do HTML e do JavaScript na rede lenta simulada. Reduzir isso exige mexer na estrutura de carregamento da landing (dividir o JavaScript inicial), o que não coube nesta entrega sem risco ao que está aprovado.
- Laboratório não representa todos os usuários. **Core Web Vitals de campo: pendente**, sem dados de tráfego real ainda (pendência 15).

## 2. Mídia baixada nos primeiros 6 s (CDP, sem interação)

| Página | Celular antes → depois | Desktop antes → depois |
|---|---|---|
| `/termos` | 8,8 → **1,0 MB** | 12,5 → **0,4 MB** |
| `/categoria/trajes` | 9,4 → **3,5 MB** (o vídeo da própria categoria) | 13,9 → **4,0 MB** |
| `/` (home) | intro baixava 540p **e** 720p | intro baixa 1 arquivo por aparelho |

Prévias das categorias na home: antes ~4,8 MB no carregamento; agora cada uma baixa ~600 px antes de aparecer (conferido rolando a página).

## 3. Comandos e resultados

| Verificação | Comando / método | Resultado |
|---|---|---|
| Tipos | `npx tsc --noEmit` | ok |
| Unitários | `npx vitest run` | 117/117 |
| Build de produção | `npm run build` (inclui verificação dos hashes de CSP) | ok; 20 HTMLs, sitemap com 12 URLs |
| Rotas em produção | Playwright, 19 rotas × celular e desktop, console, `pageerror`, HTTP ≥ 400, rolagem horizontal, popup | **0 problemas** |
| Status HTTP | `curl` | `/categoria/xyz` 404 · `/termos/` 308 → `/termos` · `/conta` e `/pedido/x` com `X-Robots-Tag: noindex` · home sem noindex |
| HTML das categorias | `curl` + contagem | 51 / 5 / 5 / 39 / 16 peças, sem as duas duplicatas ocultas; 1 H1 por página |
| Troca HTML → app na categoria | capturas logo ao abrir e 4,5 s depois | visualmente iguais; o app só acrescenta o botão "Ver as peças" |
| Fluxo | Playwright | link direto de categoria → ESC volta para a home; navegação interna troca título e canonical; popup não abre sobre páginas |
| Eventos | `dataLayer` após ações | `drop_popup_open`, `drop_popup_close`, `product_open` uma vez cada |
| Visual | comparação de capturas produção × nova versão | título "Visão em movimento" idêntico (H1 → H2); rodapé com a nova linha de categorias no mesmo estilo |

## 4. Limitações

- **Suíte Playwright do repositório** (`npm run test:e2e`): neste ambiente falha também no `main` (28/28). O Chromium daqui não tem codec H.264, então nenhum MP4 toca, e há diferença de caminho do navegador. Na versão nova: 26 falhas e 2 aprovações, nenhuma falha nova. Precisa rodar numa máquina com Chrome completo.
- **Reprodução de vídeo** não pôde ser verificada aqui (mesmo motivo). Só o início do download de cada vídeo foi conferido. A reprodução depende do teste em aparelho real (pendência 14).
- Safari iOS e Android reais: não testados (pendência 14).
- O Lighthouse desktop usa simulação de rede; diferenças de ±5 pontos entre execuções são comuns.

## 5. Regressões

Nenhuma regressão funcional encontrada. A única piora medida é a nota de laboratório da home no desktop (90 → 85), explicada no §1.
