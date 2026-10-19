# Checklist operacional e release
Preencher cada item com status, evidência, data e responsável. Caixa marcada significa verificado, não apenas “código escrito”.

## P0 — antes de divulgar
- [ ] Commit de referência e identificação do deploy atual.
- [ ] Alterações locais preservadas e branch de trabalho definida.
- [ ] Backup do código em remoto privado e dependências reproduzíveis.
- [ ] Inventário de dados: banco, Storage/mídia, Auth, planilhas/Apps Script, configurações e integrações.
- [ ] Confirmar cobertura e retenção reais de cada backup disponível; backup do banco não deve ser tratado como backup de todos os arquivos/mídia.
- [ ] Exportações sensíveis cifradas e restritas; nunca em public/, Git ou ZIP público.
- [ ] RPO/RTO definidos pelo responsável e procedimento de restauração registrado.
- [ ] Restauração de amostra em ambiente isolado confirmada, sem sobrescrever produção.
- [ ] Smoke test do caminho comercial, cadastro, login, recuperação e CRM existentes.
- [ ] Autorização das áreas privadas e ausência de dados pessoais em páginas públicas.
- [ ] HTTPS, domínio, redirects, ambiente e variáveis corretos.
- [ ] Build/types/lint conforme projeto, sem novos erros críticos.
- [ ] Mobile permite concluir o fluxo comercial e fechar overlays.

## P1 — SEO e medição
- [ ] Mapa de URLs e metadados exclusivos verificado no HTML renderizado.
- [ ] Conteúdo principal disponível para crawler sem exigir interação.
- [ ] Sitemap 200, XML válido, apenas URLs canônicas indexáveis.
- [ ] Robots 200, sem bloqueio acidental; noindex correto em utilitários/previews.
- [ ] Canonicals, 404, links internos, JSON-LD e imagens sociais verificados.
- [ ] Favicon/ícones sem sobras de template.
- [ ] llms.txt factual e sem promessas.
- [ ] GA4 configurado com ID real; consentimento e navegação SPA testados.
- [ ] Leads/vendas diferenciados; eventos não duplicados e sem PII.
- [ ] Baseline e comparação de performance mobile registrados.
- [ ] Métricas de campo ausentes identificadas como pendência, sem resultado inventado.

## Release
1. Revisar diff, preview e itens bloqueadores.
2. Registrar commit/deploy de retorno, responsável e janela de publicação.
3. Publicar segundo autorização vigente.
4. Validar URLs de produção, favicon, sitemap, robots, formulários, auth e eventos permitidos.
5. Conferir logs de erro e integrações sem gerar pedidos/contatos reais indevidos; identificar e limpar dados de teste conforme procedimento.
6. Se houver falha crítica, reverter deploy para versão conhecida. Mudança de banco pode exigir procedimento separado; rollback de código não restaura dados.
7. Não reenviar e-mails, cobranças ou automações em massa durante retorno.
8. Registrar resultado e pendências.

## Cadência sugerida, não agendada automaticamente
- Primeiras 24–48 h: disponibilidade, erros, formulários, links, integração e atendimento.
- Primeira semana: GSC/Bing, eventos, origem dos leads, taxa de resposta e mobile real.
- Semanal: consultas, páginas de entrada, leads qualificados, vendas atribuíveis, problemas técnicos.
- Mensal: conteúdo, oferta, links conquistados, dependências e restauração/backup conforme criticidade.

## Painel mínimo
Sessões por canal; páginas de entrada; cliques WhatsApp; formulários válidos; leads qualificados no CRM; vendas confirmadas; receita; tempo de atendimento.
Taxas devem informar denominador. Atribuição é estimativa e pode ter lacunas por consentimento, navegação entre dispositivos e fechamento offline.

