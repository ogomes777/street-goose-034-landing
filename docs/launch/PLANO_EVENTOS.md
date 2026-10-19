# Plano de eventos — Street Goose 034

Implementação: `js/analytics.js`. `window.SG.track(nome, parâmetros)` grava em `window.dataLayer`, o formato que Google Tag Manager e GA4 leem.

**Estado atual: GA4 de produção configurado com ID `G-XPZWPBGLDN`, carregamento somente após consentimento explícito no aviso de cookies.** Sem consentimento, não carregar a tag do Google. As visitas consentidas são medidas no GA4, além da possível medição própria do Cloudflare quando habilitada. Não enviar dados pessoais nos eventos.

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

## Envio ao GA4 (ativo, ID G-XPZWPBGLDN, só após aceite no aviso de cookies)

`js/ga4-consent.js` traduz os eventos internos para os nomes da tabela do doc 03:

| Evento do site | Enviado ao GA4 | Observação |
|---|---|---|
| `whatsapp_click` | `click_whatsapp` (`cta_location`) | microconversão, não lead |
| `product_open` | `view_item` (`items[].item_id`, `cta_location`) | |
| `add_to_cart`, `add_to_wishlist` | mesmos nomes (`items[].item_id`) | |
| `begin_checkout` | `begin_checkout` (`cta_location`) | |
| `order_created` | `generate_lead` (`lead_type: pedido_whatsapp`, `item_count`, `has_unpriced`) | pedido gravado no banco |
| `newsletter_submit` | `newsletter_signup` (`method: website`) | inscrição aceita pelo servidor, **não é lead comercial** |
| `login`, `sign_up` | mesmos nomes (`method`) | |
| `page_view` | medição otimizada do GA4 (mudança de histórico) | sem envio manual, para não duplicar |
| `purchase` | não enviado | venda é confirmada no painel; enviar pelo servidor (Measurement Protocol) quando houver segredo de API |

Recusar no aviso não carrega nada; revogar apaga os cookies `_ga` e recarrega sem GA4.
Marcar `generate_lead` como evento-chave no GA4 apenas para **pedido registrado**. `click_whatsapp` é microconversão; `newsletter_signup` não deve ser contabilizado como pedido. Configurar tráfego interno pela interface do GA4 (sem inventar IP), testar primeiro o filtro em modo de teste antes de ativá-lo. A implementação do rastreamento no código não configura automaticamente os eventos-chave na propriedade.

## Como verificar hoje

Na loja, **aceite cookies de análise** e use o relatório **GA4 → Tempo real/DebugView** para observar `page_view`, `view_item`, `begin_checkout`, `click_whatsapp`, `newsletter_signup` e `generate_lead` após suas respectivas ações. Use dados de teste, sem pedidos reais falsos. Verifique que a recusa de cookies não carrega a tag.

**Pendência administrativa:** marcar `generate_lead` como evento-chave e configurar o filtro de tráfego interno pela interface do Google Analytics (sem acesso direto ao painel neste repositório).
