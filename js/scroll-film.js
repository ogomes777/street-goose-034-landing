/* Street Goose 034 — Scroll Film + Floating Product
   O scroll controla o tempo do vídeo (fase 1) e depois a jornada do produto
   flutuante (fase 2). Tudo reversível: rolar pra cima desfaz tudo, sempre
   derivado de scroll progress — nunca de animações "on enter" irreversíveis. */
(function () {
  "use strict";

  var section = document.querySelector("[data-scroll-film]");
  if (!section) return;

  var video = section.querySelector("[data-film-video]");
  var scrim = section.querySelector("[data-film-scrim]");
  var lensGlow = section.querySelector("[data-film-lens-glow]");
  var canvas = section.querySelector("[data-film-canvas]");
  var productWrap = section.querySelector("[data-film-product-wrap]");
  var productImg = section.querySelector("[data-film-product]");
  var copyEl = section.querySelector("[data-film-copy]");
  var chapterEl = section.querySelector("[data-film-chapter]");
  var headingEl = section.querySelector("h2", copyEl);

  var reduced = window.SG.prefersReducedMotion();
  var canScrub = window.SG.hasGSAP && window.ScrollTrigger && !reduced;

  var CHAPTERS = [
    { at: 0, index: "CAPÍTULO 01", heading: "Presença<br>começa no detalhe." },
    { at: 0.34, index: "CAPÍTULO 02", heading: "Chrome.<br>Lente gelo. Visão." },
    { at: 0.68, index: "CAPÍTULO 03", heading: "Feita pra entrar<br>no visual inteiro." }
  ];

  function setChapter(local) {
    var current = CHAPTERS[0];
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (local >= CHAPTERS[i].at) current = CHAPTERS[i];
    }
    if (chapterEl.textContent !== current.index) {
      chapterEl.textContent = current.index;
      headingEl.innerHTML = current.heading;
    }
  }

  /* ---------------- Fallback estático: reduced motion / sem GSAP ---------------- */
  if (!canScrub) {
    section.classList.add("scroll-film--static");
    productImg.style.opacity = "1";
    if (video) video.setAttribute("preload", "none");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { section.classList.add("is-visible"); io.unobserve(e.target); }
        });
      }, { threshold: 0.15 });
      io.observe(section);
    } else {
      section.classList.add("is-visible");
    }
    return;
  }

  /* ---------------- Preload antecipado do vídeo (1-2 viewports antes) ---------------- */
  var videoReady = false;
  var filmST = null;
  var duration = 0;
  function startPreload() {
    if (!video || video.getAttribute("preload") === "auto") return;
    video.setAttribute("preload", "auto");
    video.load();
  }
  video.addEventListener("loadedmetadata", function () {
    duration = video.duration || 0;
    videoReady = true;
    // se o usuário já parou de rolar exatamente aqui, o vídeo não pode ficar
    // travado no frame 0 esperando o próximo evento de scroll — reaplica agora
    if (filmST) applyProgress(filmST.progress);
  });
  if ("IntersectionObserver" in window) {
    var preloadIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { startPreload(); preloadIo.disconnect(); } });
    }, { rootMargin: "150% 0px 150% 0px" });
    preloadIo.observe(section);
  } else {
    startPreload();
  }

  /* ---------------- Jornada do produto (timeline pausada, tocada via progress) ---------------- */
  var productTl = window.gsap.timeline({ paused: true })
    .fromTo(productWrap, { autoAlpha: 0, scale: 0.55, xPercent: 0, yPercent: 6, rotate: 0 },
      { autoAlpha: 1, scale: 1, yPercent: 0, duration: 0.16, ease: "power2.out" }, 0)
    .to(productWrap, { xPercent: 16, rotate: 5, duration: 0.19, ease: "sine.inOut" }, 0.16)
    .to(productWrap, { xPercent: -15, yPercent: -7, rotate: -4, duration: 0.19, ease: "sine.inOut" }, 0.35)
    .to(productWrap, { xPercent: 0, yPercent: 0, scale: 1.16, rotate: 3, duration: 0.19, ease: "sine.inOut" }, 0.54)
    .to(productWrap, { scale: 1, rotate: 0, duration: 0.15, ease: "sine.inOut" }, 0.73)
    .to(productWrap, { scale: 2.1, autoAlpha: 0, duration: 0.12, ease: "power2.in" }, 0.88);

  var VIDEO_END = 0.55, TRANS_END = 0.68;

  function applyProgress(p) {
    if (videoReady && p <= VIDEO_END) {
      var t = (p / VIDEO_END) * duration;
      if (isFinite(t)) video.currentTime = Math.max(0, Math.min(duration, t));
    }

    if (p <= VIDEO_END) {
      video.style.opacity = "1";
      scrim.style.opacity = String(0.35 + (p / VIDEO_END) * 0.15);
      canvas.style.opacity = "0";
      lensGlow.style.opacity = "0";
      productTl.progress(0);
      setChapter(0);
    } else if (p <= TRANS_END) {
      var localT = (p - VIDEO_END) / (TRANS_END - VIDEO_END);
      video.style.opacity = String(1 - localT);
      scrim.style.opacity = String(0.5 + localT * 0.4);
      canvas.style.opacity = String(localT);
      // a lente do vídeo "acende" e vira a lente do produto: brilho azul que
      // nasce e desaparece no meio da transição, servindo de ponte visual
      lensGlow.style.opacity = String(Math.sin(localT * Math.PI) * 0.85);
      productTl.progress(localT * 0.16);
      setChapter(0);
    } else {
      var localP = (p - TRANS_END) / (1 - TRANS_END);
      video.style.opacity = "0";
      scrim.style.opacity = "0.9";
      canvas.style.opacity = "1";
      lensGlow.style.opacity = "0";
      productTl.progress(0.16 + localP * 0.84);
      setChapter(localP);
    }
  }

  // scrub baixo = resposta quase imediata ao scroll, com micro suavização só
  // o suficiente pra tirar o serrilhado do wheel/trackpad. Única fonte de
  // verdade: scrollProgress -> applyProgress -> currentTime/timeline/opacity.
  filmST = window.ScrollTrigger.create({
    trigger: section, start: "top top", end: "bottom bottom", scrub: 0.18,
    onUpdate: function (self) { applyProgress(self.progress); }
  });

  /* ---------------- Cursor parallax (desktop, tier não-low) ---------------- */
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

    function cursorTick() {
      cursorFrame = 0;
      if (cursorDestroyed || !cursorVisible || document.hidden || cursorMotionQuery.matches) return;
      cx += (mx - cx) * 0.09;
      cy += (my - cy) * 0.09;
      // scroll é o movimento principal (no wrap); cursor é micro profundidade
      // (no próprio produto): ~20px de deslocamento + rotação bem pequena
      productImg.style.transform =
        "translate(" + (cx * 20) + "px," + (cy * 14) + "px) rotateY(" + (cx * 5) + "deg) rotateX(" + (-cy * 3.5) + "deg)";
      cursorFrame = requestAnimationFrame(cursorTick);
    }

    function syncCursorLoop() {
      var shouldRun = cursorVisible && !document.hidden && !cursorMotionQuery.matches;
      if (shouldRun && !cursorFrame) cursorFrame = requestAnimationFrame(cursorTick);
      if (!shouldRun && cursorFrame) {
        cancelAnimationFrame(cursorFrame);
        cursorFrame = 0;
      }
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
      document.removeEventListener("visibilitychange", syncCursorLoop);
      cursorMotionQuery.removeEventListener("change", syncCursorLoop);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    }

    function onPageHide(event) {
      if (!event.persisted) {
        teardownCursorLoop();
        return;
      }
      if (cursorFrame) cancelAnimationFrame(cursorFrame);
      cursorFrame = 0;
    }

    function onPageShow(event) {
      if (event.persisted) syncCursorLoop();
    }

    cursorIo.observe(section);
    section.addEventListener("pointermove", onCursorMove, { passive: true });
    document.addEventListener("visibilitychange", syncCursorLoop);
    cursorMotionQuery.addEventListener("change", syncCursorLoop);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
  }
})();

export {};
