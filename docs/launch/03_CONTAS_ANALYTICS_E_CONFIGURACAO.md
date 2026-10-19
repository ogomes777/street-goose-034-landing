# Contas e configuração guiada
Contas principais devem pertencer ao cliente; SET77 recebe permissões adequadas. Usar convite/acesso delegado, nunca senha compartilhada. Não colar segredos no chat.

## Google Search Console
1. Abrir https://search.google.com/search-console e verificar se já existe propriedade.
2. Preferir propriedade de domínio streetgoose034.com.br; ela exige verificação DNS.
3. Copiar exatamente o TXT fornecido pelo Google e inserir no DNS autoritativo atual. Se for Cloudflare, alterar lá; não presumir que Hostinger gerencia a zona só por ser registrador.
4. Preservar registros de e-mail, MX, SPF, DKIM e DMARC. Não mexer em nameservers.
5. Concluir verificação após propagação; manter o TXT.
6. Com sitemap publicado e válido, enviar https://streetgoose034.com.br/sitemap.xml, ajustando ao domínio canônico confirmado.
7. Inspecionar home e páginas comerciais importantes; usar teste ao vivo e solicitar indexação quando disponível.
8. Acompanhar processamento, páginas indexadas/excluídas e desempenho. Envio não garante indexação imediata.
Alternativa: propriedade de prefixo e método aceito pela interface, se DNS não estiver disponível; documentar cobertura.

## Bing Webmaster Tools
1. Abrir https://www.bing.com/webmasters/.
2. Importar propriedade verificada do Search Console, ou adicionar e verificar pelo método disponível.
3. Confirmar domínio e sitemap importados; enviar sitemap se faltar.
4. Conferir inspeção de URL e rastreamento. IndexNow é melhoria opcional para mudanças frequentes; implementar apenas com chave pública própria e endpoint correto, sem confundir com APIs do Google.

## GA4 e plano de eventos
1. Abrir https://analytics.google.com/ e reutilizar propriedade correta ou criar uma exclusiva da Street Goose.
2. Definir fuso America/Sao_Paulo, moeda BRL e fluxo Web para o domínio canônico.
3. Obter Measurement ID real G-…; fornecer ao Claude como configuração, nunca inventar.
4. Escolher implementação direta OU GTM. Não manter duas tags coletando a mesma navegação.
5. Definir política de consentimento/privacidade aplicável com responsável; implementar preferência explícita para coleta opcional conforme decisão. Consent Mode não substitui consentimento nem valida conformidade por si.
6. Garantir mudança/revogação da preferência e não enviar eventos opcionais antes do estado permitido no modo escolhido.
7. Testar Realtime/DebugView, reload, navegação SPA, voltar/avançar, consentimento concedido/negado e ausência de duplicação.
8. Filtrar tráfego interno cuidadosamente, primeiro em modo de teste quando disponível.
9. Vincular Search Console quando elegível; registrar propriedade/fluxo e acesso sem expor dados sensíveis.

| Evento | Gatilho | Observação |
|---|---|---|
| page_view | Visualização real de página | Uma por navegação; evitar automático + manual duplicados |
| click_whatsapp | Clique no CTA WhatsApp | Microconversão, não lead confirmado |
| generate_lead | Formulário aceito com sucesso | Só se existe formulário e persistência confirmada |
| sign_up | Conta criada com sucesso | Não medir abertura de formulário como cadastro |
| view_item | Produto visualizado | Só se houver página/dados de produto |
| add_to_cart | Item adicionado de fato | Só se carrinho existe |
| begin_checkout | Checkout iniciado | Só se existe |
| purchase | Pedido/venda confirmada | transaction_id estável, value e BRL; deduplicar |
| click_directions | Clique em como chegar | Só se estabelecimento/endereço confirmado |

Parâmetros úteis: cta_location, page_type e item_id público. Não enviar nome, telefone, e-mail, endereço, texto livre, tokens ou URLs com dados pessoais.
Se venda ocorre no WhatsApp/loja: GA4 mede encaminhamento; CRM registra atendimento, venda e receita. Não chamar clique de venda.
Eventos de ecommerce devem seguir schema GA4 real; validar item array, moeda e transaction_id. Tráfego de testes não é receita comercial.
UTMs padronizadas, minúsculas, sem dados pessoais. Exemplo:
?utm_source=instagram&utm_medium=organic_social&utm_campaign=lancamento_streetgoose
Nunca inserir UTM nos links internos, pois polui atribuição.

## Perfil da Empresa no Google
1. Buscar perfil existente antes de criar duplicado.
2. Confirmar elegibilidade: contato presencial real com clientes; negócio somente online normalmente não é elegível.
3. Reivindicar/configurar com proprietário real. Nome comercial verdadeiro, categoria adequada, endereço/horários/telefone confirmados.
4. Concluir verificação solicitada pelo Google, fotos reais, link do site com UTM e catálogo quando aplicável.
5. Pedir avaliações honestas a clientes reais, sem incentivo e sem selecionar só clientes satisfeitos.
6. Conferir consistência entre site e perfis. Não usar endereço da SET77 para a loja se não for o endereço real.

## Informação necessária na próxima rodada
Trazer: relatórios do Claude; confirmação do domínio canônico; estágio do GSC/Bing/GA4; ID de medição; cidade/endereço/horários públicos; se a venda fecha no site ou WhatsApp; existência do perfil Google.
Screenshots devem ocultar dados de clientes, tokens e informações privadas.

