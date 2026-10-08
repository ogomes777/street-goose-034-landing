/* Street Goose 034 — a lupa flutuante continua viva depois do Scroll Film.
   Camada fixed independente, escala/posição vêm de UMA timeline pausada
   tocada pelo progress de UM ScrollTrigger — nunca disputa com o cursor,
   nunca bloqueia clique (pointer-events:none o tempo todo). */
(function () {
  "use strict";

  var el = document.querySelector("[data-drift-product]");
  var startTrigger = document.querySelector(".featured-drop");
  var endTrigger = document.querySelector(".orbit-stage");
  if (!el || !startTrigger || !endTrigger) return;

  var reduced = window.SG.prefersReducedMotion();
  var canRun = window.SG.hasGSAP && window.ScrollTrigger && !reduced && window.SG.perfTier !== "low";
  if (!canRun) return;

  var gsap = window.gsap;
  gsap.set(el, { xPercent: -50, yPercent: -50 });

  // Trajetória: entra depois do Scroll Film, atravessa Featured Drop e a
  // Coleção, some antes do Product Orbit laranja. Opacidade cai exatamente
  // nos pontos onde o caminho cruza copy densa (drop-copy e section-head),
  // pra leitura nunca ficar comprometida.
  var tl = gsap.timeline({ paused: true })
    .fromTo(el, { x: "72vw", y: "22vh", scale: 0.4, rotation: 10, autoAlpha: 0 },
      { x: "58vw", y: "6vh", scale: 0.72, rotation: 3, autoAlpha: 0.88, duration: 0.07, ease: "power2.out" }, 0)
    .to(el, { x: "18vw", y: "-9vh", scale: 0.85, rotation: -4, autoAlpha: 0.28, duration: 0.11, ease: "sine.inOut" }, 0.07)
    .to(el, { x: "64vw", y: "2vh", scale: 0.8, rotation: 2, autoAlpha: 0.78, duration: 0.11, ease: "sine.inOut" }, 0.22)
    .to(el, { x: "-12vw", y: "-14vh", scale: 0.66, rotation: 6, autoAlpha: 0.25, duration: 0.11, ease: "sine.inOut" }, 0.36)
    .to(el, { x: "48vw", y: "8vh", scale: 0.9, rotation: -2, autoAlpha: 0.72, duration: 0.12, ease: "sine.inOut" }, 0.5)
    .to(el, { x: "2vw", y: "-6vh", scale: 0.75, rotation: -5, autoAlpha: 0.5, duration: 0.13, ease: "sine.inOut" }, 0.65)
    .to(el, { x: "68vw", y: "10vh", scale: 0.85, rotation: 4, autoAlpha: 0.55, duration: 0.13, ease: "sine.inOut" }, 0.79)
    .to(el, { x: "30vw", y: "0vh", scale: 0.5, rotation: 9, autoAlpha: 0.2, duration: 0.1, ease: "power1.in" }, 0.9)
    .to(el, { x: "10vw", y: "-4vh", scale: 0.28, rotation: 14, autoAlpha: 0, duration: 0.06, ease: "power2.in" }, 1.0);

  var img = el.querySelector(".drift-img");
  var cursorQuery = matchMedia("(hover:hover) and (pointer:fine)");
  var cursorMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  var cursorActive = false;
  var cursorFrame = 0;
  var cursorDestroyed = false;
  var mx = 0, my = 0, cx = 0, cy = 0;

  function cursorTick() {
    cursorFrame = 0;
    if (cursorDestroyed || !cursorActive || document.hidden || cursorMotionQuery.matches) return;
    cx += (mx - cx) * 0.05;
    cy += (my - cy) * 0.05;
    img.style.transform = "translate(" + (cx * 16) + "px," + (cy * 12) + "px)";
    cursorFrame = requestAnimationFrame(cursorTick);
  }

  function syncCursorLoop() {
    var shouldRun = cursorQuery.matches && !!img && cursorActive && !document.hidden && !cursorMotionQuery.matches;
    if (shouldRun && !cursorFrame) cursorFrame = requestAnimationFrame(cursorTick);
    if (!shouldRun && cursorFrame) {
      cancelAnimationFrame(cursorFrame);
      cursorFrame = 0;
    }
  }

  function onCursorMove(e) {
    if (!cursorActive) return;
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  }

  function teardownCursorLoop() {
    cursorDestroyed = true;
    if (cursorFrame) cancelAnimationFrame(cursorFrame);
    window.removeEventListener("pointermove", onCursorMove);
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

  var driftST = window.ScrollTrigger.create({
    trigger: startTrigger, start: "top bottom",
    endTrigger: endTrigger, end: "top center",
    scrub: 0.25,
    onUpdate: function (self) { tl.progress(self.progress); },
    onToggle: function (self) {
      cursorActive = self.isActive;
      syncCursorLoop();
    }
  });

  /* cursor: micro deslocamento independente no PNG, nunca no wrapper que a
     timeline controla — as duas camadas nunca disputam a mesma propriedade */
  if (cursorQuery.matches && img) {
    cursorActive = driftST.isActive;
    window.addEventListener("pointermove", onCursorMove, { passive: true });
    document.addEventListener("visibilitychange", syncCursorLoop);
    cursorMotionQuery.addEventListener("change", syncCursorLoop);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    syncCursorLoop();
  }
})();

export {};
