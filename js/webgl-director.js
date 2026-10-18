/* Street Goose 034 — director WebGL compartilhado (Payment Terminal, final-act
   e newsletter). Um único WebGLRenderer, um único canvas, um único
   requestAnimationFrame pras três cenas novas desta rodada — nunca três
   contextos WebGL/RAF simultâneos. O canvas físico é realocado pra dentro da
   seção visível via appendChild (o browser desconecta do pai anterior
   sozinho); só a cena ativa recebe render por frame — o loop nem chama
   renderer.render() quando nenhuma seção está visível. */
(function () {
  "use strict";
  if (!window.THREE) { window.SGDirector = { registerScene: function () {}, activate: function () {}, deactivate: function () {}, isAvailable: false }; return; }
  var THREE = window.THREE;

  var canvas = document.createElement("canvas");
  canvas.className = "sg-director-canvas";
  canvas.setAttribute("aria-hidden", "true");

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    window.SGDirector = { registerScene: function () {}, activate: function () {}, deactivate: function () {}, isAvailable: false };
    return;
  }
  var isDesktop = window.innerWidth > 900;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isDesktop ? 1.5 : 1.25));
  if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

  var scenes = {};
  var activeId = null;
  var contextLost = false;

  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); contextLost = true; }, false);
  canvas.addEventListener("webglcontextrestored", function () { contextLost = false; sizedFor = null; resize(); }, false);

  function registerScene(id, def) { scenes[id] = def; }

  // activate() runs on every visibility threshold while scrolling. setSize
  // reallocates (and clears) the drawing buffer even for the same size, so it
  // only runs when the box really changed or another scene took the canvas.
  var sizedW = 0, sizedH = 0, sizedFor = null;
  function resize() {
    if (!activeId || !canvas.parentElement) return;
    var parent = canvas.parentElement;
    var w = parent.clientWidth, h = parent.clientHeight;
    if (!w || !h) return;
    if (w === sizedW && h === sizedH && sizedFor === activeId) return;
    sizedW = w; sizedH = h; sizedFor = activeId;
    renderer.setSize(w, h, false);
    var s = scenes[activeId];
    if (s && s.camera && s.camera.isPerspectiveCamera) {
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
    }
    if (s && s.onResize) s.onResize(w, h);
  }

  function activate(id, container) {
    if (!scenes[id] || retired) return;
    var wasActive = activeId === id && canvas.parentElement === container;
    activeId = id;
    if (canvas.parentElement !== container) container.appendChild(canvas);
    resize();
    // renderiza um frame na hora, sem esperar o próximo RAF — evita o "pop-in"
    // de um frame em branco quando a seção acabou de voltar ao viewport
    if (!wasActive && !contextLost) {
      var s = scenes[id];
      if (s && s.onFrame) s.onFrame(0);
      if (s) renderer.render(s.scene, s.camera);
    }
    run();
  }
  function deactivate(id) {
    if (activeId === id) activeId = null;
  }

  // três seções (final-act, payment-terminal, newsletter) competem pelo
  // mesmo canvas físico. Deixar cada uma decidir activate/deactivate sozinha
  // por "isIntersecting" (booleano, threshold único) cria corrida real: numa
  // rolagem rápida duas seções adjacentes podem estar "intersectando" ao
  // mesmo tempo, e a ordem de disparo dos observers não é garantida bater
  // com a ordem visual — a seção errada podia ganhar o canvas e a certa
  // ficava sem nada. reportVisibility centraliza a decisão: sempre ganha
  // quem tem MAIS área visível, nunca fica alternando por causa de ordem de
  // callback.
  var visibility = {};
  var MIN_VISIBLE_RATIO = 0.04;
  function reportVisibility(id, ratio, container) {
    visibility[id] = { ratio: ratio, container: container };
    if (retired) {
      if (id === activeId && ratio <= MIN_VISIBLE_RATIO) { activeId = null; canvas.style.display = "none"; }
      return;
    }
    var bestId = null, bestRatio = MIN_VISIBLE_RATIO;
    Object.keys(visibility).forEach(function (key) {
      var v = visibility[key];
      if (v.ratio > bestRatio) { bestRatio = v.ratio; bestId = key; }
    });
    if (bestId) {
      activate(bestId, visibility[bestId].container);
    } else if (activeId && (!visibility[activeId] || visibility[activeId].ratio <= MIN_VISIBLE_RATIO)) {
      activeId = null;
    }
  }

  // overlay position:fixed (categoria/busca/carrinho...) cobre a tela sem
  // tirar a seção geometricamente do viewport — sem esse flag a cena ativa
  // continuaria renderizando escondida atrás, competindo por GPU com o vídeo
  // em scrub da categoria
  var overlayOpen = document.body.classList.contains("category-page-open");
  window.addEventListener("sg:overlay", function (e) { overlayOpen = !!(e.detail && e.detail.open); });

  // The loop only exists while a scene is active (and stops for good if the
  // runtime guard drops the device to the calm tier).
  var clock = new THREE.Clock();
  var raf = 0, retired = false;
  function tick() {
    raf = 0;
    if (!activeId || contextLost || retired) return;
    raf = requestAnimationFrame(tick);
    if (overlayOpen) return;
    var s = scenes[activeId];
    if (!s) return;
    var dt = Math.min(clock.getDelta(), 0.05);
    if (s.onFrame) s.onFrame(dt);
    renderer.render(s.scene, s.camera);
  }
  function run() { if (!raf && activeId && !retired) { clock.getDelta(); raf = requestAnimationFrame(tick); } }
  clock.start();
  // Calm tier: stop rendering at once. The last frame stays on screen (no
  // scene vanishing under the visitor's eyes); the canvas is hidden once its
  // section has left the viewport.
  window.addEventListener("sg:perf-low", function () {
    retired = true;
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (!activeId) canvas.style.display = "none";
  });

  var resizeTimer;
  addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }, { passive: true });

  addEventListener("pagehide", function () {
    Object.keys(scenes).forEach(function (id) {
      var s = scenes[id];
      if (s && s.dispose) { try { s.dispose(); } catch (e) {} }
    });
    try { renderer.dispose(); } catch (e) {}
  }, { once: true });

  window.SGDirector = { registerScene: registerScene, activate: activate, deactivate: deactivate, reportVisibility: reportVisibility, resize: resize, renderer: renderer, isAvailable: true };
})();

export {};
