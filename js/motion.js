/* Street Goose 034 — motion tokens + globals compartilhados */
(function () {
  "use strict";

  var reduceMotionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  window.SG = window.SG || {};
  window.SG.motion = { fast: 0.28, base: 0.6, slow: 1.1, cinematic: 1.6, easeOut: "power3.out", easeInOut: "power2.inOut" };
  window.SG.prefersReducedMotion = function () { return !!(reduceMotionQuery && reduceMotionQuery.matches); };

  window.SG.perfTier = (function () {
    var cores = navigator.hardwareConcurrency || 4;
    var mem = navigator.deviceMemory || 4;
    var narrow = window.innerWidth < 720;
    if (window.SG.prefersReducedMotion()) return "low";
    if (cores <= 4 && (mem && mem <= 4) && narrow) return "low";
    if (narrow || cores <= 4) return "medium";
    return "high";
  })();

  window.SG.hasGSAP = typeof window.gsap !== "undefined";
  if (window.SG.hasGSAP && window.gsap.registerPlugin && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    // a barra de endereço do navegador mobile encolhe/expande durante o
    // scroll, disparando resize no meio do gesto — sem isso o ScrollTrigger
    // recalcula start/end nesse momento e o progresso salta/inverte (jitter
    // clássico em iOS/Android, é a causa nº1 documentada pelo próprio GSAP)
    window.ScrollTrigger.config({ ignoreMobileResize: true });
  }

  document.documentElement.classList.add(window.SG.prefersReducedMotion() ? "sg-reduced-motion" : "sg-motion-ok");
  document.documentElement.classList.add("sg-perf-" + window.SG.perfTier);
})();

export {};
