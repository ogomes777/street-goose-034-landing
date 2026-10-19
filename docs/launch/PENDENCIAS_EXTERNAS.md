# Pendências externas — Street Goose 034

O que depende de conta, acesso ou decisão fora do código. Nenhum segredo aqui. A ordem segue a do pacote: medição e descoberta antes de divulgar.

| # | Conta / área | Ação exata | Responsável | Dado necessário | Depende de | Como validar |
|---|---|---|---|---|---|---|
| 1 | Google Search Console | Criar propriedade **de domínio** `streetgoose034.com.br` e verificar pelo registro TXT que o Google mostra, criado no DNS do Cloudflare | MASSON / cliente (dono do Cloudflare) | acesso ao Cloudflare e a uma conta Google da loja | deploy desta versão | Search Console mostra "Propriedade verificada" |
| 2 | Google Search Console | Enviar `https://www.streetgoose034.com.br/sitemap.xml` em Sitemaps | MASSON | — | item 1 | status "Sucesso" e 12 URLs descobertas |
| 3 | Google Search Console | Inspecionar `/` e `/categoria/lupas` e pedir indexação | MASSON | — | item 2 | "A URL está no Google" (pode levar dias; não há garantia) |
| 4 | Bing Webmaster Tools | Importar o site a partir do Search Console | MASSON | conta Microsoft | item 1 | sitemap aceito no Bing |
| 5 | GA4 ou GTM | Criar a propriedade e mandar o ID; decidir o aviso de consentimento (LGPD) | cliente + MASSON | ID G-… ou GTM-…; texto e design do aviso aprovados | — | ver PLANO_EVENTOS.md, "Para ligar um fornecedor" |
| 6 | Cloudflare (redirecionamento) | Criar regra: `http://streetgoose034.com.br/*` e `https://streetgoose034.com.br/*` → `https://www.streetgoose034.com.br/$1` (301) num salto só. Hoje são 2 saltos (http → https → www) | dono do Cloudflare | acesso | — | `curl -I http://streetgoose034.com.br/termos` devolve um único 301 para `https://www…/termos` |
| 7 | Cloudflare (robôs de IA) | Decidir os "content signals" e o bloqueio de robôs de IA (AI Crawl Control). Hoje o robots.txt gerenciado não proíbe nada. Buscadores e robôs de treino são decisões separadas | cliente | — | — | robots.txt de produção reflete a decisão |
| 8 | Instagram | Informar o @ oficial da loja | cliente | @ do Instagram | — | link do rodapé abre o perfil; incluir `sameAs` no JSON-LD da home |
| 9 | Dados da empresa | CNPJ, razão social, endereço (se houver) e e-mail de atendimento | cliente | dados reais | — | aparecem nas páginas /termos, /privacidade e /trocas |
| 10 | Google Perfil da Empresa | Criar **só** se houver endereço físico ou área de atendimento confirmada | cliente | endereço/área, horários, fotos reais | item 9 | perfil verificado; aí sim cabem LocalBusiness/ClothingStore no schema e SEO local |
| 11 | Design | Versão símbolo da marca para favicon/ícone (o logo horizontal fica ilegível em 16 px) | MASSON / design | arquivo quadrado oficial (SVG ou PNG 512) | — | aba do navegador legível |
| 12 | Áudio | Aprovar reencodar a trilha da intro (11 MB, 320 kbps) para 128–160 kbps: cerca de 60% menos dados no celular | cliente / MASSON | aprovação | — | arquivo novo menor e intro sincronizada |
| 13 | Catálogo | Cadastrar no painel nomes reais das peças (modelo, cor, material) no lugar de "Peça 01" | equipe da loja | dados verdadeiros de cada peça | — | nomes novos aparecem no site e no HTML das categorias após o próximo deploy |
| 14 | Testes em aparelhos reais | Safari no iPhone e Chrome num Android intermediário: intro, popup, sacola, checkout até o WhatsApp | Ramon | aparelhos | deploy | roteiro do RESULTADOS_QA.md sem falhas |
| 15 | Core Web Vitals de campo | Acompanhar no Search Console (Experiência na página) depois de ~28 dias de tráfego real | MASSON | tráfego | itens 1–2 | LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 no p75 (metas, não resultados) |

Observação sobre o catálogo no HTML: as listas de peças das categorias são geradas a cada deploy. Peça ocultada ou renomeada no painel aparece certa no site na hora; no HTML lido pelos buscadores, entra no próximo deploy.
