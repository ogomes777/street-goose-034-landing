/* Street Goose 034 — assinatura "TECHNOLOGY BY" + logo 777/SET77 volumétrica.
   Uma instância por hero interativo (scroll-film, hero3d-film, universe-stage,
   final-act, payment-terminal, newsletter, sgclub-teaser, e o hero React via
   window.SG.mountSet77Signature). Todas compartilham: um pointermove global,
   um único IntersectionObserver e um único requestAnimationFrame — nunca um
   listener/RAF por instância. Puramente decorativa (pointer-events:none,
   aria-hidden): nunca intercepta clique/scroll/drag do hero que a hospeda.

   Camadas 3D (perspective + preserve-3d + várias faces da mesma logo em
   translateZ, de -16px a +16px, com mask-image pra recortar cada face na
   silhueta exata da marca) formam a extrusão; o tilt de ponteiro, a
   respiração idle e a leve modulação por scroll só escrevem custom
   properties CSS lidas por essas faces — nunca criam suas próprias
   transformações concorrentes. */
(function () {
  "use strict";

  var logoUrl = new URL("../assets/logos/web/set77-777-red.webp", import.meta.url).href;
  document.documentElement.style.setProperty("--sig-mark", 'url("' + logoUrl + '")');

  var reduced = window.SG.prefersReducedMotion();
  var lowPerf = window.SG.perfTier !== "high";

  var TILT_MAX = 9; // graus
  var SPRING = 0.09; // lerp por frame rumo ao alvo (inércia)
  var IDLE_AMPL_Y = 4; // px
  var IDLE_AMPL_ROT = 1.4; // graus
  var IDLE_PERIOD = 5200; // ms — um ciclo de respiração completo

  // Rotação 360° independente do tilt (ver .set77-sig-spinner em styles.css).
  // SPIN_MS_BASE = duração de uma volta completa a velocidade de cruzeiro.
  // SPIN_BOOST é a aceleração ao interagir — sutil de propósito ("não é
  // efeito de videogame"): 1.16x é perceptível mas não parece acelerar de
  // marcha. SPIN_SPRING é bem mais lento que SPRING (tilt) pra essa mudança
  // de velocidade ser uma transição suave, nunca um degrau.
  var SPIN_MS_BASE = 9000;
  var SPIN_BOOST = 1.16;
  var SPIN_SPRING = 0.035;

  var pointer = { x: null, y: null };
  var instances = [];
  var rafHandle = null;
  var resizeRaf = null;
  var lastTickTs = null;

  // Pilha de extrusão original (back/mid1/mid2/mid3/front) tinha só 5
  // fatias a cada 8px — de perfil (perto de 90°/270°, ver updateInstance)
  // isso deixava "vãos" entre as cores. Perto de 90/270 a rotação DEVE
  // mostrar espessura lateral convincente, então aqui dobramos a densidade
  // (a cada 4px) só em perf alto — mobile/low-perf preserva a pilha original
  // mais leve, coerente com "reduzir partículas/reflexos" no celular.
  var DEPTH_STOPS = [
    [-16, [58, 4, 7]],
    [-8, [88, 7, 13]],
    [0, [138, 11, 18]],
    [8, [200, 15, 20]],
    [16, [255, 92, 58]], // vermelho quente pré-frente (aceno ao laranja SG)
  ];
  function mixChannel(a, b, t) { return Math.round(a + (b - a) * t); }
  function mixColor(a, b, t) {
    return "rgb(" + mixChannel(a[0], b[0], t) + "," + mixChannel(a[1], b[1], t) + "," + mixChannel(a[2], b[2], t) + ")";
  }
  function augmentSpinnerDepth(spinner) {
    for (var i = 0; i < DEPTH_STOPS.length - 1; i++) {
      var a = DEPTH_STOPS[i], b = DEPTH_STOPS[i + 1];
      var el = document.createElement("div");
      el.className = "set77-sig-face";
      el.style.transform = "translateZ(" + (a[0] + b[0]) / 2 + "px)";
      el.style.background = mixColor(a[1], b[1], 0.5);
      spinner.appendChild(el);
    }
  }

  function onPointerMove(e) {
    var p = e.touches && e.touches[0] ? e.touches[0] : e;
    pointer.x = p.clientX;
    pointer.y = p.clientY;
  }
  function onPointerLeaveWindow() { pointer.x = null; pointer.y = null; }

  if (!reduced) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    document.addEventListener("mouseleave", onPointerLeaveWindow);
  }

  function ensureLoopRunning() {
    if (reduced || rafHandle !== null || document.hidden) return;
    if (!instances.some(function (inst) { return inst.active; })) return;
    rafHandle = requestAnimationFrame(tick);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafHandle !== null) { cancelAnimationFrame(rafHandle); rafHandle = null; }
    } else {
      ensureLoopRunning();
    }
  });

  function tick(ts) {
    rafHandle = null;
    if (document.hidden) return;
    // dt em ms entre frames — a página tem bastante coisa rodando ao mesmo
    // tempo (vídeo, Three.js, ScrollTrigger), então um frame "normal" varia
    // bem mais que os 16ms ideais (medido: picos de 60-100ms+ são comuns,
    // não só depois de aba oculta). Um teto baixo aqui SUBTRAIA tempo real
    // de cada frame de jank normal, deixando o giro visivelmente mais lento
    // que o wall-clock — o teto só precisa existir pra evitar um "salto" de
    // vários segundos acumulados de uma vez ao voltar de aba oculta/minimizada
    // por muito tempo (a esse ponto sim seria um jerk perceptível).
    var dt = lastTickTs === null ? 16 : Math.min(250, ts - lastTickTs);
    lastTickTs = ts;
    var anyActive = false;
    for (var i = 0; i < instances.length; i++) {
      if (instances[i].active) { anyActive = true; updateInstance(instances[i], ts, dt); }
    }
    if (anyActive) rafHandle = requestAnimationFrame(tick);
  }

  function updateInstance(inst, ts, dt) {
    var rect = inst.rect;
    if (!rect) return;

    var tRx = 0, tRy = 0, hasFocus = false;
    if (pointer.x !== null) {
      var nx = (pointer.x - rect.left) / rect.width;
      var ny = (pointer.y - rect.top) / rect.height;
      // mantém resposta suave mesmo com o cursor um pouco fora do hero —
      // some de vez só além dessa margem, em vez de "cortar" o retorno
      if (nx >= -0.2 && nx <= 1.2 && ny >= -0.2 && ny <= 1.2) {
        var cx = Math.min(1, Math.max(0, nx)) * 2 - 1;
        var cy = Math.min(1, Math.max(0, ny)) * 2 - 1;
        tRy = cx * TILT_MAX;
        tRx = -cy * TILT_MAX;
      }
      // boost de giro só quando o ponteiro está de fato sobre a peça (margem
      // bem mais estreita que a do tilt acima) — interagir com o resto do
      // hero não deve acelerar a logo
      hasFocus = nx >= -0.1 && nx <= 1.1 && ny >= -0.1 && ny <= 1.1;
    }
    inst.rx += (tRx - inst.rx) * SPRING;
    inst.ry += (tRy - inst.ry) * SPRING;

    var phase = (ts % IDLE_PERIOD) / IDLE_PERIOD * Math.PI * 2;
    var idleY = Math.sin(phase) * IDLE_AMPL_Y;
    var idleRot = Math.sin(phase * 0.6) * IDLE_AMPL_ROT;
    var glowO = 0.45 + (Math.sin(phase * 0.8) + 1) / 2 * 0.25;

    // progresso local: onde o centro do hero está na viewport (0 topo..1 base)
    var vh = window.innerHeight || 1;
    var centerNorm = (rect.top + rect.height / 2) / vh;
    var scrollTilt = (0.5 - Math.min(1, Math.max(0, centerNorm))) * 3;

    // fração vertical do stage realmente visível na viewport agora — usada só
    // pra desacelerar o giro suavemente perto da borda (ver targetSpinMult
    // abaixo); o corte definitivo continua sendo o IntersectionObserver
    // (threshold 0.15) que zera inst.active e para o RAF de vez.
    var visibleTop = Math.max(rect.top, 0);
    var visibleBottom = Math.min(rect.bottom, vh);
    var visRatio = rect.height > 0 ? Math.max(0, visibleBottom - visibleTop) / rect.height : 1;

    var targetSpinMult = hasFocus ? SPIN_BOOST : 1;
    if (visRatio < 0.5) targetSpinMult *= Math.max(0.35, visRatio / 0.5);
    inst.spinMult += (targetSpinMult - inst.spinMult) * SPIN_SPRING;
    // módulo 360 é só higiene numérica (evita crescer sem limite numa aba
    // aberta por horas) — 360deg e 0deg renderizam idênticos e não há
    // transition em transform aqui, então o "wrap" não produz nenhum salto
    // visual, mesmo em pleno giro
    inst.spinDeg = (inst.spinDeg + (360 / SPIN_MS_BASE) * inst.spinMult * dt) % 360;
    var spinRad = (inst.spinDeg * Math.PI) / 180;

    inst.tilt.style.setProperty("--sig-rx", (inst.rx + scrollTilt).toFixed(2) + "deg");
    inst.tilt.style.setProperty("--sig-ry", inst.ry.toFixed(2) + "deg");
    inst.tilt.style.setProperty("--sig-idle-rot", idleRot.toFixed(2) + "deg");
    inst.float.style.setProperty("--sig-idle-y", idleY.toFixed(2) + "px");
    inst.spinner.style.setProperty("--sig-spin", inst.spinDeg.toFixed(2) + "deg");
    if (inst.glow) {
      // glow reage à orientação: um pouco mais aceso de frente (perto de 0/360)
      // que de perfil/de costas — sombra "acompanha" o giro em vez de ficar fixa
      var facing = Math.max(0, Math.cos(spinRad));
      inst.glow.style.setProperty("--sig-glow-o", (glowO * (0.75 + 0.25 * facing)).toFixed(2));
    }
    if (inst.specular) {
      // reflexo especular varre a peça durante o giro, não só com o tilt
      inst.specular.style.setProperty("--sig-spec-x", (50 + inst.ry * 2 + Math.sin(spinRad) * 10).toFixed(1) + "%");
      inst.specular.style.setProperty("--sig-spec-y", (30 - inst.rx * 1.5 + Math.cos(spinRad) * 6).toFixed(1) + "%");
    }
    for (var j = 0; j < inst.particles.length; j++) {
      var p = inst.particles[j];
      var depthFactor = p.depth / 22;
      p.el.style.setProperty("--px", (inst.ry * depthFactor * 1.6).toFixed(1) + "px");
      p.el.style.setProperty("--py", (idleY * depthFactor * -1.2 - inst.rx * depthFactor * 1.2).toFixed(1) + "px");
    }
  }

  // Alguns heroes têm texto/CTA quase full-width perto dos dois cantos
  // padrão em telas estreitas (medido via Playwright: header e cartão do
  // WhatsApp em #pagamentos, por exemplo) — data-anchor-after/before apontam
  // pra dois elementos irmãos dentro da mesma section, e a assinatura
  // reposiciona pro meio do vão real entre eles. Recalculado em resize (o
  // vão muda com reflow de texto/i18n), nunca por pixel fixo adivinhado.
  function applyAnchor(inst) {
    if (!inst.anchorAfterSel || !inst.anchorBeforeSel) return;
    var section = inst.root.closest("section");
    if (!section) return;
    var afterEl = section.querySelector(inst.anchorAfterSel);
    var beforeEl = section.querySelector(inst.anchorBeforeSel);
    if (!afterEl || !beforeEl) return;
    var sectionRect = section.getBoundingClientRect();
    var gapTop = afterEl.getBoundingClientRect().bottom - sectionRect.top;
    var gapBottom = beforeEl.getBoundingClientRect().top - sectionRect.top;
    var stageHeight = inst.root.offsetHeight || 56;
    // breakpoints mais largos podem colocar "depois"/"antes" lado a lado (ex.:
    // .newsletter vira row no desktop) em vez de empilhados — sem vão vertical
    // de verdade ali, volta pro canto padrão do CSS em vez de forçar posição
    if (gapBottom - gapTop < stageHeight * 0.6) {
      inst.root.style.top = "";
      inst.root.style.bottom = "";
      return;
    }
    var top = gapTop + (gapBottom - gapTop - stageHeight) / 2;
    inst.root.style.top = Math.max(0, top).toFixed(0) + "px";
    inst.root.style.bottom = "auto";
  }

  function refreshRect(inst) {
    applyAnchor(inst);
    inst.rect = inst.root.getBoundingClientRect();
  }
  function refreshAllRects() {
    instances.forEach(function (inst) { if (inst.active) refreshRect(inst); });
  }
  window.addEventListener("resize", function () {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () { resizeRaf = null; refreshAllRects(); });
  }, { passive: true });
  window.addEventListener("scroll", function () {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () { resizeRaf = null; refreshAllRects(); });
  }, { passive: true });

  var io = "IntersectionObserver" in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var inst = entry.target.__set77Inst;
          if (!inst) return;
          inst.active = entry.isIntersecting;
          if (inst.active) {
            refreshRect(inst);
            if (!inst.revealed) {
              inst.revealed = true;
              requestAnimationFrame(function () { inst.root.classList.add("is-revealed"); });
            }
            ensureLoopRunning();
          }
        });
      }, { threshold: 0.15 })
    : null;

  // Chamável tanto pelo boot abaixo (heroes vanilla, já no HTML) quanto pelo
  // wrapper React do hero interativo (monta seu próprio container e chama
  // isso depois) — um único caminho de registro, sem lógica duplicada.
  function mountSet77Signature(root) {
    if (!root || root.__set77Inst) return;
    var float = root.querySelector(".set77-sig-float");
    var tilt = root.querySelector(".set77-sig-tilt");
    var spinner = root.querySelector(".set77-sig-spinner");
    if (!float || !tilt || !spinner) return;
    // mais fatias de profundidade só em perf alto (ver augmentSpinnerDepth) —
    // mobile/low-perf mantém a pilha original mais leve de propósito
    if (!lowPerf) augmentSpinnerDepth(spinner);
    var inst = {
      root: root,
      float: float,
      tilt: tilt,
      spinner: spinner,
      glow: root.querySelector(".set77-sig-glow"),
      specular: root.querySelector(".set77-sig-specular"),
      particles: Array.prototype.map.call(root.querySelectorAll(".set77-sig-particle"), function (el) {
        return { el: el, depth: parseFloat(el.style.getPropertyValue("--d")) || 0 };
      }),
      active: false,
      revealed: false,
      rect: null,
      rx: 0,
      ry: 0,
      spinDeg: 0,
      spinMult: 1,
      anchorAfterSel: root.getAttribute("data-anchor-after"),
      anchorBeforeSel: root.getAttribute("data-anchor-before"),
    };
    if (lowPerf) root.classList.add("is-low-perf");
    root.__set77Inst = inst;
    instances.push(inst);
    if (io) {
      io.observe(root);
    } else {
      inst.active = true;
      refreshRect(inst);
      root.classList.add("is-revealed");
      ensureLoopRunning();
    }
  }

  window.SG.mountSet77Signature = mountSet77Signature;

  document.querySelectorAll("[data-set77-sig]").forEach(mountSet77Signature);

  // Set77TechnologySignature.tsx (hero React) pode rodar seu efeito antes
  // deste módulo carregar — ele enfileira a própria raiz nesse caso em vez
  // de perder o registro (mesmo padrão de fila usado em intro-loader.js/
  // music-player.js pra corridas equivalentes entre módulos assíncronos).
  if (window.__set77PendingSignatures) {
    window.__set77PendingSignatures.forEach(mountSet77Signature);
    window.__set77PendingSignatures = [];
  }
})();

export {};
