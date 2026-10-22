/* Street Goose 034 — capítulo "A rua muda. O olhar também.": entrada
   cinematográfica do produto (PNG 2D real), flutuação idle, reflexo
   periódico e parallax de cursor/scroll. O túnel óptico 3D de fundo vive à
   parte em final-act-scene.js (Three.js, via webgl-director) — este arquivo
   cuida só do produto em si, sempre em HTML/CSS/GSAP. Como é uma imagem
   plana, a rotação fica travada em ±5-6° pra nunca revelar que não é um
   objeto 3D de verdade — a profundidade de verdade mora no cenário, na
   câmera, na luz e nas partículas do túnel, não no produto. */
(function () {
  "use strict";

  var section = document.querySelector("[data-final-act]");
  var product = document.querySelector("[data-final-act-product]");
  // Same pixels as the PNG at a fifth of the weight; browsers without WebP
  // (iOS < 14) fall back to the original file.
  if (product) {
    var productFallback = new URL("../assets/lupa-animacao-png.png", import.meta.url).href;
    product.addEventListener("error", function () {
      if (product.src !== productFallback) product.src = productFallback;
    }, { once: true });
  }
  if (!section || !product || !window.SG || !window.SG.hasGSAP || !window.ScrollTrigger) return;

  var gsap = window.gsap;
  var reducedMotion = window.SG.prefersReducedMotion();
  var isDesktop = window.innerWidth > 900;
  var lowTier = window.SG.perfTier === "low";
  var isPointerFine = window.SG.perfTier !== "low" && matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* ---------------- Entrada ---------------- */
  if (reducedMotion) {
    gsap.set(product, { opacity: 1, scale: 1, y: 0, rotateX: 0, filter: "blur(0px)" });
  } else {
    // Never animate CSS blur on low-end phones. It forces a raster repaint
    // on every frame during scroll and can stall Safari's media compositor.
    gsap.set(product, isDesktop && !lowTier ?
      { opacity: 0, scale: 0.72, y: 62, rotateX: 6, filter: "blur(7px)", transformPerspective: 800 } :
      { opacity: 0, scale: 0.78, y: 26, rotateX: 0, transformPerspective: 800 });

    var entrance = gsap.timeline({
      scrollTrigger: { trigger: section, start: "top 75%", once: true },
      onComplete: startIdle
    });
    entrance.to(product, Object.assign({
      opacity: 1, scale: 1, y: 0, rotateX: 0,
      duration: isDesktop ? 1.15 : 0.82, ease: "power3.out",
      clearProps: "willChange"
    }, isDesktop && !lowTier ? { filter: "blur(0px)" } : {}));
  }

  /* ---------------- Idle: flutuação + reflexo periódico ---------------- */
  var idleTimeline = null, sweepTimeline = null, sectionVisible = true;
  function startIdle() {
    if (reducedMotion) return;
    var amp = isDesktop ? 9 : 5;
    idleTimeline = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } });
    idleTimeline.to(product, { y: amp, rotateX: isDesktop ? 1.2 : 0, duration: 3.6 });

    if (window.SG.perfTier !== "low") {
      var sweep = section.querySelector(".final-act-sweep");
      if (sweep) {
        gsap.set(sweep, { xPercent: -40, opacity: 0 });
        sweepTimeline = gsap.timeline({ repeat: -1, repeatDelay: 4.5 })
          .to(sweep, { opacity: 1, duration: 0.4, ease: "power1.out" })
          .to(sweep, { xPercent: 220, duration: 1.7, ease: "power2.inOut" }, "<")
          .to(sweep, { opacity: 0, duration: 0.5 }, "-=0.4");
      }
    }
    syncLoops();
  }

  // The endless float and light sweep only run while the chapter is on
  // screen; elsewhere they would keep the animation ticker busy for nothing
  // during every scroll of the page.
  function syncLoops() {
    var run = sectionVisible && !document.hidden;
    [idleTimeline, sweepTimeline].forEach(function (tl) {
      if (tl) { if (run) tl.resume(); else tl.pause(); }
    });
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      sectionVisible = entries[0].isIntersecting;
      syncLoops();
    }, { rootMargin: "100px 0px" }).observe(section);
  }
  document.addEventListener("visibilitychange", syncLoops);

  /* ---------------- Parallax de cursor (desktop, ponteiro fino) — rotação
     travada em ±4°/±3° pra nunca passar de ~5-6° combinado com o idle ---------------- */
  if (isPointerFine && !reducedMotion) {
    var quickRotY = gsap.quickTo(product, "rotateY", { duration: 0.6, ease: "power3.out" });
    var quickRotX = gsap.quickTo(product, "rotateX", { duration: 0.6, ease: "power3.out" });
    var onPointerMove = function (e) {
      var r = section.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      quickRotY(nx * 4);
      quickRotX(ny * -3);
    };
    var onPointerLeave = function () { quickRotY(0); quickRotX(0); };
    section.addEventListener("pointermove", onPointerMove);
    section.addEventListener("pointerleave", onPointerLeave);
  }

  /* ---------------- Limpeza ---------------- */
  // A Safari BFCache restore reuses this DOM and these GSAP timelines.
  // Killing on every pagehide left the foreground picture motionless.
  addEventListener("pagehide", function (event) {
    if (event.persisted) {
      if (idleTimeline) idleTimeline.pause();
      if (sweepTimeline) sweepTimeline.pause();
      return;
    }
    if (idleTimeline) idleTimeline.kill();
    if (sweepTimeline) sweepTimeline.kill();
  });
  addEventListener("pageshow", function (event) {
    if (event.persisted) syncLoops();
  });
})();

export {};
