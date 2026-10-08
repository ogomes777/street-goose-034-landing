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
  if (!section || !product || !window.SG || !window.SG.hasGSAP || !window.ScrollTrigger) return;

  var gsap = window.gsap;
  var reducedMotion = window.SG.prefersReducedMotion();
  var isDesktop = window.innerWidth > 900;
  var isPointerFine = window.SG.perfTier !== "low" && matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* ---------------- Entrada ---------------- */
  if (reducedMotion) {
    gsap.set(product, { opacity: 1, scale: 1, y: 0, rotateX: 0, filter: "blur(0px)" });
  } else {
    gsap.set(product, { opacity: 0, scale: 0.72, y: 62, rotateX: 6, filter: "blur(14px)", transformPerspective: 800 });

    var entrance = gsap.timeline({
      scrollTrigger: { trigger: section, start: "top 75%", once: true },
      onComplete: startIdle
    });
    entrance.to(product, {
      opacity: 1, scale: 1, y: 0, rotateX: 0, filter: "blur(0px)",
      duration: isDesktop ? 1.15 : 0.95, ease: "power3.out"
    });
  }

  /* ---------------- Idle: flutuação + reflexo periódico ---------------- */
  var idleTimeline = null;
  function startIdle() {
    if (reducedMotion) return;
    var amp = isDesktop ? 9 : 5;
    idleTimeline = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } });
    idleTimeline.to(product, { y: amp, rotateX: isDesktop ? 1.2 : 0, duration: 3.6 });

    if (window.SG.perfTier !== "low") {
      var sweep = section.querySelector(".final-act-sweep");
      if (sweep) {
        gsap.set(sweep, { xPercent: -40, opacity: 0 });
        gsap.timeline({ repeat: -1, repeatDelay: 4.5 })
          .to(sweep, { opacity: 1, duration: 0.4, ease: "power1.out" })
          .to(sweep, { xPercent: 220, duration: 1.7, ease: "power2.inOut" }, "<")
          .to(sweep, { opacity: 0, duration: 0.5 }, "-=0.4");
      }
    }
  }

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
  addEventListener("pagehide", function () {
    if (idleTimeline) idleTimeline.kill();
  }, { once: true });
})();

export {};
