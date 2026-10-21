# Street Goose 034 — Fechamento de busca, analytics e distribuicao

Ultima auditoria operacional: 21/10/2026. Responsavel tecnico: SET77 LABS.

## Validado
- Google Search Console com propriedade de dominio ativa.
- Sitemap de 12 paginas indexaveis enviado ao Google (19/10); nenhuma advertencia/erro no relatorio de sitemaps.
- Meta title, meta description, canonical, index/noindex e JSON-LD de organizacao e breadcrumbs publicados.
- Paginas de cinco categorias com conteudo editorial e links internos rastreaveis.
- robots.txt e llms.txt em public/.
- GA4 ja integrado apos consentimento. Eventos reais de pedido, WhatsApp, checkout, produto e newsletter sao mapeados separadamente.
- Aplicacao mobile com testes simulados em Chromium/WebKit e deploy de producao confirmados.
- Supabase: snapshot comercial diario de 25 tabelas em schema privado (sg_internal), cron 23:00 UTC / 20:00 America/Sao_Paulo. Primeira captura e teste de restauracao isolada realizados.

## Validacao humana / acesso administrativo necessario
- GA4: marcar somente generate_lead (pedido efetivamente cadastrado) como evento-chave. Nao marcar click_whatsapp como venda nem usar purchase sem pagamento confirmado. Testar filtro de trafego interno antes de ativar.
- Bing Webmaster Tools: confirmar propriedade verificada, sitemap recebido e status de rastreamento. Publicacao de chave IndexNow so vira integracao funcional apos envio e resposta HTTP 200/202 do provedor.
- Google Perfil da Empresa: somente se a loja atender pessoalmente em local real ou na area de atendimento; confirmar com o proprietario endereco, horario e legitimidade do atendimento. Nao inventar ponto fisico.
- Backup completo: configurar copia externa fora do Supabase, cobrir auth e arquivos de Storage, testar recuperacao integral e guardar credenciais criptografadas fora do codigo.
- Performance: medir LCP, INP e CLS em campo, em iPhone e Android fisicos, rede fraca, modo de economia de energia e variacoes de largura de tela. Testar intro, audio, checkout, sacola e login.
- Catalogo: obter nomes e especificacoes verdadeiras das pecas. So criar paginas individuais, dados de oferta e Merchant Center quando precos/estoque forem reais.

## Plano de distribuicao com prioridade
1. Ativos oficiais: perfil Instagram Street Goose, bio linkando para dominio oficial e links de categorias, postagens do catalogo com URLs corretas.
2. Onde elegivel: Perfil da Empresa no Google, Bing Places e Apple Business Connect, com informacoes reais conferidas pelo Kibao.
3. Conteudo que pode captar demanda: fotos reais das pecas com boas descricoes, lookbooks, guias de selecao de lupas e FAQ de pedidos/trocas.
4. Social e descoberta: Pinterest com colecoes reais e links para categoria/produto; canais relevantes de moda de rua e comunidade local, evitando spam.
5. Case SET77 LABS: publicar no portfolio, Behance/Dribbble e apresentacao comercial **somente com autorizacao do cliente**, creditando o site e sem compartilhar dados privados.
6. Mensuracao: acompanhar cliques organicos nao-marca, leads confirmados e origem de referencia. Monitorar Search Console/Bing/GA4, sem atribuir qualquer visita a SEO antes de confirmar origem.

## Criterios de aceite
- Sitemap sem erros nao prova indexacao total.
- llms.txt nao garante recomendacao por assistentes de IA.
- Relevancia organica e mencoes externas sao progressivas; jamais comprar avaliacoes ou gerar citacoes falsas.
- Nao marcar 'concluido' nenhum cadastro externo sem verificar propriedade e perfil.
- Dados pessoais nao entram em PR, commit, log, screenshot ou relatorio publico.
