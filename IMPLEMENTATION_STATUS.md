# Street Goose 034 — Status de Implementação

Marcado como feito só depois de: editar → rodar localmente → abrir no navegador → verificar visualmente → confirmar console sem erro.

## Etapa 1 — Palco com 7 PNGs (mantido — cancelamento anterior foi revertido)
- [x] Sete PNGs exatos na primeira animação (chapeu/colete/lupa/mochila/moletom/perfume/quartz)
- [x] Nota: `shorts-oakley-png` não existe no projeto (busca recursiva confirmou); usado `quartz-oakley-png.png`, o único 7º arquivo real solto na raiz de `assets/`
- [x] Contador 01/07
- [x] Nenhuma categoria ocupando lugar de produto
- [x] Cores fortes por produto, partículas acompanham a paleta
- [x] Zero console error

## Remoção de assets/products/ e seções dependentes
- [x] `assets/products/` removida (confirmado caminho exato, sem wildcard, segunda vez após eu ter restaurado por engano)
- [x] Pastas `products-lupas/-moletons/-outros/-perfumes/-relogios` e `assets/heroes/` preservadas
- [x] Seção "Sua próxima lupa pode estar aqui" (#colecao antigo) removida do HTML/JS
- [x] Seção Product Orbit removida (dependia 100% de Inferno Metal, só existia nessa pasta)
- [x] Seção Shape Lab/Archive removida (idem, categoria "archive" só tinha produtos dessa pasta)
- [x] Seção Featured Drop removida (Violet Wrap não existe mais)
- [x] `id="colecao"` movido para a seção de categorias — os ~15 links de CTA espalhados pela página continuam funcionando sem precisar editar cada um
- [x] `.drift-img` e `.scroll-film-product` (referências órfãs a arctic-metal.webp) trocadas por PNG seguro
- [x] `.final-act-product` (magma-frame.webp) trocado por PNG seguro
- [x] Zero 404 confirmado após toda a cadeia de remoção

## Cards de categoria — voltaram a ter preview visual (decisão final substituiu a versão sem imagem)
- [x] 5 quadrados, preview de vídeo autoplay/muted/loop (independente do scroll — só liga scroll-scrub após o clique)
- [x] Só o card visível decodifica/toca (IntersectionObserver, threshold 0.4); pausados quando categoria abre
- [x] Sem "Explorar", sem contagem de peças, sem parágrafo explicativo — só nome centralizado
- [x] "ESCOLHA SUA SEÇÃO" como único texto de apoio
- [x] Poster de Relógios recapturado (estava em frame preto/fade-in do vídeo, agora mostra o relógio)
- [x] Entrada em stagger + clip reveal, pointer tilt no desktop

## Rotas + hero scroll-scrub + revelação de produtos
- [x] `/categoria/lupas|acessorios|relogios|perfumes|trajes`, History API, rewrite SPA na Vercel
- [x] Heroes mapeados: lupas→products-lupas, acessorios→products-outros, relogios→products-relogios, perfumes→products-perfumes, trajes→products-moletons
- [x] Vídeos comprimidos (4K60fps/52-105MB → 1080p30fps/4.6-13.6MB)
- [x] Produtos ocultos até progress ~0.995, reversível, stagger na revelação
- [x] Favoritar/adicionar à sacola/quickview funcionando nos itens do catálogo (integrados a window.SG_PRODUCTS, mesmo sistema genérico de wishlist.js/cart.js)

## Correção do hero cortado no mobile (bug real confirmado pelo print do usuário)
- [x] Camada de fundo (poster com blur+scale+darken, cover) + camada principal (vídeo real, contain) — frame inteiro sempre visível, nunca corta produto/texto
- [x] Fallback: se o vídeo não tem frame decodificado pro currentTime atual (readyState<2), some e revela o poster nítido atrás em vez de tela preta — bug real encontrado e corrigido durante o teste
- [x] safe-area-inset no topo/rodapé do hero

## Correção de performance no desktop
- [x] Removido `scroll-behavior:smooth` global do `html` (conflitava com ScrollTrigger.scrub — dupla suavização = sensação de scroll atrasado); smooth-scroll agora só em clique de âncora, via JS
- [x] Distância de scroll reduzida: Product Universe 380vh→300vh (desktop), 270vh/240vh (tablet/mobile); Category Hero 420vh→340vh (desktop), 275vh (mobile)
- [x] scrub mantido em 0.15–0.18 (dentro do range pedido)

## Catálogo real
- [x] Inventário: lupas=51, relogios=5, perfumes=40, trajes=17, acessorios=7 (bate com contagem física das pastas)
- [x] Todos carregados via import.meta.glob, zero 404

## QA e Deploy
- [x] Zero console errors (dev, dist local, produção)
- [x] Zero assets 404 em produção (incluindo fluxo completo categoria + deep-link + voltar + favoritar/carrinho/quickview)
- [x] Build aprovado (tsc --noEmit && vite build)
- [x] Deploy aprovado — https://street-goose-034-landing.vercel.app

## Etapa 6 — NÃO iniciada nesta rodada (escopo grande, ver relatório)
- [ ] Tema claro/escuro/sistema
- [ ] PT/EN/ES
- [~] Login/logout: Google ativo e verificado em produção; e-mail funciona com confirmação, enviado pela Resend (SMTP próprio, domínio verificado, DMARC, 100 e-mails/hora — ver supabase/templates/README.md); Apple não configurado
- [ ] Favoritos/sacola premium (redesign visual, já funcionais estruturalmente)
- [ ] Checkout completo
- [x] Ranking/XP/níveis/cupons — ver "Fidelidade" abaixo
- [x] Comunidade com foto grande/visualizador — ver "SG Community" abaixo (as avaliações demo da home saíram)
- [ ] Busca
- [ ] Newsletter com estados reais

## Painel do lojista — /admin
- [x] Migration `supabase/migrations/0100_admin_panel.sql`: tabela `admins`, `is_admin()`, RPCs `admin_*` (pedidos, clientes, comunidade) e RLS só-admin em cupons, recompensas e newsletter
- [x] Abas: Pedidos (preço por item, total, status, nota interna; "marcar pago" dispara o XP), Clientes, Comunidade (aprovar/rejeitar com motivo), Cupons & Recompensas, Newsletter (exportar CSV)
- [x] Pedidos como CRM (migration 0103): contagem real por status; mover com um clique (pago, enviado, reembolsado, cancelado, reaberto); pedido manual (venda no WhatsApp/balcão, com ou sem conta no site); editar cliente, conta vinculada, entrega, rastreio, itens (catálogo ou avulso), quantidade, preço, frete, desconto, pagamento e nota; excluir pedido aguardando/cancelado. XP acompanha o status (reembolso devolve, voltar a pago reaplica, trocar cliente move). Clientes: ver pedidos, novo pedido para o cliente, ajustar XP. Cliente vê status em português, rastreio (link dos Correios), frete e desconto.
- [x] Não-admin vê só "Acesso restrito"; o banco recusa as chamadas admin (`forbidden`) mesmo se forçadas
- [x] Link "Painel da loja" no menu da conta aparece só para admin
- [x] Aba Produtos (migrations 0101 + 0102): criar produto com fotos, renomear, descrição, preço (por peça ou para a categoria inteira), esgotado, ocultar do site, reordenar, trocar/remover fotos, restaurar original e excluir — tudo aparece no site na hora. Fonte: `public.products` (camada sobre as fotos de fábrica, lida no boot por `js/catalog-sync.js`) + `public.product_prices`; fotos novas no bucket público `products` (escrita só admin). Os mapas de `js/catalog.js` viraram só fallback.

**Tornar alguém admin** (SQL editor do Supabase, depois de a pessoa ter criado conta no site):

```sql
insert into public.admins (user_id) select id from auth.users where email = 'dono@exemplo.com';
```

Remover: `delete from public.admins where user_id = (select id from auth.users where email = 'dono@exemplo.com');`

## Fidelidade — XP, ranking, recompensas e cupons (migration 0104)
- [x] XP real: pedido pago dá 1 XP por R$ 1 (mínimo 50), foto aprovada na comunidade +30, ajuste manual no painel; cancelar/reembolsar devolve. Níveis calculados no banco (`level_for_xp`).
- [x] Ranking com opt-in: o cliente escolhe aparecer e o apelido em /conta (apelido único, 3–24 caracteres); sem apelido aparece só o primeiro nome. /ranking mostra a posição de quem está logado.
- [x] Recompensas publicadas pelo lojista (aba Cupons & Recompensas): ativas aparecem em /recompensas, bloqueadas até o nível pedido; resgate grava no banco e entrega o cupom ligado à recompensa (também em /conta → Meus cupons).
- [x] Cupom de verdade no checkout: campo na revisão (cliente logado), validação no servidor (`validate_coupon`) e desconto calculado e gravado no pedido por `create_whatsapp_order` — ativo, validade, limite total, limite por cliente (novo) e cupom de recompensa só para quem resgatou. Uso contado de forma atômica; a mensagem do WhatsApp e o pedido mostram o desconto.

## SG Community — rede social da marca (migration 0105)
- [x] Home (Capítulo 07): mural editorial com os visuais reais aprovados — destaque do lojista abre grande, até 5 fotos + "Seu visual aqui"; sem post aprovado, convite "Seja o primeiro visual" com fotos de campanha da marca (marcadas como campanha). No celular, trilho de arrastar com cards grandes. As avaliações de demonstração (localStorage) foram removidas.
- [x] /comunidade: feed em duas colunas de fotos grandes (uma coluna de ponta a ponta no celular), abas Recentes / Em alta / Meus posts, números da comunidade, carregar mais automático.
- [x] Curtir de verdade (uma por pessoa, contada no servidor, toque duplo na foto curte), compartilhar (link /comunidade?post=ID), peça marcada abre o produto.
- [x] Visualizador em tela cheia: setas/arrastar, ESC/X/voltar do navegador fecham sem perder a posição da página, link direto abre o post.
- [x] Seletor "Peça no visual" com a foto pequena de cada peça (miniaturas 160px WebP em `assets/thumbs/`, geradas por `node scripts/make-thumbs.mjs` — rodar de novo quando entrar foto nova de fábrica), busca, grupos por categoria e teclado.
- [x] Publicar: arrastar ou escolher foto, prévia grande, legenda (500), peça no visual, mostra como a pessoa aparece (@apelido ou primeiro nome). A foto é reduzida no aparelho (máx. 1800px, WebP) — sobe mais rápido e sem dados de localização da câmera. Meus posts mostra Em análise / No ar / Não aprovado (com motivo) e permite excluir.
- [x] Painel → Comunidade: fotos grandes com zoom (setas, ESC), peça pelo nome, curtidas, filtro Destaques e botão "Destacar na home".
- [x] Servidor: legenda saneada, destaque e curtidas fora do alcance do cliente, destaque cai se o post sai do ar, curtir só em post aprovado e com limite de taxa.

## Pagamentos
- [x] SG Payment Terminal (home): aviso "Em breve direto no site: Pix, cartão, boleto, Apple Pay e Google Pay. Por enquanto, o pagamento é combinado com a gente pelo WhatsApp." (PT/EN/ES), texto estático abaixo do título — animação e chips intocados. PSP escolhido: PagBank (checkout hospedado), ainda não ligado.

## Financeiro e painel premium (migration 0106)
- [x] Livro-caixa `finance_entries`: venda entra sozinha quando o pedido vira pago; reembolso/cancelamento lança o estorno; mudança de valor ou volta para aguardando lança o ajuste (sempre a diferença — saldo nunca diverge do pedido). Pedidos pagos antigos importados na migration.
- [x] Lançamento manual (entrada: aporte, outra; saída: mercadoria, frete, embalagem, marketing, taxas, retirada, outra) com editar/excluir; lançamento de pedido é automático e não se apaga.
- [x] Topo do painel: saldo em caixa, entradas e saídas de 30 dias, a receber, pedidos aguardando, vendas, fotos, clientes, newsletter — números ao vivo (atualiza a cada 20 s e na hora de cada ação), contagem animada e mini-gráficos; cada cartão abre a seção dele.
- [x] Aba Financeiro: período (hoje, 7/30 dias, mês, 12 meses, tudo), comparação com o período anterior, resultado, vendas e ticket médio, reembolsos, gráfico entradas × saídas com dica e teclado, categorias, peças que mais venderam e o livro-caixa com busca/filtro e "Ver pedido".
- [x] Visual: painel sempre escuro com luz ambiente, cartões de vidro, abas com ícone e indicador deslizante, entrada em cascata, esqueletos, brilho nos botões; tudo desliga com prefers-reduced-motion.

## Constelação 034 — ranking da home com cristal WebGL (Single Clear Faceted / Originkit)
- [x] Shader e construção por planos do Originkit preservados (`src/components/ranking-crystal/crystal-shader.ts`); adaptações documentadas no topo do arquivo: alpha pré-multiplicado real (sem retângulo/halo), `uOrigin` para viewport/scissor por slot, `uAmbient` (0 no tema escuro = look original; luz-base só no tema claro)
- [x] Cena de comparação isolada `dev/crystal-compare/` (fora do build): original verbatim × adaptado, mesmo preset `#6C64BF` — diferença média 0,13/255 na mesma pose (resíduo = degrau de resolução)
- [x] Um único contexto WebGL2 para os 3 cards (`CrystalField.ts`), program/planes compartilhados, planes calculados uma vez por preset, uniforms estáticos só na troca de preset
- [x] RAF só existe com a seção visível, aba visível e sem reduced motion; reduced motion (inclusive alterado em runtime) = pose estática sem loop; retomada sem salto
- [x] DPR limitado (2 desktop / 1,5 touch), orçamento de pixels, governador de qualidade com histerese (`crystal-quality.ts`, testado)
- [x] Fallback: sem WebGL2 / erro de shader / context lost → gema SVG do tier no mesmo slot; context restored → volta ao vivo
- [x] Presets por tier centralizados (`crystal-presets.ts`): mesma ótica do preset original, cor do tier de `LEVEL_GEMS` normalizada para a luminância de `#6C64BF`; rotação mais calma nos cards (speed 34, hover boost 40% em vez de 200%)
- [x] Cards: nome em destaque, avatar real (só https) com inicial de fallback, XP tabular, nível + pedra, 1º lugar com hairline dourada; hover 3px só em pointer fino; canvas `aria-hidden` e `pointer-events:none` (scroll touch começando na pedra funciona)
- [x] Testado em Chromium headless (SwiftShader, sem GPU): 1440/1024/768/390/360, temas claro/escuro, nome longo, avatar quebrado, tiers mistos, build de produção com CSP. Não medido: FPS em GPU real, Safari/iOS, Firefox, aparelhos Android reais

## Sete pedras em vidro real + galáxia do ranking
- [x] Um sistema único de pedras (`src/components/ranking-crystal/`): ótica do Originkit (Fresnel, refração, dispersão, reflexões internas) para os 7 níveis. Nível 1 = exatamente o cristal da home (diferença média 0,13/255 contra o original). Níveis 2–7 mantêm os formatos de antes (step-cut, oval, cluster, gota, trilliant, brilhante) como sólidos convexos facetados (`gem-geometry.ts`), com IOR real de cada mineral e cor por absorção (Beer-Lambert) em vez de luz tingida
- [x] Mesmas pedras vivas em: cards da home, pódio, lista "Cada nome", "Sua jornada", "Sete pedras" e página de benefícios — um contexto WebGL por página (`gem-field.ts`), canvas preso à área visível em páginas longas, pausa pelo botão "Pausar animação" e por reduced motion
- [x] Posters estáticos das 7 pedras (mesmo renderizador, PNG com alpha, 63 KB no total) em `public/brand/level-gems/`: header (badge de nível), primeiro frame e fallback sem WebGL
- [x] Pódio "Estrelas em ascensão": galáxia espiral em shader (até 46 mil estrelas com rotação diferencial na GPU), nebulosa procedural com poeira, céu com cintilação, feixes de luz, piso com anéis, deriva de câmera e parallax no mouse; joias do pódio = cristais alinhados aos pedestais por projeção
- [x] Medalhas redesenhadas (fita de cetim, argola, borda serrilhada, bisel polido, louros gravados)
- [x] Removidos `js/gem-geometry.js` e `js/ranking-gems-scene.js` (pedras Three.js antigas)
- [x] Testado em Chromium headless (SwiftShader): ranking 1440/390, benefícios, home claro/escuro, lista longa com rolagem, pausa, fechar/reabrir 3× (1 contexto vivo), build de produção com CSP. Não medido: FPS em GPU real, Safari/iOS

## Estabilidade e performance em aparelhos fracos + SG Community como app
- [x] Nível de aparelho (`window.SG.perfTier` low/medium/high) por saveData/2G, memória, núcleos, iOS < 15 e microbenchmark; `?perf=low|medium|high` força para teste. Low = sem cenas WebGL, posters e vídeos leves
- [x] Guarda em runtime (`js/perf-guard.js`): FPS ruim na rolagem por 2 janelas seguidas ou GPU fraca (sondada em idle) → `sg:perf-low` desliga as cenas WebGL (cenas, diretor, fireball, cristais, galáxia em modo calmo) sem recarregar a página
- [x] Boot sem cascata de imports (`js/boot-core.js`, `js/boot-shop.js`), espera do catálogo limitada a 2 s, personagem só no primeiro scroll/idle, intro sem bloquear o bootstrap
- [x] Vídeos de scroll com um seek por vez (`js/video-scrub.js`) e fonte leve em conexão lenta; intro 540p/720p (era 8,7 MB), poster do hero 960w, logo 480w WebP, lupa WebP (875 KB → 67 KB)
- [x] Loops de rAF dormem quando parados; header/progresso leem o tamanho da página em cache; orçamento de camadas/blur (`js/perf-budget.css`)
- [x] Medido (Chromium, perfil celular fraco: CPU 4×, 150 ms, 1,6 Mbps): página utilizável 15–17 s → 7,5–8 s, 4,9 MB → 2,8 MB, rolagem p50 33–67 ms → 17 ms
- [x] SG Community na home com cara de app (`js/community-app.css`): barra "Mural 034 / Ao vivo", feed em cards com anel de story, onboarding em passos. Bug corrigido: o estado vazio/erro não invade mais a Constelação 034
- [x] "2º lugar" prata e "3º lugar" bronze bege nos cards do ranking
- [x] Não medido: GPU real, Safari/iOS, aparelhos Android reais
