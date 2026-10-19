# Plano de eventos — Street Goose 034

Implementação: `js/analytics.js`. `window.SG.track(nome, parâmetros)` grava em `window.dataLayer`, o formato que Google Tag Manager e GA4 leem.

**Estado atual: nenhum fornecedor ligado.** Não há ID de medição real, então nenhum script de terceiro carrega e nenhum dado sai do aparelho. Os eventos ficam só na memória da página até alguém configurar o fornecedor (ver "Para ligar um fornecedor").
Visitas (pageviews) já são contadas pelo Cloudflare Web Analytics, que é anônimo, sem cookies e já citado na política de privacidade.

## Eventos

| Evento | Gatilho | Parâmetros | Onde está | Observação |
|---|---|---|---|---|
| `hero_cta_click` | clique no botão principal do banner | `label` | clique delegado (analytics.js) | |
| `campaign_slide_change` | visitante troca o banner (setas, teclado, arraste) | `slide` | `js/hero.js` | troca automática não conta |
| `product_open` | abre a visualização rápida de uma peça | `product_id`, `location` | clique delegado | |
| `add_to_cart` | peça entrou na sacola de verdade | `product_id` | evento `sg:store-intent` (cart.js) | exige login; clique sem login não conta |
| `add_to_wishlist` | peça salva nos favoritos | `product_id` | evento `sg:store-intent` (wishlist.js) | remover não conta |
| `begin_checkout` | clique em "finalizar" na sacola | `location` | clique delegado | |
| `order_created` | pedido registrado no banco ao enviar o checkout | `items`, `has_unpriced` | `js/checkout-page.js` | **não é venda**: pagamento ainda não confirmado |
| `whatsapp_click` | qualquer link para o WhatsApp, ou o envio do checkout | `location` (home, category, quickview, popup, footer, checkout...) | clique delegado + checkout-page.js | contato/lead, não venda |
| `drop_popup_open` | popup de promoção abriu | — | `public/entry-popup.js` | uma vez por sessão |
| `drop_popup_close` | popup fechado (X, fundo, ESC, continuar) | — | `public/entry-popup.js` | |
| `newsletter_submit` | inscrição aceita pelo servidor | — | `js/main.js` | sem e-mail no evento |
| `login` | login concluído | `method` (email, code) | `src/services/AuthService.ts` | |
| `sign_up` | cadastro criado | `method` | `src/services/AuthService.ts` | |

Regras seguidas:
- **Sem duplicação.** Os cliques são escutados num único ponto; os módulos só chamam `track()` para o que não é clique. Adição à sacola e favorito vêm do evento que já existia, que só dispara quando a peça entra de fato.
- **Sem dado pessoal.** Nenhum evento leva nome, e-mail, telefone, endereço ou id de usuário.
- **Sem venda por clique.** Não existe evento `purchase`. A venda real só acontece quando a equipe marca o pedido como pago no painel. Para medir receita, use o financeiro do painel ou envie a conversão a partir do servidor quando o status virar "pago" (Measurement Protocol); essa parte fica para quando houver o ID.

## Mapeamento sugerido para GA4

| Evento do site | GA4 | Conversão (key event)? |
|---|---|---|
| `add_to_cart`, `add_to_wishlist`, `begin_checkout`, `login`, `sign_up` | mesmos nomes (eventos recomendados) | não |
| `whatsapp_click` | `generate_lead` | sim, contato com intenção de compra |
| `order_created` | evento personalizado `order_created` | sim, pedido registrado |
| `product_open` | `select_item` | não |
| demais | eventos personalizados | não |

## Para ligar um fornecedor (pendência)

1. Criar a propriedade GA4 (ou contêiner do GTM) e enviar o ID (G-XXXX ou GTM-XXXX).
2. Decidir e aprovar o aviso de consentimento de cookies (LGPD). GA4 grava cookies, então precisa de consentimento antes de coletar (Consent Mode v2 com padrão "negado").
3. Implementação técnica:
   - carregar o script do fornecedor só depois do consentimento;
   - liberar os domínios dele na Content-Security-Policy (`vercel.json`: script-src, connect-src, img-src);
   - desligar o `page_view` automático e mandar um por troca de rota (o site é de página única; o `js/router.js` já sabe quando a rota muda).
4. Atualizar a política de privacidade (`js/legal-page.js`) citando o fornecedor.
5. Verificar no DebugView do GA4 que cada interação gera um evento só.

## Como verificar hoje

No console do navegador, em https://www.streetgoose034.com.br: faça uma ação (abrir uma peça, clicar no WhatsApp) e digite `dataLayer`. Cada ação aparece uma vez.
