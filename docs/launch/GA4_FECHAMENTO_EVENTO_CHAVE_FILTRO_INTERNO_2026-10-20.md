# Street Goose 034 | GA4: aceite do funil e tráfego interno (20/10/2026)

**Status:** mudanças de código em branch de lançamento. Nenhuma delas foi publicada na produção nesta etapa. Atualizar a confirmação somente depois do deploy único.

## Propriedade do GA4

- Domínio canônico: https://www.streetgoose034.com.br/
- Measurement ID existente: `G-XPZWPBGLDN`.
- A tag é carregada apenas com consentimento explícito.
- Fonte da verdade: pedidos persistidos no Supabase. Um clique no WhatsApp não equivale a um pedido, e um pedido não equivale a uma venda paga.
- Nenhum dado pessoal (nome, email, telefone, endereço, ID de pedido) deve integrar `gtag('event', 'generate_lead', ...)`.

## Fluxo de conversão implementado e testável

| Gatilho | Evento GA4 | Principal? |
|---|---|---|
| Pedido gravado no Supabase com `res.ok` | `generate_lead` | **Sim** |
| Clique em WhatsApp | `click_whatsapp` | Não |
| Inscrição na newsletter | `newsletter_signup` | Não |
| Iniciar checkout | `begin_checkout` | Não, por enquanto |
| Venda confirmada e paga | `purchase` | **Não implementado automaticamente**; não inventar |
| Adicionar produto | `add_to_cart` | Não |

A revisão de `checkout-page.js` garante que um pedido gravado seja contado mesmo se a consulta subsequente ao resumo do pedido falhar, e evita duplicação por resposta idempotente no mesmo fluxo de checkout.

## Pendente: ação administrativa no GA4 (não exige build nem Vercel)

### A. Definir generate_lead como evento principal (evento-chave)

Requer proprietário/editor da propriedade; não é uma mudança de código.

1. Acesse https://analytics.google.com/ com a conta que administra Street Goose 034 e selecione a propriedade certa.
2. **Administrador → Exibição de dados → Eventos**.
3. Em **Eventos recentes**, localize exatamente `generate_lead` e clique na estrela **Marcar como evento principal**. Se ainda não houver ocorrências, utilize a opção de criar/definir um **evento principal** com o nome **exatamente** `generate_lead` conforme a interface, sem criar um evento de coleta duplicado.
4. Conferir que `click_whatsapp`, `newsletter_signup`, `begin_checkout` e `page_view` não estejam marcados como evento principal por engano.
5. Escolher contabilização **uma vez por evento**, se o painel solicitar um método; cada pedido registrado deve ser um lead.
6. Confirmar no painel que `generate_lead` consta na lista de eventos principais. Sem acesso ao GA4, **não marcar como concluído**.

Referência oficial: https://support.google.com/analytics/answer/13128484?hl=pt-BR

### B. Configurar tráfego interno para equipe SET77 (iniciar em TESTE)

Não inventar IPs. Usar **IP público verdadeiro** de cada rede fixa de trabalho; IP dinâmico, VPN e 4G/5G mudam e podem não ser confiáveis.

1. **Administrador → Coleta e modificação de dados → Fluxos de dados**, abrir o fluxo Web da Street Goose.
2. **Configurar definições da tag → Mostrar mais → Definir tráfego interno → Criar**.
3. Nome: `SET77_STREETGOOSE_INTERNO`; parâmetro `traffic_type = internal`; selecionar tipo de correspondência e **IP público da rede da equipe**. Outros escritórios com IP real podem ser adicionados depois. Não inserir faixas privadas `192.168.x.x` como se fossem IPs públicos.
4. **Administrador → Coleta e modificação de dados → Filtros de dados**. Criar/editar filtro do tipo **Tráfego interno**, ação **Excluir**, correspondente a `traffic_type=internal`, estado **Teste**.
5. Validar em **Explorar**: dimensão **Nome do filtro de dados de teste**, dimensão **Nome do evento**, métrica **Contagem de eventos**. A validação pode demorar **24–36h**.
6. Somente depois de provar que os IPs não abrangem clientes reais, mudar para **Ativo** com autorização do responsável. **Ativo é irreversível para os dados afetados** e não reprocessa dados históricos.

Referência oficial: https://support.google.com/analytics/answer/10104470?hl=pt

### C. Validação do DebugView sem falsificar pedidos

- No site **já publicado**, dar consentimento com um navegador de QA, habilitar `debug_mode` apenas naquela sessão pelos recursos de depuração do Google e verificar `page_view`, `view_item`, `begin_checkout` e `click_whatsapp` sem realizar pedidos fictícios permanentes.
- Para `generate_lead`, aguardar um **pedido real** persistido por cliente (ou um procedimento isolado explicitamente autorizado e limpo de teste); comparar com CRM. Não registrar artificialmente pedidos reais só para gerar um evento.
- Conferir Realtime/DebugView sem duplicações. O teste automatizado do GitHub desabilita a rede de Google e usa apenas uma fila local de eventos sintéticos.
- Documento/CI não prova que a propriedade externa do GA4 recebeu o evento nem que a estrela de evento principal foi marcada.

## Fluxo de release único pós-limite Vercel

1. Branch: `feat/ga4-conversions-consent-internal-filter-20261020`.
2. Validar os testes `tests/launch/ga4-conversions.spec.ts` e o smoke geral pelo GitHub.
3. Integrar em `main` **uma única vez**, junto de quaisquer outras alterações que ainda aguardem Vercel, quando a restrição de builds terminar.
4. Conferir produção e só então retestar GA4. **As configurações administrativas A e B podem ser realizadas antes e não exigem nenhum build.**
