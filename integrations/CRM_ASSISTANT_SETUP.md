# Assistente Street Goose sem provedor pago

O CRM usa CrmAssistantService e consultas autenticadas ao Supabase. Somente administradores podem consultar os relatórios. O endpoint /api/crm-assistant retorna 410 e não chama provedores de IA.

## Como usar
Abra o assistente no CRM, escolha uma área ou escreva uma pergunta e selecione o período. Exemplos: quanto entrou e saiu este mês; produtos mais vendidos nos últimos 30 dias; resuma os pedidos; resuma os clientes; resuma os cupons; resuma o XP.

O resultado traz resumo, métricas, gráfico, fonte e momento da consulta. Ouvir resposta usa speechSynthesis. Baixar imagem gera PNG localmente. Nova conversa limpa os resultados da sessão.

Perguntar por voz depende de SpeechRecognition, MediaRecorder e permissão de microfone. O navegador pode processar a fala em seu próprio serviço: isso não é garantia de processamento offline. Confira e edite o texto antes de enviar. Onde não há reconhecimento, o botão fica oculto e o texto continua disponível. Não existe transcrição paga ou exportação MP3 da voz sintetizada.

Perguntas desconhecidas recebem orientação para escolher uma área. Não há geração livre de IA, alteração de dados por comando ou memória contextual de perguntas anteriores. O histórico visual mantém até cinco relatórios na sessão. Nenhum crédito do Gateway é necessário. Os limites de hospedagem e banco continuam valendo.
