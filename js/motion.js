/* Street Goose 034 — motion tokens + globals compartilhados */
(function () {
  "use strict";

  var reduceMotionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  window.SG = window.SG || {};
  window.SG.motion = { fast: 0.28, base: 0.6, slow: 1.1, cinematic: 1.6, easeOut: "power3.out", easeInOut: "power2.inOut" };
  window.SG.prefersReducedMotion = function () { return !!(reduceMotionQuery && reduceMotionQuery.matches); };

  /* Capability tier from real signals, not "is it a phone":
     - low:    turns off decorative WebGL scenes (static/CSS versions instead);
     - medium: scenes run with less density and resolution;
     - high:   everything.
     A modern phone lands in medium/high; old phones, low-memory devices,
     data saver and 2G land in low (weak GPUs are caught in idle time). "?perf=low|medium|high" forces
     a tier for testing. js/perf-guard.js can still drop to low at runtime if
     the device stutters for real. */
  window.SG.perfTier = (function () {
    var forced = /[?&]perf=(low|medium|high)\b/.exec(location.search);
    if (forced) return forced[1];
    if (window.SG.prefersReducedMotion()) return "low";
    var nav = navigator, score = 0;
    var cores = nav.hardwareConcurrency || 4;
    var mem = nav.deviceMemory; // Chromium only
    var conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    var ua = nav.userAgent || "";
    if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ""))) return "low";
    if (mem && mem <= 2) return "low";
    if (cores <= 2) return "low";
    var ios = /OS (\d+)_\d+(?:_\d+)? like Mac OS X/.exec(ua);
    if (ios && Number(ios[1]) < 15) return "low";
    // The GPU is read later, in idle time (js/perf-guard.js): creating a
    // context here would block the first paint on exactly the weak devices.
    // ~2–4 ms on a current phone, 15+ ms on an entry-level one. Best of three
    // short runs (one GC pause must not condemn a good phone), and no property
    // lookups inside the timed loop: the production obfuscator rewrites
    // `Math.sqrt` into a string-array call, which measured the obfuscator
    // (31 ms on a desktop) instead of the device.
    var sqrt = Math.sqrt, now = performance.now.bind(performance), x = 0, bench = Infinity;
    for (var run = 0; run < 3; run++) {
      var t0 = now();
      for (var i = 0; i < 100000; i++) x += sqrt(i) * 1.0001;
      bench = Math.min(bench, (now() - t0) * 3);
    }
    window.SG.perfBench = x > 0 ? Math.round(bench * 10) / 10 : 0;
    if (bench > 22) return "low";
    if (bench > 9) score -= 1;
    if (cores <= 4) score -= 1;
    if (mem && mem <= 4) score -= 1;
    if (conn && conn.effectiveType === "3g") score -= 1;
    if (window.innerWidth < 720) score -= 1;
    return score <= -3 ? "low" : score <= -1 ? "medium" : "high";
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
