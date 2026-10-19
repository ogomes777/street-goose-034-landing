# Especificação de implementação
## 1. Indexação e sitemap
- Confirmar domínio canônico HTTPS; adotar uma variante com/sem www e redirecionar alternativas sem cadeia. Não trocar slugs existentes sem mapa de redirecionamento.
- Em Next App Router, preferir metadata API, sitemap.ts e robots.ts compatíveis com a versão real. Não manter geradores duplicados.
- /sitemap.xml: URLs absolutas canônicas, públicas, indexáveis, status 200. Excluir login, conta, CRM, admin, APIs, busca interna, preview e URLs parametrizadas sem valor próprio.
- Incluir categorias/produtos reais quando existirem. lastmod deve representar alteração real, nunca a hora de cada request. Paginar/splitar se necessário respeitando limites do protocolo.
- Resolver origem das URLs no servidor e não usar host recebido sem validação.
- /robots.txt: liberar conteúdo e recursos de renderização, declarar sitemap absoluto; não deixar Disallow: / de staging em produção.
- noindex para páginas públicas utilitárias que não devem aparecer; não bloquear por robots uma URL que o robô precisa ler para enxergar noindex.
- Áreas privadas exigem auth/autorização server-side. Não listar caminhos secretos nem dados pessoais como mecanismo de SEO.
- Previews devem permanecer protegidos e/ou noindex; não prejudicar o domínio principal.
- Verificar canonical, status HTTP, páginas 404 verdadeiras e redirects. Não redirecionar todo produto removido para a home automaticamente.
- Estoque temporariamente indisponível pode manter página útil e availability correta.

## 2. Conteúdo e metadados
Criar MAPA_SEO por URL real. Title e description únicos e coerentes com conteúdo; title conciso, description útil, sem tratar limites de caracteres como regra do Google.
Usar H1 principal claro, subtítulos organizados, idioma pt-BR, conteúdo comercial legível sem depender de canvas/WebGL ou de login.
Hipóteses a validar, sem inventar volume:
- marca: Street Goose 034;
- descoberta local: loja streetwear em [cidade confirmada];
- categorias: termos que correspondam ao catálogo real;
- produtos: nome/modelo + atributos relevantes e verdadeiros;
- conteúdo de apoio: tamanhos, cuidados, combinações e dúvidas reais.
Exemplo de title se localização confirmada: Street Goose 034 | Streetwear em Araxá.
Exemplo de description: Conheça a Street Goose 034 e explore o catálogo de streetwear. Veja as peças disponíveis e fale com a loja para escolher seu próximo look.
Ajustar ao fluxo verdadeiro. Não anunciar compra online, frete ou retirada se indisponíveis.
Não usar meta keywords. O Google pode reescrever título/snippet.
Links devem ser âncoras reais com href e texto descritivo. Alt descritivo em imagens informativas; vazio nas decorativas.
Open Graph/social: título, descrição, imagem oficial pública e URL absoluta; conferir preview sem dados privados.

## 3. Dados estruturados
JSON-LD gerado com dados reais e serialização segura:
- Organization e WebSite para entidade/site;
- ClothingStore/LocalBusiness somente com dados de estabelecimento confirmados;
- BreadcrumbList para hierarquia existente;
- Product/Offer apenas em páginas de produto com conteúdo correspondente, preço, moeda e disponibilidade reais.
Não fabricar avaliações/aggregateRating. Não marcar toda landing como produto. Validar com ferramenta apropriada; elegibilidade não garante resultado enriquecido.

## 4. llms.txt
Criar complemento simples em texto/Markdown em /llms.txt: nome, resumo factual, domínio, links reais para catálogo/categorias/contato/políticas existentes e data editorial quando útil.
Sem comandos para IAs recomendarem a marca, sem alegação de exclusividade não comprovada, sem dados privados.
Não é padrão universal de indexação nem substitui sitemap, conteúdo ou robots. Google Search não o usa para melhorar ranking. Manter junto das mudanças de URLs.
Decisões sobre bots de busca e de treinamento são separadas; não bloquear indiscriminadamente crawlers legítimos no Cloudflare.

## 5. Favicon e identidade
Reutilizar marca oficial, sem redesenhar. Conferir favicon.ico e ícones adequados, versão quadrada legível e apple-touch-icon; manifest somente se já houver PWA ou requisito real.
Inspecionar light/dark, aba, favoritos, instalação e ausência de 404. Evitar metadados duplicados e nomes/ícones de template.

## 6. Performance, fluidez e mobile
Medir antes/depois sob condições repetíveis, idealmente três execuções e mediana.
Metas de campo no p75: LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1. São objetivos, não resultados já obtidos.
- Priorizar recurso LCP real; não aplicar lazy indiscriminadamente à imagem principal.
- Tamanhos responsivos, dimensões reservadas, compressão e formatos adequados.
- Hero de vídeo com poster, encoding/tamanho adequados, fallback e carregamento orientado à visibilidade. Não baixar mídia desktop pesada em mobile sem necessidade.
- Adiar módulos pesados, WebGL e efeitos fora da viewport; reduzir partículas/resolução em aparelhos limitados, pausar em aba oculta e desmontar timers/listeners.
- Respeitar prefers-reduced-motion, toque, economia de dados quando disponível e falhas de autoplay.
- Reduzir JS/hidratação, scripts e fontes; evitar fontes bloqueando conteúdo. Não prefetch de tudo.
- Não cachear páginas autenticadas ou respostas com dados pessoais em cache público. Conferir interação entre CDN, aplicação e service worker.
- Scroll suave sem scroll hijacking; nada deve prender navegação, compra, leitura ou teclado.
- Testar 320, 360, 390, 430 px e desktop, Android intermediário e Safari iOS quando acessíveis.
- Sem overflow horizontal, texto cortado, botão coberto por popup/teclado, hover obrigatório ou CTA inacessível.
- Zoom, foco visível, contraste, labels, erros compreensíveis e toque confortável. Meta de projeto: alvos próximos de 44 px.
- Popup deve fechar por botão acessível e Escape, gerenciar foco e respeitar estado/frequência. Não bloquear conteúdo por animação que falhou.
- Validar temas, áudio com controle, consentimento, ranking e fidelidade sem regressão.

## 7. Interligação
Mapa proposto sujeito às páginas reais: home → categorias → produtos → relacionados; navegação/rodapé → sobre, contato e políticas; guia editorial → categoria/produto relevante.
Não criar páginas de “serviços” para uma loja só por constarem no briefing genérico.
Corrigir órfãs, links quebrados e âncoras vagas. Não criar artigos vazios para volume.

