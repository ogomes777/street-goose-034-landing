# Fechamento de lançamento — Street Goose 034 (19/10/2026)

Este documento distingue o que foi realmente implementado do que exige autorização, acesso a painel externo ou informações comerciais que ainda não foram confirmadas. **Não marcar tarefas como concluídas sem evidência.**

## Conferido / em produção anteriormente

- Google Search Console: domínio verificado, sitemap lido e home indexada; indexação das categorias **solicitada**, não confirmada.
- Sitemap XML: 12 URLs; robots.txt e llms.txt publicados.
- Bing Webmaster Tools: sitemap processado com 12 URLs.
- IndexNow: verificação publicada e 12 URLs enviadas; workflow retornou HTTP 202, não garantia de indexação.
- GA4 ID G-XPZWPBGLDN: coletou visitas, consentimento implementado e vinculação ao Search Console realizada.
- Backups manuais PostgreSQL e Storage: criados, criptografados e aprovados na verificação de arquivo.
- Backup recorrente no Windows: tarefa diária 20h cadastrada com teste inicial concluído. **Próxima execução diária e restauração isolada ainda não verificadas.**
- Vercel: domínio sem www tem redirect 308 configurado para www. Um eventual redirecionamento HTTP prévio na Cloudflare não foi medido de ponta a ponta.
- Resend: plano atual 100 envios/dia, 3.000/mês; consulta em 19/10 mostrou 3 envios/dia e 8/mês. Sem upgrade necessário.

## Alterações técnicas desta revisão

- A categoria mantém a mesma descrição indexável e links internos após hidratação do JavaScript, inclusive em mobile.
- Economia de dados evita carregar o vídeo das categorias. Vídeo usa preload de metadados.
- Newsletter usa `newsletter_signup`, sem inflar `generate_lead`; pedido registrado continua lead, nunca venda paga.
- Smoke tests automatizados com build de produção, Chromium e viewport mobile executados no GitHub Actions.

## Ações externas que dependem de acesso administrativo

- Google Analytics: **marcar generate_lead como evento-chave**; configurar IP(s) internos reais, primeiro em modo de teste (sem inventar IP), e validar no Tempo Real/DebugView.
- Cloudflare: verificar efetivamente `http://streetgoose034.com.br` → `https://www.streetgoose034.com.br` com **um único salto**; não duplicar redirecionamentos já aplicados pela Vercel.
- Google Business Profile: só criar/reivindicar se existir atendimento presencial/área de serviço elegível, com endereço e documentação verdadeiros.
- Conferir analytics de Core Web Vitals conforme volume de usuários reais; relatório pode demorar semanas.

## Dados que o proprietário precisa fornecer

- Instagram oficial; CNPJ, razão social, e-mail de suporte, atendimento, endereço **se existir loja elegível**.
- Nome real, marca, modelo, material, variantes e disponibilidade de cada peça. O fallback `Peça 01` continua até haver informação verificada. Preços não devem ser inventados.
- Confirmação do fluxo desejado de venda: WhatsApp (atual) ou pagamento interno com fornecedor contratado, impostos e logística.
- Acesso aos aparelhos reais para testes de cadastro, sacola e fechamento do checkout.

## Segurança: verificação feita, correção arriscada não aplicada

O Supabase sinalizou no Security Advisor (19/10):
- 7 funções SECURITY DEFINER executáveis por `anon`.
- 39 funções SECURITY DEFINER executáveis por `authenticated`.
- Proteção contra senhas vazadas desativada.
- Extensão `pg_net` instalada no schema `public`.
- 16 tabelas com RLS ativado e sem policies (muitas podem ser propositalmente inacessíveis diretamente).

**Não revogar permissões em lote.** Algumas dessas funções servem às páginas públicas da loja; revisar contratos de entrada, privilégios e verificações de autorização em ambiente isolado antes de mudar funções do banco.

Referências oficiais:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Recuperação / risco aceito

O backup diário local **não protege contra perda, roubo, malware ou falha do próprio PC**. A equipe optou por adiar cópia externa. Teste de restauração isolado segue aberto. O processo não deve ser considerado plano completo de recuperação enquanto essas verificações faltarem.

## Coisas que não são bloqueadores da loja já operante

- Favicon em forma de símbolo: depende de direção de marca aprovada; o existente já está configurado.
- Áudio da intro: possível reencode para arquivo menor, exigindo asset original e comparação auditiva/visual.
- Pix/cartão internos: escopo de produto opcional, dependente de provedor de pagamento e decisão do cliente.
- Upgrade Resend: não necessário no volume medido.
- Indexação de todas as páginas e relatórios Core Web Vitals: dependem do Google e de tráfego real.

## Critério de aceite para encerrar 100%

1. Builds/testes automatizados verdes, preview verificada e produção operacional.
2. Cadastro/checkout testados em iPhone e Android físicos, sem criar pedidos fictícios permanentes.
3. Proprietário confirmou dados legais, produtos e jornada de venda.
4. GA4 evento-chave e exclusão de tráfego interno configurados e validados.
5. Segurança Supabase revisada com plano de reversão testado.
6. Backup recorrente verificado em execução diária e restauração isolada concluída.
7. Performance mobile medida e otimizada por comparativo antes/depois.
8. Primeiro mês de distribuição publicado e resultados rastreados.
