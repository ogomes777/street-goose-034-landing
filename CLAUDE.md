# STREET GOOSE 034 — CLAUDE MASTER SPEC

> **Este arquivo é a constituição do projeto.** Antes de alterar qualquer código, componente, animação ou asset, leia este documento inteiro e inspecione a implementação atual (`index.html`, `styles.css`, `script.js` e `/assets`). O objetivo não é “fazer um site bonito”. O objetivo é construir uma experiência digital de marca com nível de campanha global, produto premium e direção cinematográfica, sem perder clareza, velocidade, estabilidade ou conversão.

---

## 0. MISSÃO

Transformar a landing da **Street Goose 034** em uma experiência digital de alto nível para uma marca de óculos/lupas com identidade própria, presença de rua, curadoria forte, linguagem contemporânea e acabamento de empresa consolidada.

A experiência final deve parecer uma fusão controlada de:

- campanha global de eyewear;
- editorial de moda;
- filme de produto;
- tecnologia de interface premium;
- cultura de rua real;
- e-commerce limpo e confiável;
- laboratório visual futurista.

**Resultado esperado:** o visitante precisa sentir, nos primeiros 3 segundos, que entrou em uma marca séria, desejável, diferente e tecnicamente bem construída.

A estética pode ser extrema. A experiência não pode ser confusa.

---

# 1. PRINCÍPIOS NÃO NEGOCIÁVEIS

## 1.1 Produto é o herói

O site existe para valorizar os óculos. Pessoas, campanhas, motion, partículas, tipografia e 3D existem para aumentar a percepção do produto, nunca para competir com ele.

Prioridades visuais:

1. produto;
2. rosto/persona/cultura;
3. copy;
4. motion e atmosfera;
5. detalhes decorativos.

## 1.2 Premium não é excesso

Não transformar a landing em um carnaval de efeitos. Luxo digital vem de **controle, timing, hierarquia, espaço, luz, material e precisão**.

Permitido:

- brilho metálico;
- reflexos ópticos;
- glow localizado;
- flare curto e elegante;
- partículas finas;
- fumaça volumétrica discreta;
- shaders sutis;
- 3D com movimento lento e controlado;
- parallax de profundidade;
- tipografia grande e limpa;
- transições cinematográficas.

Proibido:

- neon em tudo;
- partículas aleatórias cobrindo produto;
- ícones genéricos de IA;
- cérebro digital, robô, circuito clichê ou “cara de IA”;
- holograma barato;
- excesso de blur;
- glitch constante;
- qualquer visual que pareça template sci-fi genérico;
- animação que prejudique leitura, clique ou performance.

## 1.3 Rua real + tecnologia real

A Street Goose não deve parecer uma startup artificial. A base cultural é gente real, rolê real, esporte, festa, rua, música, estilo e óculos com presença.

A tecnologia deve aparecer no acabamento da experiência, não em símbolos clichês.

## 1.4 Nada de bugs de navegação

Regra crítica:

- nunca resetar a landing para a intro sozinho;
- nunca voltar para o topo por clique em modal, X, produto ou botão “voltar”;
- nunca bloquear scroll depois de fechar popup;
- nunca travar Chrome, Opera, Safari ou mobile;
- nunca deixar canvas WebGL invisível consumindo GPU;
- nunca recriar o app inteiro por troca de seção;
- nunca acoplar animação crítica ao carregamento de um asset sem fallback.

---

# 2. IDENTIDADE DA STREET GOOSE 034

## 2.1 Base visual

**Cores principais**

- Black: `#050505`
- Carbon: `#0A0A0A`
- Graphite: `#151515`
- Off-white: `#F2F2EF`
- Silver: `#BFC2C7`
- SG Orange: `#FF4D00`

**Cores de campanha**

As cores podem mudar por banner/produto, mantendo o preto como território principal:

- Ice Blue
- Electric Blue
- Emerald Green
- Chrome Silver
- Purple/Violet
- Gold/Bronze
- Red

A cor da página pode reagir ao hero ativo, ao produto em foco ou à coleção, mas de forma suave e coerente.

## 2.2 Materiais

A direção de materiais deve trabalhar com:

- metal polido;
- titanium/chrome;
- black gloss;
- black matte;
- vidro espelhado;
- lente Prizm-like / mirror lens;
- carbono;
- tecido técnico;
- asfalto molhado;
- concreto escuro;
- superfícies minerais;
- fumaça e névoa fina.

## 2.3 Logo

Sempre preservar a legibilidade de **STREET GOOSE 034**.

A logo deve ter:

- versão horizontal;
- versão símbolo;
- versão monocromática;
- versão prata;
- versão com accent color variável por campanha.

Não distorcer proporção. Não aplicar efeitos baratos. Glow, quando usado, deve ser mínimo e físico.

---

# 3. COPY E VOZ DA MARCA

A copy precisa ser humana, curta, forte, urbana e segura. Não escrever como IA, agência genérica ou campanha motivacional.

## 3.1 Linguagem desejada

Exemplos de direção:

- “Seu visual chega antes.”
- “Não é só óculos. É presença.”
- “A peça certa resolve o visual.”
- “Lupas que fecham o look.”
- “Curadoria forte. Sem catálogo infinito.”
- “A rua já escolheu o enquadramento.”
- “Escolha sua próxima assinatura.”
- “Do rolê pra memória.”

## 3.2 Evitar

- “revolucione sua experiência”;
- “tecnologia de ponta” sem contexto;
- “o futuro chegou”;
- “descubra um novo universo”;
- “inovação que transforma”;
- linguagem corporativa vazia;
- excesso de adjetivos;
- textos longos sobre conceito.

---

# 4. STACK DE PRODUÇÃO

A base atual é estática. A evolução recomendada deve manter a landing simples de operar, mas permitir motion sofisticado.

## 4.1 Runtime principal

Preferência:

- React + Vite + TypeScript;
- CSS moderno / CSS Modules ou arquitetura equivalente;
- GSAP para motion e timelines;
- Three.js para cenas 3D/WebGL;
- Remotion para produzir loops cinematográficos pré-renderizados e assets de vídeo, **não para transformar toda a UI em vídeo**.

Se a base atual continuar estática inicialmente, implementar primeiro com JS modular, GSAP e Three.js sem quebrar a experiência; migrar depois para React por etapas.

## 4.2 Responsabilidade de cada engine

### GSAP

Usar para:

- entrada/saída de elementos;
- timeline de hero;
- ScrollTrigger;
- scrub controlado;
- parallax;
- máscaras/reveals;
- stagger;
- morph de propriedades visuais simples;
- transições de seção;
- microinterações.

### Three.js

Usar somente onde o 3D aumenta valor:

- produto flutuando;
- showroom de óculos;
- partículas físicas leves;
- reflexos e luz sobre modelo 3D;
- lente com shader;
- fundo abstrato premium;
- hero com profundidade real;
- ícones 3D em momentos específicos.

Não usar Three.js para renderizar texto, botões, navegação ou coisas que HTML/CSS fazem melhor.

### Remotion

Usar para gerar:

- loops 4K/1080p de campanha;
- hero cinematográfico leve em WebM/MP4;
- transições pré-renderizadas;
- produto 360;
- vídeos curtos para popup/drop;
- versões mobile específicas.

Exportar vídeos otimizados e servir como mídia, sem depender de Remotion no runtime do visitante.

---

# 5. CONCEITO “3D / 4D / 8D”

Não tratar “4D/8D” como tecnologia literal. Usar como **camadas perceptivas**.

## 5.1 3D

- profundidade;
- produto real;
- rotação controlada;
- luz física;
- sombra/reflexo.

## 5.2 4D

3D + tempo:

- movimento guiado pelo scroll;
- mudanças de luz ao avançar;
- câmera com easing cinematográfico;
- cenas que evoluem em vez de apenas aparecer.

## 5.3 8D

Sensação multi-layer:

- 3D;
- motion;
- parallax;
- tipografia;
- troca de atmosfera/cor;
- partículas;
- reflexos;
- microinteração.

Tudo sincronizado como uma única direção de arte.

---

# 6. ARQUITETURA VISUAL DA LANDING

A experiência deve funcionar como um filme dividido em capítulos.

## CAPÍTULO 01 — ENTRY / HERO

Hero fullscreen ou quase fullscreen.

### Elementos

- header minimal;
- logo Street Goose 034;
- copy curta;
- CTA principal;
- CTA secundário;
- personagem/campanha;
- produto destacado;
- atmosfera 3D/WebGL;
- indicador discreto de slide;
- progress bar.

### Movimento

1. entrada em fade/black;
2. fundo aparece primeiro;
3. produto entra 120–250ms depois;
4. copy revela por máscara;
5. luz percorre a lente;
6. partículas aparecem em baixa densidade;
7. câmera respira lentamente;
8. scroll inicia próximo capítulo.

Nada deve dar sensação de loading obrigatório. Se WebGL não estiver pronto, hero precisa existir normalmente com imagem/vídeo.

### Hero slider

Criar 4–6 campanhas.

Cada slide pode ter accent color própria:

- orange;
- blue;
- silver;
- purple;
- green;
- red.

A UI acompanha a cor ativa com transição de 600–1000ms.

Nunca trocar toda a tela abruptamente.

---

## CAPÍTULO 02 — BRAND STATEMENT

Seção limpa, mais silenciosa.

Depois de um hero intenso, trazer respiro.

- fundo quase preto;
- headline enorme;
- pequena copy;
- linha/símbolo;
- textura fina;
- um produto isolado em 3D ou PNG.

Motion: produto reage ao mouse no desktop e ao scroll no mobile.

---

## CAPÍTULO 03 — PRODUCT ORBIT

Uma das seções mais especiais.

### Desktop

Criar um palco central com um óculos 3D ou PNG em composição depth-layer.

Ao scroll:

- produto gira apenas 10–18 graus;
- luz percorre a armação;
- lente muda reflexo;
- nome/modelo entra lateralmente;
- background accent muda suavemente;
- specs aparecem em 3 pontos discretos.

### Mobile

Não tentar reproduzir toda a complexidade.

- produto central;
- swipe horizontal;
- parallax leve;
- glow/reflexo em CSS/GSAP;
- 60fps como prioridade.

---

## CAPÍTULO 04 — COLEÇÃO

Grid editorial, não catálogo genérico.

Cada card:

- fundo próprio;
- produto grande;
- tag curta;
- nome;
- uma linha de descrição;
- CTA discreto;
- hover com luz/elevação;
- zoom do produto máximo 1.03–1.06;
- sombra refinada.

### Hover premium

No desktop:

- mouse tilt máximo 3°;
- highlight segue cursor;
- produto desloca 4–10px;
- borda reage levemente;
- CTA aparece sem saltar layout.

Sem efeito “cartão 3D gamer”.

---

## CAPÍTULO 05 — STREET CULTURE

Usar fotos reais da Street Goose.

Esse capítulo deve quebrar a frieza digital.

- mural editorial;
- eventos;
- rua;
- esporte;
- pessoas reais usando produto;
- grid assimétrico;
- motion tipo revista/filme.

### Movimento

- imagens entram por crop/reveal;
- velocidades diferentes;
- uma ou duas fotos podem ter vídeo loop;
- tipografia mínima sobre a imagem;
- nada de molduras de IA.

---

## CAPÍTULO 06 — FEATURE FILM

Banner horizontal cinematográfico 16:9.

Pode usar um dos assets criados ou vídeo Remotion.

Elementos:

- produto/rosto;
- copy curta;
- CTA;
- partículas e light streaks;
- sound-off por padrão.

Se houver áudio, somente depois de ação explícita do usuário.

---

## CAPÍTULO 07 — SHAPE LAB

Seção com produtos inovadores:

- Juliet/X-Metal inspired;
- shield;
- nose-piece;
- chrome;
- oval;
- wraparound;
- futuristic archive.

Layout sugerido:

- fundo off-white por contraste;
- produtos em PNG transparentes;
- black typography;
- cada produto com sombra extremamente limpa;
- scroll horizontal desktop/mobile;
- sensação de exposição de design industrial.

Essa seção deve provar que a marca tem curadoria, não só campanha.

---

## CAPÍTULO 08 — WHY STREET GOOSE

4 diferenciais, sem discurso corporativo.

Exemplo:

- Curadoria forte
- Atendimento humano
- Envio ágil
- Peças que fecham o visual

Ícones podem ser 3D metálicos, mas simples e com leitura imediata.

Não usar ícones de IA.

---

## CAPÍTULO 09 — POPUP / DROP

Popup premium após tempo ou comportamento, nunca imediatamente no primeiro frame.

### Trigger sugerido

- 7–12 segundos após entrada; ou
- após 30–40% de scroll; ou
- intenção de saída no desktop.

Nunca abrir repetidamente na mesma sessão.

### Fechamento obrigatório

- X visível;
- clique no backdrop;
- tecla ESC;
- botão continuar;
- restaurar scroll corretamente.

### Conteúdo

- produto forte;
- copy curta;
- CTA;
- sem formulário gigante;
- sem popup barato de “10% off” se não houver promoção real.

---

## CAPÍTULO 10 — FOOTER

Footer escuro, grande e editorial.

- logo;
- navegação;
- WhatsApp/contato;
- Instagram;
- políticas;
- newsletter;
- assinatura 034 discreta.

Pode conter uma linha de partículas/luz que desaparece ao final, como encerramento do filme.

---

# 7. THREE.JS — SISTEMA DE CENA

## 7.1 Canvas

Criar um único canvas principal por contexto visual sempre que possível.

Evitar 10 canvases separados.

O canvas deve:

- usar `pointer-events: none` quando não interativo;
- pausar render quando fora de viewport;
- limitar devicePixelRatio;
- destruir listeners e recursos ao desmontar;
- liberar geometries/materials/textures;
- possuir fallback visual.

## 7.2 Partículas

Partículas Street Goose:

- pequenas;
- poucas;
- alongadas quando representam velocidade;
- prata, branco, orange ou accent da campanha;
- comportamento direcional;
- sem “estrelinhas aleatórias”.

### Tipos

- optical dust;
- speed fragments;
- metallic sparks;
- mist particles;
- orbit points.

## 7.3 Glow

Glow deve parecer luz física.

Regras:

- intensidade localizada;
- usar em borda de lente, flare e highlight;
- nunca aplicar glow forte em todo texto;
- evitar bloom destruindo detalhes.

## 7.4 Lens shader

Se houver shader de lente:

- reflexão sutil;
- gradient angle control;
- fresnel discreto;
- chromatic aberration quase imperceptível;
- distortion muito baixa;
- preservar o desenho do produto.

Nada de “gelatina digital”.

## 7.5 Câmera

Movimentos:

- dolly-in lento;
- orbit de 3–8°;
- lateral drift;
- focus shift;
- scroll-scrub cinematográfico.

Nunca câmera nervosa.

---

# 8. GSAP — MOTION SYSTEM

Criar tokens de movimento.

```ts
const motion = {
  fast: 0.28,
  base: 0.6,
  slow: 1.1,
  cinematic: 1.6,
  easeOut: 'power3.out',
  easeInOut: 'power2.inOut'
}
```

Os valores são referência, não regra fixa.

## 8.1 Reveals

Preferir:

- clip-path;
- mask;
- translateY curto;
- opacity;
- scale de 0.98 → 1.

Evitar elementos voando 300px pela tela.

## 8.2 ScrollTrigger

Usar para:

- mudança de ambiente;
- hero → manifesto;
- produto orbit;
- mural de cultura;
- split banners;
- progress de página.

Não pinçar todas as seções. Pinning deve ser raro e intencional.

## 8.3 Scroll suave

Se implementar smooth scroll:

- compatível com teclado;
- compatível com anchors;
- não quebrar browser history;
- não prender usuário;
- desligar com `prefers-reduced-motion`;
- testar em iOS Safari.

---

# 9. REMOTION — FILME E ASSETS

Criar composições para campanha, não para substituir a página.

## 9.1 Composições sugeridas

- `SGHeroOrange`
- `SGHeroChrome`
- `SGHeroBlue`
- `SGProductOrbit`
- `SGDropTeaser`
- `SGCultureCut`

## 9.2 Formatos

Desktop:

- 16:9 / 1920×1080;
- 2560×1440 quando necessário;
- 4K apenas para master/export, não obrigatoriamente delivery web.

Mobile:

- 9:16 / 1080×1920;
- crops próprios, não cortar desktop no meio.

## 9.3 Encoding web

Gerar versões leves:

- WebM quando suportado;
- MP4 fallback;
- poster image;
- preload apenas do hero necessário.

---

# 10. DESIGN SYSTEM

## 10.1 Spacing

Base 4/8px.

Seções premium usam bastante respiro:

- mobile: 72–112px vertical;
- desktop: 120–180px vertical.

## 10.2 Radius

- cards: 16–28px;
- buttons: 12–18px ou pill controlado;
- não arredondar tudo.

## 10.3 Borders

- `rgba(255,255,255,.08)` base;
- accent border só em hover/ativo;
- metal line sutil em componentes especiais.

## 10.4 Typography

Headline:

- grotesk/neo-grotesk;
- peso 600–800;
- tracking ajustado;
- line-height fechado.

Body:

- simples;
- 16–19px desktop;
- 15–17px mobile;
- alto contraste.

Não usar 5 fontes diferentes.

---

# 11. COMPONENTES OBRIGATÓRIOS

Criar componentes reutilizáveis:

- `Header`
- `Logo`
- `HeroSlider`
- `HeroScene3D`
- `CampaignSlide`
- `SectionHeading`
- `ProductCard`
- `ProductRail`
- `ProductViewer`
- `CultureGrid`
- `CinematicBanner`
- `TrustStrip`
- `DropPopup`
- `Newsletter`
- `Footer`
- `MotionIcon`
- `AmbientParticles`
- `OpticalGlow`
- `ReducedMotionFallback`

---

# 12. ARQUITETURA DE PASTAS RECOMENDADA

```txt
src/
  app/
  components/
    layout/
    hero/
    product/
    culture/
    motion/
    ui/
  scenes/
    hero/
    product-orbit/
  data/
    products.ts
    campaigns.ts
  hooks/
  lib/
    gsap/
    three/
    performance/
  styles/
  assets/
    logos/
    heroes/
    products/
    lifestyle/
    video/
    models/
  remotion/
    compositions/
    components/
```

Separar conteúdo de interface. Produtos não devem ficar hardcoded em 15 componentes diferentes.

---

# 13. MODELO DE DADOS DE PRODUTO

```ts
interface Product {
  id: string
  name: string
  slug: string
  category: 'lupa' | 'solar' | 'performance' | 'archive'
  frameColor: string
  lensColor: string
  material?: string
  width?: number
  bridge?: number
  temple?: number
  images: string[]
  model3d?: string
  campaignAccent?: string
  featured?: boolean
  available?: boolean
}
```

Não inventar medidas comerciais como se fossem reais. Dados precisam vir de fonte real do catálogo.

---

# 14. INTERAÇÕES DE PRODUTO

Ao abrir um produto:

- preservar posição de scroll;
- abrir modal/page transition sem reset;
- permitir imagem grande;
- swipe no mobile;
- zoom controlado;
- fechar com X, ESC e back;
- ao fechar, voltar exatamente para onde estava.

Esse comportamento é prioridade absoluta porque bugs anteriores de reset não podem existir.

---

# 15. PERFORMANCE

Meta: experiência premium **e rápida**.

## 15.1 Regras

- lazy-load abaixo da dobra;
- AVIF/WebP para imagem;
- PNG apenas onde transparência é realmente necessária;
- poster para vídeo;
- compressão agressiva sem degradar produto;
- carregar modelos 3D sob demanda;
- pausar cenas fora da viewport;
- limitar partículas em mobile;
- reduzir DPR em aparelhos fracos;
- evitar múltiplos listeners de scroll;
- usar `requestAnimationFrame` corretamente;
- cleanup de GSAP/Three.

## 15.2 Perf tiers

Criar três níveis:

**High**
- Three.js completo;
- partículas;
- bloom leve;
- shaders.

**Medium**
- Three.js simplificado;
- menos partículas;
- sem pós-processamento pesado.

**Low / reduced motion**
- imagens estáticas;
- CSS/GSAP mínimo;
- sem canvas pesado.

O usuário não deve perceber “versão ruim”; apenas uma versão mais calma.

---

# 16. MOBILE FIRST DE VERDADE

Mobile não é desktop espremido.

## Hero

- crop próprio;
- copy menor;
- CTA visível sem scroll excessivo;
- sem sobreposição de rosto/produto;
- 3D simplificado.

## Product rail

- swipe;
- snap opcional;
- produto grande;
- cards 82–90vw;
- indicador de posição.

## Menu

- overlay clean;
- fechar por X/ESC/backdrop;
- body lock robusto;
- links com área de toque >= 44px.

---

# 17. ACESSIBILIDADE

Mesmo sendo cinematográfico:

- contraste real;
- foco visível;
- alt text;
- navegação por teclado;
- botões reais, não div clicável;
- `aria-expanded` em menus;
- `aria-hidden` em decorativos;
- `prefers-reduced-motion`;
- texto não pode depender apenas de imagem.

---

# 18. COMPATIBILIDADE

Testar no mínimo:

- Chrome desktop;
- Edge desktop;
- Opera desktop;
- Safari desktop;
- Chrome Android;
- Safari iOS.

Se um efeito só funciona em Edge, ele não está pronto.

Sempre ter fallback.

---

# 19. ESTADOS DE CARREGAMENTO

Nenhuma tela preta infinita.

Hero:

1. renderiza poster imediatamente;
2. texto e CTA ficam funcionais;
3. vídeo/Three entra depois;
4. animação substitui poster sem flash.

Produto 3D:

- mostrar PNG real enquanto carrega;
- transição suave para modelo;
- falhou? manter PNG, sem erro visual.

---

# 20. ÍCONES 3D

Ícones podem ser 3D, mas precisam parecer design industrial.

Sugestões:

- lente;
- frame;
- pacote/envio;
- shield/segurança;
- brilho óptico;
- 034 mark.

Material:

- chrome;
- black metal;
- accent color localizado.

Animação:

- 4–8° orbit;
- light sweep;
- 1.01 scale;
- nunca ficar girando sem parar.

---

# 21. MICROINTERAÇÕES

Botão:

- hover 180–280ms;
- borda/accent;
- seta desliza 4–6px;
- brilho leve.

Logo:

- sem rotação;
- micro highlight opcional.

Nav:

- underline/sliding indicator;
- header reduz após scroll;
- backdrop blur discreto.

Cursor customizado:

Somente desktop, opcional, mínimo. Não esconder cursor padrão em inputs ou elementos críticos.

---

# 22. TRANSIÇÕES ENTRE CAPÍTULOS

A página deve respirar como filme.

Usar:

- fade through black;
- light sweep;
- gradient bridge;
- wipe por produto;
- parallax overlap;
- mask horizontal.

Evitar:

- transição glitch em toda seção;
- flash branco forte;
- zoom extremo.

---

# 23. ESTADO GLOBAL DE CAMPANHA

Criar conceito de `activeCampaign`.

Quando hero/produto muda, alterar de forma coordenada:

- accent color;
- particle color;
- glow;
- progress;
- alguns detalhes da UI;
- background gradient.

Nunca trocar tipografia, layout ou identidade inteira.

---

# 24. POPUP E MODAIS — REGRAS DE ESTABILIDADE

Implementar um modal manager simples.

Obrigatório:

- uma origem de verdade para estado aberto/fechado;
- guardar scroll position;
- body lock sem pulo;
- restaurar scroll ao fechar;
- ESC;
- backdrop;
- focus trap;
- não duplicar listeners;
- não reabrir automaticamente depois de fechado;
- não resetar hero/slider.

---

# 25. ANALYTICS PREP

Preparar eventos sem acoplar fornecedor:

- `hero_cta_click`
- `product_open`
- `product_variant_view`
- `whatsapp_click`
- `drop_popup_open`
- `drop_popup_close`
- `newsletter_submit`
- `campaign_slide_change`

Não implementar tracking invasivo sem necessidade.

---

# 26. SEO / SOCIAL

Manter:

- title correto;
- meta description;
- OpenGraph;
- favicon;
- canonical quando domínio estiver definido;
- headings semânticos;
- structured data de produto apenas quando houver produto real e dados válidos.

---

# 27. O QUE EXISTE HOJE E DEVE SER APROVEITADO

Base atual:

- `index.html`
- `styles.css`
- `script.js`
- `assets/heroes`
- `assets/products`
- `assets/lifestyle`

Não jogar fora os assets bons para “começar do zero”.

Fazer inventário visual primeiro e classificar:

- hero master;
- hero secondary;
- popup;
- culture;
- product PNG;
- campaign;
- archive.

---

# 28. ORDEM DE EXECUÇÃO PARA O CLAUDE

## Fase 01 — Auditoria

- ler CLAUDE.md inteiro;
- listar arquivos;
- identificar assets;
- rodar base atual;
- mapear bugs;
- não alterar nada ainda.

## Fase 02 — Fundação

- design tokens;
- grid;
- typography;
- header;
- containers;
- breakpoints;
- motion tokens.

## Fase 03 — Hero

- reconstruir hero cinematic;
- slider robusto;
- progress;
- accent system;
- GSAP;
- fallback.

## Fase 04 — Product system

- data model;
- cards;
- rails;
- viewer;
- modal;
- PNG transparentes.

## Fase 05 — Three.js

- uma cena hero ou product orbit;
- perf tier;
- resize handling;
- fallback;
- cleanup.

## Fase 06 — Culture / Film

- mural;
- banners;
- vídeo;
- Remotion assets quando necessário.

## Fase 07 — Polish

- partículas;
- glow;
- icons 3D;
- cursor opcional;
- transition tuning;
- sound toggle opcional.

## Fase 08 — QA

- browser matrix;
- mobile;
- modal;
- back button;
- scroll restore;
- reduced motion;
- performance.

---

# 29. CRITÉRIOS DE ACEITE

A landing só está pronta quando:

- parece marca real e consolidada;
- produto domina a percepção;
- hero funciona em todos os navegadores;
- mobile tem impacto próprio;
- não existe reset involuntário;
- popup fecha corretamente;
- vídeos têm fallback;
- WebGL não causa tela preta;
- scroll permanece suave;
- não há layout shift grosseiro;
- não existe “cara de IA”;
- copy parece escrita por gente;
- animações têm propósito;
- performance continua boa;
- o site continua utilizável sem motion avançado.

---

# 30. REGRAS DE OURO PARA QUALQUER NOVA IDEIA

Antes de adicionar um efeito, perguntar:

1. Isso valoriza o produto?
2. Isso reforça a Street Goose?
3. Isso continua clean?
4. Isso funciona no mobile?
5. Isso mantém 60fps na maioria dos casos?
6. Isso tem fallback?
7. Isso parece campanha premium ou demo de efeito?

Se parecer demo, não usar.

---

# 31. DIREÇÃO FINAL

A Street Goose 034 deve parecer uma empresa que já nasceu grande.

Não buscar “site futurista”. Buscar **direção de arte inevitável**: tudo parece pertencer à mesma marca, do banner ao botão, do produto ao scroll, do vídeo ao popup.

A experiência deve ser cinematográfica, mas comercial. Tecnológica, mas humana. Escura, mas legível. Intensa, mas controlada. Rica em detalhe, mas limpa.

**Imagem forte. Produto forte. Motion preciso. Código sólido. Zero ruído.**

> Quando houver dúvida entre adicionar mais efeito ou preservar a elegância, preserve a elegância.

