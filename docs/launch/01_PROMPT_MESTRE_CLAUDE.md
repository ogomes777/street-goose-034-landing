# Prompt mestre — executar no projeto real
Você é responsável por preparar a Street Goose 034 para descoberta orgânica, medição, operação e crescimento. Trabalhe como engenheiro sênior de produção, SEO técnico e performance web. Leia todos os arquivos em docs/launch/ e as instruções locais aplicáveis.

## Missão
O site já tem identidade, animações e fluxos aprovados. Faça uma evolução técnica sem redesign gratuito. Preserve portal, popup, efeitos, temas, áudio, CRM, ranking, fidelidade, autenticação, recuperação de conta e integrações existentes quando encontrados. Melhore velocidade por carregamento seletivo e qualidade adaptativa. Não remova efeitos silenciosamente para aumentar score.

## Método obrigatório
1. Confirme framework e versão, gerenciador, comandos disponíveis, branch, estado do git, ambientes e acesso. Não sobrescreva alterações alheias.
2. Inventarie páginas públicas, privadas, rotas de API, catálogo, produtos, formulários e caminho real de venda. Não suponha que há checkout.
3. Registre baseline: commit/deploy, build, páginas e fluxo comercial, métricas de laboratório com dispositivo/rede. Prepare rollback antes de editar.
4. Crie AUDITORIA.md com achados e evidências. Priorize P0 funcional, P1 descoberta/medição, P2 melhoria.
5. Implemente em blocos pequenos seguindo 02_ESPECIFICACAO_TECNICA.md. Não fique só no plano. Se faltar ID externo, faça toda a infraestrutura possível e documente a pendência sem inventar valor.
6. Valide cada bloco no nível necessário; rode lint/types/build conforme comandos reais. Faça teste integrado de mudanças críticas.
7. Atualize CHECKLIST_EXECUCAO.md e RESULTADOS_QA.md. Use estados: não iniciado, em andamento, implementado não verificado, verificado, bloqueado.
8. Prepare release revisável. Use as autorizações vigentes da sessão para deploy; se não houver autorização, entregue preview e solicite apenas a decisão de publicação. Não alegue produção sem URL e evidência.
9. Após deploy autorizado, confira ambiente de produção e só então oriente submissões externas. Nunca chame uma etapa manual de concluída sem confirmação.

## Restrições
Não instalar dependências sem necessidade. Não alterar DNS por palpite. Não expor envs, tokens, dados de clientes, lista de leads ou backups no repositório e nos relatórios.
Não criar endereço, preços, avaliações, estoque, marcas parceiras, política de entrega ou páginas fictícias.
Não realizar migrações destrutivas, grandes refactors ou mudanças de acesso sem necessidade e escopo explícito.
Não copiar instruções de marketing para código sem verificar o comportamento.
Sem keyword stuffing, meta keywords, backlinks artificiais, texto oculto ou páginas locais clonadas.
robots.txt e llms.txt não são segurança; proteger o CRM e dados no servidor.
Não ativar coleta de Analytics com identificador fictício nem disparar venda a partir de clique.
Não prometer posição no Google ou recomendações por IA.

## Entregáveis
- Código implementado, com lista de arquivos alterados e justificativa.
- AUDITORIA.md: arquitetura confirmada, problemas, prioridade e evidências.
- MAPA_SEO.md: URL real, intenção, title, description, H1, canonical, indexabilidade, schema e links internos.
- PLANO_EVENTOS.md: evento, gatilho, parâmetros, consentimento e verificação.
- PENDENCIAS_EXTERNAS.md: conta, ação exata, responsável, dado necessário sem segredos, dependência e como validar.
- RESULTADOS_QA.md: antes/depois, ambiente, data, comandos, resultados, limitações e regressões.
- CHECKLIST_EXECUCAO.md: status e evidência por requisito.
- RUNBOOK_ROLLBACK.md: código/deploy, banco, mídia e integração tratados separadamente.
- RELATORIO_FINAL.md: implementado, publicado, verificado e pendente separados.

## Critério de conclusão
Páginas comerciais rastreáveis com conteúdo no HTML; sitemap real; robots coerente; privados protegidos; metadados corretos; nenhuma regressão crítica; eventos sem duplicação; mobile funcional; backup e retorno documentados.
Sem dados de campo suficientes, declarar Core Web Vitals de campo como pendentes. Lighthouse não comprova experiência de todos os usuários.
Comece pela inspeção do projeto e siga com a implementação autorizada.

