# Street Goose 034 — Homologação Google Analytics 4

**20/10/2026 | Fluxo:** `G-XPZWPBGLDN` | `www.streetgoose034.com.br`

## 1. O que está comprovado por código e testes
- A tag `gtag/js` é injetada apenas depois de `sg034_analytics_consent_v1=accepted`.
- `sg:analytics` encaminha somente eventos da allowlist.
- `whatsapp_click` → `click_whatsapp` (**microconversão**, não venda).
- `order_created` → `generate_lead` somente após `OrderService.createWhatsAppOrder` retornar `ok` e `orderId`, uma vez por pedido na sessão.
- `newsletter_submit` → `newsletter_signup`, não pedido.
- Não enviar `purchase` sem pagamento realmente confirmado.
- Parâmetros autorizados não incluem e-mail, telefone, nome, CPF ou endereço.
- URL direta de pedido usa `/pedido/:id` na configuração da tag para não expor identificadores (rever na propriedade se há medição otimizada de navegação SPA com URL dinâmica).
- Testes `tests/launch/ga4-analytics-consent.spec.ts` usam eventos SINTÉTICOS apenas dentro do navegador com tag externa interceptada: **não criam pedidos, não validam coleta nos servidores Google e não contaminam relatórios**.

## 2. Confirmações indispensáveis na propriedade (requer Editor e acesso GA4)
1. Em https://analytics.google.com/ selecione a propriedade da Street Goose, confira **Fluxo da Web → Identificador de medição `G-XPZWPBGLDN`**.
2. Em **Relatórios → Tempo real**, abra o domínio em janela anônima, aceite análise e verifique eventos de visita. Para `click_whatsapp`, use um link de atendimento existente sem enviar mensagem real.
3. Em **Administrador → Eventos/Principais eventos**, confirme `generate_lead` como evento principal. NÃO configure `click_whatsapp`, `newsletter_signup` ou `purchase` como pedidos/vendas.
4. Não gere um `generate_lead` fake na produção apenas para ver o painel: isso grava um pedido de verdade. Use teste isolado do backend ou aguarde o primeiro pedido legítimo.
5. Verifique `page_view` em navegação SPA sem duplicação no Tempo real/DebugView. Se a medição otimizada de mudanças de histórico estiver ligada, considere redigir URLs dinâmicas `/pedido/<id>`, desligando apenas o recurso automático apropriado ou aplicando sanitização testada.

## 3. Tráfego interno SET77: manter modo TESTE até validar IP
**Não ativar o filtro ainda.** Uma exclusão ATIVA no GA4 é permanente para dados futuros correspondentes.

Com usuário Editor na propriedade:
1. Administrador → **Fluxos de dados** → fluxo da Web → Definir as configurações da tag → Mostrar mais → **Definir o tráfego interno**.
2. Crie/valide a regra do IP **público atual da operação SET77** (verifique na rede usada pela equipe; endereço IP dinâmico/VPN/4G pode variar). Valor do parâmetro `traffic_type`: `internal`.
3. Administrador → **Filtros de dados** → `Tráfego interno` → status **Testes**, não Ativo.
4. Em **Explorar**, crie análise com dimensão `Nome do filtro de dados de teste` + `Nome do evento` e métrica `Contagem de eventos`. Confirme que os acessos da SET77 recebem a marcação e que visitas externas não recebem.
5. Aguarde 24–36 h se a dimensão de teste estiver vazia. Só altere o filtro para **Ativo** após comprovar ausência de falsos positivos e confirmar IP estável. Se SET77 estiver em IP dinâmico, prefira filtragem em relatórios em vez de excluir irreversivelmente.

## 4. Limites de verificação desta execução
- O repositório e a implantação do site estão acessíveis. A integração disponível para consulta aqui cobre Search Console, **não** GA4 Admin ou relatórios.
- Sem acesso à propriedade do GA4 não é possível afirmar recepção real de eventos, estados dos principais eventos ou regras do filtro.
- Sem IP da rede SET77 não é possível testar corretamente a regra de tráfego interno.
- Ações na propriedade dependem do usuário Editor; nenhuma configuração foi alterada no Google Analytics por esta etapa.

Fonte oficial: https://support.google.com/analytics/answer/9333790?hl=pt-BR ; https://support.google.com/analytics/answer/10104470?hl=pt-BR .
