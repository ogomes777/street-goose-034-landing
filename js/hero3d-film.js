/* Street Goose 034 — Hero 3D Identity Film.
   Mascote -> transformação -> personagem -> energia orbital -> assinatura
   Street Goose. Tempo do vídeo 100% controlado pelo scroll, reaproveitando
   a mesma arquitetura comprovada do scroll-film.js: ScrollTrigger scrub
   como única fonte de suavização (sem loop de lerp manual em cima do
   currentTime), preload antecipado por IntersectionObserver, fallback
   estático em reduced-motion. Seção isolada, própria, nunca toca no
   scroll-film / drift-product existentes. */
(function () {
  "use strict";

  var section = document.querySelector("[data-hero3d-film]");
  if (!section) return;

  var video = section.querySelector("[data-hero3d-video]");
  var canvas = section.querySelector("[data-hero3d-canvas]");
  var glow = section.querySelector("[data-hero3d-glow]");
  var stage = section.querySelector("[data-hero3d-stage]");
  var line = section.querySelector("[data-hero3d-line]");
  var sweep = section.querySelector("[data-hero3d-sweep]");
  var kicker = section.querySelector("[data-hero3d-kicker]");
  var sticky = section.querySelector(".hero3d-sticky");
  var graffiti = section.querySelector("[data-hero3d-graffiti-art]");
  var graffitiShell = section.querySelector("[data-hero3d-graffiti]");
  var graffitiDrawing = section.querySelector("[data-hero3d-graffiti-drawing]");
  var sparksRoot = section.querySelector("[data-hero3d-graffiti-sparks]");

  // Deterministic spark geometry. Reversible, scrub-driven; no timers or
  // runaway animation loops on Safari mobile.
  if (sparksRoot && !sparksRoot.children.length) {
    var frag = document.createDocumentFragment();
    for (var si = 0; si < 36; si++) {
      var seed = (si * 61 + 17) % 101 / 101;
      var a = si * 2.399963229728653;
      var radius = 40 + (si % 7) * 8;
      var spark = document.createElement("i");
      spark.className = "hero3d-graffiti__spark";
      spark.style.setProperty("--sg-spark-x", (16 + seed * 68).toFixed(2) + "%");
      spark.style.setProperty("--sg-spark-y", (39 + Math.sin(a) * 17).toFixed(2) + "%");
      spark.style.setProperty("--sg-spark-size", (1.5 + seed * 2.1).toFixed(2) + "px");
      spark.style.setProperty("--sg-spark-opacity", (.36 + seed * .64).toFixed(2));
      spark.style.setProperty("--sg-spark-dx", (Math.cos(a) * radius).toFixed(1) + "px");
      spark.style.setProperty("--sg-spark-dy", (Math.sin(a) * radius * .85 - 30).toFixed(1) + "px");
      frag.appendChild(spark);
    }
    sparksRoot.appendChild(frag);
  }


  var reduced = window.SG.prefersReducedMotion();
  var canScrub = window.SG.hasGSAP && window.ScrollTrigger && !reduced;

  window.SG.hero3dOrbitBoost = 0; // lido pela camada de partículas pra sincronizar com a energia do filme

  /* ---------------- Fallback estático: reduced motion / sem GSAP ---------------- */
  if (!canScrub) {
    section.classList.add("hero3d-film--static");
    if ("IntersectionObserver" in window) {
      var ioStatic = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          video.setAttribute("preload", "auto");
          video.load();
          video.addEventListener("loadedmetadata", function () {
            try { video.currentTime = video.duration * 0.74; } catch (err) {}
          }, { once: true });
          ioStatic.unobserve(e.target);
        });
      }, { threshold: 0.15 });
      ioStatic.observe(section);
    }
    return;
  }

  /* ---------------- Code-controlled metal -> orange -> cobalt graffiti ---------------- */
  var graffitiTimeline = null;
  if (graffitiDrawing && window.gsap && typeof window.gsap.timeline === "function") {
    try {
      graffitiTimeline = window.gsap.timeline({ paused: true });
      graffitiTimeline.fromTo(
        graffitiDrawing,
        { autoAlpha: 0, y: 68, z: -220, scale: .78, rotationX: -21, rotationY: 5, rotationZ: -1 },
        { autoAlpha: 1, y: 0, z: 0, scale: 1, rotationX: 0, rotationY: 0, rotationZ: 0,
          duration: 1, ease: "none", immediateRender: false }
      );
      section.classList.add("hero3d-film--motion");
    } catch (err) {
      graffitiTimeline = null;
      section.classList.remove("hero3d-film--motion");
    }
  }

  /* ---------------- Preload antecipado do vídeo (1.5 viewport antes) ---------------- */
  var videoReady = false;
  var hero3dST = null;
  var duration = 0;
  function startPreload() {
    if (video.getAttribute("preload") === "auto") return;
    video.setAttribute("preload", "auto");
    video.load();
  }
  video.addEventListener("loadedmetadata", function () {
    duration = video.duration || 0;
    videoReady = true;
    if (hero3dST) applyProgress(hero3dST.progress);
  });
  if ("IntersectionObserver" in window) {
    var preloadIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { startPreload(); preloadIo.disconnect(); } });
    }, { rootMargin: "150% 0px 150% 0px" });
    preloadIo.observe(section);
  } else {
    startPreload();
  }

  /* ---------------- Fases mapeadas no material real (ver narrativa do vídeo) ---------------- */
  var TRANSITION_IN_END = 0.07;
  var KICKER_IN_END = 0.05, KICKER_HOLD_END = 0.10, KICKER_OUT_END = 0.15;
  var ORBIT_IN_START = 0.19, ORBIT_IN_END = 0.29, ORBIT_OUT_START = 0.58, ORBIT_OUT_END = 0.68;
  var SWEEP_AT = 0.71;
  var OUT_START = 0.86;
  var OUT_END = 0.995;

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function smoothstep(a, b, v) { var t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }

  // transform do stage é escrito tanto pelo scroll (scale de saída) quanto
  // pelo parallax do cursor (translate/rotate) — compõe os dois num único
  // lugar pra eles nunca se sobrescreverem
  var scrollScale = 1;
  var finaleY = 0;
  var cursorTX = 0, cursorTY = 0, cursorRY = 0, cursorRX = 0;
  function composeStageTransform() {
    stage.style.transform =
      "translate(" + cursorTX.toFixed(2) + "px," + (cursorTY + finaleY).toFixed(2) + "px) " +
      "rotateY(" + cursorRY.toFixed(2) + "deg) rotateX(" + cursorRX.toFixed(2) + "deg) " +
      "scale(" + scrollScale.toFixed(4) + ")";
  }

  var sweepFired = false;

  function applyProgress(p) {
    if (videoReady && isFinite(duration) && duration > 0) {
      video.currentTime = Math.max(0, Math.min(duration, p * duration));
    }

    // transição de entrada: a linha central colapsa enquanto o filme emerge do preto
    var inT = smoothstep(0, TRANSITION_IN_END, p);
    line.style.opacity = String(1 - inT);
    line.style.transform = "translate(-50%,-50%) scaleX(" + (1 - inT) + ")";
    stage.style.opacity = String(Math.max(0.001, inT));

    // kicker — único texto da seção, aparece cedo e some antes da transformação
    var kickerOpacity, kickerY;
    if (p < KICKER_IN_END) {
      var kIn = smoothstep(0, KICKER_IN_END, p);
      kickerOpacity = kIn; kickerY = 10 * (1 - kIn);
    } else if (p < KICKER_HOLD_END) {
      kickerOpacity = 1; kickerY = 0;
    } else if (p < KICKER_OUT_END) {
      var kOut = smoothstep(KICKER_HOLD_END, KICKER_OUT_END, p);
      kickerOpacity = 1 - kOut; kickerY = -8 * kOut;
    } else {
      kickerOpacity = 0; kickerY = -8;
    }
    kicker.style.opacity = String(kickerOpacity);
    kicker.style.transform = "translateY(" + kickerY + "px)";

    // energia orbital — sobe na transformação do mascote, sustenta com o
    // personagem + anéis cromados, cai antes do reveal da assinatura
    var orbit;
    if (p < ORBIT_IN_START) orbit = 0;
    else if (p < ORBIT_IN_END) orbit = smoothstep(ORBIT_IN_START, ORBIT_IN_END, p);
    else if (p < ORBIT_OUT_START) orbit = 1;
    else if (p < ORBIT_OUT_END) orbit = 1 - smoothstep(ORBIT_OUT_START, ORBIT_OUT_END, p);
    else orbit = 0;
    glow.style.opacity = String(orbit * 0.5);
    window.SG.hero3dOrbitBoost = orbit;

    // logo moment — um único light sweep, reversível se o usuário voltar e passar de novo
    if (p >= SWEEP_AT && !sweepFired) {
      sweep.classList.remove("is-active");
      void sweep.offsetWidth;
      sweep.classList.add("is-active");
      sweepFired = true;
    } else if (p < SWEEP_AT - 0.02) {
      sweepFired = false;
    }

    // saída — o filme sobe e recolhe enquanto o grafite entra pelo mesmo scroll.
    if (p >= OUT_START) {
      var outT = smoothstep(OUT_START, OUT_END, p);
      scrollScale = 1 - outT * 0.62;
      finaleY = -Math.min(window.innerHeight, 1200) * 0.25 * outT;
      stage.style.opacity = String(1 - smoothstep(0.91, OUT_END, p));
    } else {
      scrollScale = 1;
      finaleY = 0;
    }
    // The last film frame remains visible as chrome/light passes into the
    // identical graffiti strokes. The color then turns blue at the boundary
    // with the following Product Universe, all in this same Identity Film.
    var reveal = smoothstep(.875, .975, p);
    var blue = smoothstep(.94, 1, p);
    var impact = smoothstep(.875, .912, p) * (1 - smoothstep(.958, .997, p));
    if (graffitiTimeline) graffitiTimeline.progress(reveal);
    if (graffitiShell) {
      section.style.setProperty("--sg-graffiti-reveal", reveal.toFixed(3));
      section.style.setProperty("--sg-graffiti-heat", (.24 + (1 - blue) * .5).toFixed(3));
      section.style.setProperty("--sg-graffiti-blue", blue.toFixed(3));
      section.style.setProperty("--sg-graffiti-light", (.48 + reveal * .48).toFixed(3));
      section.style.setProperty("--sg-graffiti-burst", impact.toFixed(3));
      section.style.setProperty("--sg-graffiti-throw", smoothstep(.895, .996, p).toFixed(3));
    }
    composeStageTransform();
  }

  hero3dST = window.ScrollTrigger.create({
    trigger: section, start: "top top", end: "bottom bottom", scrub: 0.12,
    onUpdate: function (self) { applyProgress(self.progress); }
  });

  /* ---------------- Cursor parallax (desktop, tier não-low) — profundidade, não tempo ---------------- */
  if (window.SG.perfTier !== "low" && matchMedia("(hover:hover) and (pointer:fine)").matches) {
    var mx = 0, my = 0, cx = 0, cy = 0;
    var cursorVisible = false;
    var cursorFrame = 0;
    var cursorDestroyed = false;
    var cursorMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");

    function onCursorMove(e) {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    }

    function onCursorLeave() {
      mx = 0;
      my = 0;
    }

    function cursorTick() {
      cursorFrame = 0;
      if (cursorDestroyed || !cursorVisible || document.hidden || cursorMotionQuery.matches) return;
      cx += (mx - cx) * 0.07;
      cy += (my - cy) * 0.07;
      cursorTX = cx * 10; cursorTY = cy * 8;
      cursorRY = cx * 2.4; cursorRX = -cy * 1.6;
      composeStageTransform();
      cursorFrame = requestAnimationFrame(cursorTick);
    }

    function syncCursorLoop() {
      var shouldRun = cursorVisible && !document.hidden && !cursorMotionQuery.matches;
      if (shouldRun && !cursorFrame) cursorFrame = requestAnimationFrame(cursorTick);
      if (!shouldRun && cursorFrame) { cancelAnimationFrame(cursorFrame); cursorFrame = 0; }
    }

    var cursorIo = new IntersectionObserver(function (entries) {
      cursorVisible = entries[0].isIntersecting;
      syncCursorLoop();
    }, { threshold: 0.01 });

    function teardownCursorLoop() {
      cursorDestroyed = true;
      cursorIo.disconnect();
      if (cursorFrame) cancelAnimationFrame(cursorFrame);
      section.removeEventListener("pointermove", onCursorMove);
      section.removeEventListener("pointerleave", onCursorLeave);
      document.removeEventListener("visibilitychange", syncCursorLoop);
      cursorMotionQuery.removeEventListener("change", syncCursorLoop);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    }
    function onPageHide(event) {
      if (!event.persisted) { teardownCursorLoop(); return; }
      if (cursorFrame) cancelAnimationFrame(cursorFrame);
      cursorFrame = 0;
    }
    function onPageShow(event) { if (event.persisted) syncCursorLoop(); }

    cursorIo.observe(section);
    section.addEventListener("pointermove", onCursorMove, { passive: true });
    section.addEventListener("pointerleave", onCursorLeave, { passive: true });
    document.addEventListener("visibilitychange", syncCursorLoop);
    cursorMotionQuery.addEventListener("change", syncCursorLoop);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
  }

  /* ---------------- Partículas ambiente — poeira óptica leve, sincronizada com a energia do filme ---------------- */
  if (canvas && window.SG.perfTier !== "low") {
    var ctx = canvas.getContext("2d");
    var particles = [];
    var COUNT = window.SG.perfTier === "high" ? 240 : 90;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var pw = 0, ph = 0;

    function resizeCanvas() {
      var r = canvas.getBoundingClientRect();
      pw = r.width; ph = r.height;
      canvas.width = Math.max(1, pw * dpr);
      canvas.height = Math.max(1, ph * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seedParticles() {
      particles = [];
      for (var i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * pw, y: Math.random() * ph, z: Math.random(),
          speed: 0.12 + Math.random() * 0.3, angle: Math.random() * Math.PI * 2
        });
      }
    }

    var pVisible = false, pRunning = false, pRaf = 0, particlesDestroyed = false;
    // overlay position:fixed (categoria/busca/carrinho...) cobre a tela sem
    // tirar a seção do viewport geométrico do IntersectionObserver — sem
    // esse flag o canvas continuaria desenhando escondido atrás dele
    var pOverlayOpen = document.body.classList.contains("category-page-open") || document.body.classList.contains("sg-entry-popup-open");
    window.addEventListener("sg:overlay", function (e) {
      pOverlayOpen = !!(e.detail && e.detail.open);
      syncParticleLoop();
    });
    var particleIo = new IntersectionObserver(function (entries) {
      pVisible = entries[0].isIntersecting;
      syncParticleLoop();
    }, { threshold: 0.05 });

    function syncParticleLoop() {
      var shouldRun = !particlesDestroyed && pVisible && !document.hidden && !pOverlayOpen;
      if (shouldRun && !pRunning) { pRunning = true; pRaf = requestAnimationFrame(particleTick); }
      if (!shouldRun && pRunning) { pRunning = false; if (pRaf) cancelAnimationFrame(pRaf); pRaf = 0; }
    }

    function particleTick() {
      if (!pRunning) return;
      var boost = window.SG.hero3dOrbitBoost || 0;
      ctx.clearRect(0, 0, pw, ph);
      for (var i = 0; i < particles.length; i++) {
        var pt = particles[i];
        var vel = pt.speed * (0.35 + boost * 0.85);
        pt.x += Math.cos(pt.angle) * vel;
        pt.y += Math.sin(pt.angle) * vel * 0.35 - 0.14;
        if (pt.y < -10) { pt.y = ph + 10; pt.x = Math.random() * pw; }
        if (pt.x < -10) pt.x = pw + 10;
        if (pt.x > pw + 10) pt.x = -10;
        var size = 0.6 + pt.z * 1.6;
        var alpha = (0.1 + pt.z * 0.26) * (0.55 + boost * 0.55);
        ctx.beginPath();
        ctx.fillStyle = "rgba(255," + (140 + Math.round(pt.z * 55)) + ",60," + alpha.toFixed(3) + ")";
        ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      pRaf = requestAnimationFrame(particleTick);
    }

    function onParticleResize() {
      resizeCanvas();
      seedParticles();
    }

    function teardownParticles() {
      particlesDestroyed = true;
      pRunning = false;
      particleIo.disconnect();
      if (pRaf) cancelAnimationFrame(pRaf);
      pRaf = 0;
      window.removeEventListener("resize", onParticleResize);
      document.removeEventListener("visibilitychange", syncParticleLoop);
      window.removeEventListener("pagehide", onParticlePageHide);
      window.removeEventListener("pageshow", onParticlePageShow);
    }

    function onParticlePageHide(event) {
      if (!event.persisted) { teardownParticles(); return; }
      pRunning = false;
      if (pRaf) cancelAnimationFrame(pRaf);
      pRaf = 0;
    }

    function onParticlePageShow(event) {
      if (event.persisted) syncParticleLoop();
    }

    window.addEventListener("resize", onParticleResize, { passive: true });
    resizeCanvas();
    seedParticles();
    particleIo.observe(sticky);
    document.addEventListener("visibilitychange", syncParticleLoop);
    window.addEventListener("pagehide", onParticlePageHide);
    window.addEventListener("pageshow", onParticlePageShow);
  }
})();

export {};
