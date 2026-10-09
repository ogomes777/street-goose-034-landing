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
- [~] Login/logout: Google ativo e verificado em produção; e-mail funciona mas exige confirmação (SMTP padrão do Supabase, com limite de envio); Apple não configurado
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
- [x] Publicar: arrastar ou escolher foto, prévia grande, legenda (500), peça no visual, mostra como a pessoa aparece (@apelido ou primeiro nome). A foto é reduzida no aparelho (máx. 1800px, WebP) — sobe mais rápido e sem dados de localização da câmera. Meus posts mostra Em análise / No ar / Não aprovado (com motivo) e permite excluir.
- [x] Painel → Comunidade: fotos grandes com zoom (setas, ESC), peça pelo nome, curtidas, filtro Destaques e botão "Destacar na home".
- [x] Servidor: legenda saneada, destaque e curtidas fora do alcance do cliente, destaque cai se o post sai do ar, curtir só em post aprovado e com limite de taxa.
