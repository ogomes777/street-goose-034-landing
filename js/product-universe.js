/* Street Goose 034 — Product Universe.
   Palco cinematográfico com os 7 PNGs soltos na raiz de assets/ (não as 5
   categorias — isso vive na seção separada .category-portals). Mesma
   arquitetura de scroll-film.js / hero3d-film.js: CSS sticky + ScrollTrigger
   scrub como única fonte de verdade. O progresso do scroll escolhe o produto
   ativo; botões/teclado/swipe apenas movem a posição de scroll pro índice
   alvo — nunca existe um segundo estado de índice competindo com o scroll.
   NOTA: "shorts-oakley-png" não existe no projeto (confirmado por busca
   recursiva) — o 7º PNG solto real é quartz-oakley-png.png (relógio). */
import chapeuImg from "../assets/chapeu-oakley-png.png";
import coleteImg from "../assets/colete-oakley-png.png";
import lupaImg from "../assets/lupa-animacao-png.png";
import mochilaImg from "../assets/mochila-oakley-png.png";
import moletomImg from "../assets/moletom-animacao-png.png";
import perfumeImg from "../assets/perfume-animacao-png.png";
import quartzImg from "../assets/quartz-oakley-png.png";

(function () {
  "use strict";

  var section = document.querySelector("[data-universe-stage]");
  if (!section) return;

  var UNIVERSE_ITEMS = [
    { key: "chapeu", label: "ACESSÓRIOS", name: "Chapéu Oakley", image: chapeuImg, a: "#2463c9", b: "#050b18", particle: "#7fb2ff" },
    { key: "colete", label: "TRAJES", name: "Colete Oakley", image: coleteImg, a: "#c24a0f", b: "#120600", particle: "#ffab5e" },
    { key: "lupa", label: "LUPAS", name: "Lupa Street Goose", image: lupaImg, a: "#0f6fe0", b: "#020a18", particle: "#8fe0ff" },
    { key: "mochila", label: "ACESSÓRIOS", name: "Mochila Oakley", image: mochilaImg, a: "#12327a", b: "#03060f", particle: "#a9c4ff" },
    { key: "moletom", label: "TRAJES", name: "Moletom Street Goose", image: moletomImg, a: "#c2410f", b: "#120500", particle: "#ff8c42", scale: 1.14 },
    { key: "perfume", label: "PERFUMES", name: "Perfume Maahir Legacy", image: perfumeImg, a: "#d4520f", b: "#150500", particle: "#ffc98f" },
    { key: "quartz", label: "RELÓGIOS", name: "Relógio Quartz Oakley", image: quartzImg, a: "#3d6fb8", b: "#04101f", particle: "#cfe4ff" }
  ];

  var sticky = section.querySelector(".universe-sticky");
  var ghost = section.querySelector("[data-universe-ghost]");
  var slots = {
    back: section.querySelector('[data-universe-slot="back"] img'),
    left: section.querySelector('[data-universe-slot="left"] img'),
    center: section.querySelector('[data-universe-slot="center"] img'),
    right: section.querySelector('[data-universe-slot="right"] img')
  };
  var nameEl = section.querySelector("[data-universe-name]");
  var countEl = section.querySelector("[data-universe-count]");
  var prevBtn = section.querySelector("[data-universe-prev]");
  var nextBtn = section.querySelector("[data-universe-next]");
  var particleCanvas = section.querySelector("[data-universe-particles]");

  // preload de todas as imagens do palco
  UNIVERSE_ITEMS.forEach(function (item) {
    var img = new Image();
    img.src = item.image;
  });

  var N = UNIVERSE_ITEMS.length;
  function norm(i) { return ((i % N) + N) % N; }
  function itemAt(i) { return UNIVERSE_ITEMS[norm(i)]; }

  var activeIndex = -1; // sentinela pra forçar o primeiro render(0) a rodar de verdade
  var currentA = UNIVERSE_ITEMS[0].a, currentB = UNIVERSE_ITEMS[0].b, currentParticle = UNIVERSE_ITEMS[0].particle;

  function setSlot(el, item) {
    el.src = item.image;
    el.alt = item.name;
    el.style.transform = "scale(" + (item.scale || 1) + ")";
  }

  function render(index) {
    // scrub dispara onUpdate a cada micro-variação de progresso, mas index
    // quantiza pra inteiro — sem essa guarda, o mesmo índice reescrevia 4
    // <img src>, 2 textos e 2 custom properties dezenas de vezes por segundo
    // durante um scroll rápido no mobile, só pra produzir o mesmo resultado
    // (essa era a causa real do travamento: trabalho de DOM redundante, não
    // falta de otimização visual)
    if (index === activeIndex) return;
    activeIndex = index;
    var center = itemAt(index);
    setSlot(slots.back, itemAt(index + 2));
    setSlot(slots.left, itemAt(index - 1));
    setSlot(slots.center, center);
    setSlot(slots.right, itemAt(index + 1));

    if (ghost.textContent !== center.label) ghost.textContent = center.label;

    nameEl.textContent = center.name;
    countEl.textContent = String(norm(index) + 1).padStart(2, "0") + " / " + String(N).padStart(2, "0");

    sticky.style.setProperty("--universe-bg-a", center.a);
    sticky.style.setProperty("--universe-bg-b", center.b);
    currentA = center.a; currentB = center.b; currentParticle = center.particle;
  }
  render(0);

  /* ---------------- Partículas (canvas 2D leve — glow de fundo por categoria) ---------------- */
  var particleFrame = 0;
  var particleDots = [];
  var particleCtx = null;
  var particlesDestroyed = false;
  if (particleCanvas && window.SG.perfTier !== "low" && !window.SG.prefersReducedMotion()) {
    particleCtx = particleCanvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    function resizeParticles() {
      var r = section.getBoundingClientRect();
      particleCanvas.width = window.innerWidth * dpr;
      particleCanvas.height = window.innerHeight * dpr;
      particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeParticles();

    var DOT_COUNT = 46;
    for (var i = 0; i < DOT_COUNT; i++) {
      particleDots.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.6 + Math.random() * 1.6,
        vy: 0.06 + Math.random() * 0.14,
        drift: (Math.random() - 0.5) * 0.06,
        alpha: 0.15 + Math.random() * 0.35
      });
    }

    var particlesVisible = false;
    // overlay position:fixed (categoria/busca/carrinho...) cobre a tela sem
    // tirar a seção do viewport geométrico — sem esse flag o canvas
    // continuaria desenhando escondido atrás, competindo com o vídeo em scrub
    var overlayOpen = document.body.classList.contains("category-page-open");
    window.addEventListener("sg:overlay", function (e) {
      overlayOpen = !!(e.detail && e.detail.open);
      if (!overlayOpen && particlesVisible && !particleFrame) particleFrame = requestAnimationFrame(tickParticles);
    });
    function tickParticles() {
      particleFrame = 0;
      if (particlesDestroyed || !particlesVisible || document.hidden || overlayOpen) return;
      var w = window.innerWidth, h = window.innerHeight;
      particleCtx.clearRect(0, 0, w, h);
      particleCtx.fillStyle = currentParticle;
      for (var j = 0; j < particleDots.length; j++) {
        var d = particleDots[j];
        d.y -= d.vy;
        d.x += d.drift;
        if (d.y < -10) { d.y = h + 10; d.x = Math.random() * w; }
        if (d.x < -10) d.x = w + 10;
        if (d.x > w + 10) d.x = -10;
        particleCtx.globalAlpha = d.alpha;
        particleCtx.beginPath();
        particleCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        particleCtx.fill();
      }
      particleCtx.globalAlpha = 1;
      particleFrame = requestAnimationFrame(tickParticles);
    }

    var particlesIo = new IntersectionObserver(function (entries) {
      particlesVisible = entries[0].isIntersecting;
      if (particlesVisible && !particleFrame) particleFrame = requestAnimationFrame(tickParticles);
      else if (!particlesVisible && particleFrame) { cancelAnimationFrame(particleFrame); particleFrame = 0; }
    }, { threshold: 0.01 });
    particlesIo.observe(section);

    var resizeHandler = function () { resizeParticles(); };
    window.addEventListener("resize", resizeHandler);

    window.addEventListener("pagehide", function teardownParticles() {
      particlesDestroyed = true;
      particlesIo.disconnect();
      window.removeEventListener("resize", resizeHandler);
      if (particleFrame) cancelAnimationFrame(particleFrame);
    });
  }

  var reduced = window.SG.prefersReducedMotion();
  var canScrub = window.SG.hasGSAP && window.ScrollTrigger && !reduced;

  /* ---------------- Fallback estático: reduced motion / sem GSAP ---------------- */
  if (!canScrub) {
    section.classList.add("universe-stage--static");
    prevBtn.addEventListener("click", function () { render(norm(activeIndex - 1)); });
    nextBtn.addEventListener("click", function () { render(norm(activeIndex + 1)); });
    return;
  }

  var universeST = null;
  function sectionRange() {
    var top = section.offsetTop;
    var height = section.offsetHeight;
    var vh = window.innerHeight;
    return { top: top, distance: Math.max(1, height - vh) };
  }

  function indexFromProgress(p) {
    return Math.round(p * (N - 1));
  }

  universeST = window.ScrollTrigger.create({
    trigger: section, start: "top top", end: "bottom bottom", scrub: 0.15,
    onUpdate: function (self) { render(indexFromProgress(self.progress)); }
  });

  // botões/teclado/swipe só movem a posição de scroll — o ScrollTrigger acima
  // continua sendo a única fonte de verdade do índice ativo
  var navLocked = false;
  function goToIndex(i) {
    if (navLocked) return;
    navLocked = true;
    setTimeout(function () { navLocked = false; }, 650);
    var target = norm(i);
    render(target); // resposta otimista imediata
    var range = sectionRange();
    var y = range.top + (N > 1 ? target / (N - 1) : 0) * range.distance;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  prevBtn.addEventListener("click", function () { goToIndex(activeIndex - 1); });
  nextBtn.addEventListener("click", function () { goToIndex(activeIndex + 1); });

  // teclado só responde enquanto a seção está em foco/visível — nunca sequestra
  // as setas do resto da página
  var sectionInView = false;
  var keyIo = new IntersectionObserver(function (entries) {
    sectionInView = entries[0].isIntersecting;
  }, { threshold: 0 });
  keyIo.observe(section);

  document.addEventListener("keydown", function (e) {
    if (!sectionInView) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); goToIndex(activeIndex - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); goToIndex(activeIndex + 1); }
  });

  // swipe — não intercepta scroll vertical, só reage a gesto horizontal claro.
  // dx/dy sozinho não bastava: um scroll vertical normal no mobile quase
  // sempre carrega algum componente horizontal (a mão descreve um arco leve),
  // e isso bastava pra passar no teste de proporção e disparar goToIndex()
  // -> window.scrollTo() no meio de uma rolagem que o usuário nem pediu —
  // essa é a causa real do "toque fantasma" nesta seção. Agora, se a página
  // realmente rolou durante o gesto (scrollY mudou), tratamos como scroll
  // vertical de verdade e ignoramos a leitura horizontal por completo.
  var touchStartX = 0, touchStartY = 0, touchStartScrollY = 0, touchActive = false;
  var track = section.querySelector(".universe-track");
  track.addEventListener("touchstart", function (e) {
    if (!e.touches.length) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartScrollY = window.scrollY;
    touchActive = true;
  }, { passive: true });
  track.addEventListener("touchend", function (e) {
    if (!touchActive) return;
    touchActive = false;
    var touch = e.changedTouches[0];
    if (!touch) return;
    if (Math.abs(window.scrollY - touchStartScrollY) > 8) return; // a página já rolou de verdade — é scroll, não swipe
    var dx = touch.clientX - touchStartX;
    var dy = touch.clientY - touchStartY;
    if (Math.abs(dx) > 46 && Math.abs(dy) < 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      goToIndex(activeIndex + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });

  /* ---------------- Parallax de pointer (desktop) — profundidade, não navegação ---------------- */
  if (window.SG.perfTier !== "low" && matchMedia("(hover:hover) and (pointer:fine)").matches) {
    var mx = 0, my = 0;
    track.addEventListener("pointermove", function (e) {
      var r = track.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
      track.style.setProperty("--universe-px", (mx * 8).toFixed(2) + "px");
      track.style.setProperty("--universe-py", (my * 6).toFixed(2) + "px");
    }, { passive: true });
    track.addEventListener("pointerleave", function () {
      track.style.setProperty("--universe-px", "0px");
      track.style.setProperty("--universe-py", "0px");
    }, { passive: true });
  }
})();

export {};
