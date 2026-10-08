/* Street Goose 034 — hero film + campaign slider
   Uma origem de verdade para o slide ativo. Nunca reseta a página.
   O vídeo é UMA instância persistente: nunca é recriado nem pausado por troca
   de slide — só a opacidade muda. Isso é o que faz o loop parecer contínuo
   quando o carousel volta pro slide do filme, no desktop e no mobile. */
(function () {
  "use strict";

  var heroEl = document.querySelector("[data-hero]");
  if (!heroEl) return;

  var slides = window.SG_HERO_SLIDES || [];
  if (!slides.length) return;

  // Preaquece os três banners do carousel em baixa prioridade. Assim a troca
  // permanece instantânea sem competir com o MP4 que abre a experiência.
  var campaignImagePreloads = slides.filter(function (slide) {
    return slide.type === "image" && slide.image;
  }).map(function (slide) {
    var image = new Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.src = slide.image;
    return image;
  });
  window.addEventListener("pagehide", function () { campaignImagePreloads.length = 0; }, { once: true });

  var track = heroEl.querySelector("[data-hero-track]");
  var video = heroEl.querySelector("[data-hero-video]");
  var fallbackImg = heroEl.querySelector("[data-hero-image]");
  // Vite fingerprints the poster referenced by the HTML. Preserve that resolved
  // URL for the reduced-motion video slide instead of falling back to the
  // legacy runtime string from data.js (which is intentionally not bundled).
  var filmPosterSrc = fallbackImg.currentSrc || fallbackImg.src;
  var currentEl = heroEl.querySelector("[data-current]");
  var totalEl = heroEl.querySelector("[data-total]");
  var progressEl = heroEl.querySelector("[data-progress]");
  var prevBtn = heroEl.querySelector("[data-prev]");
  var nextBtn = heroEl.querySelector("[data-next]");
  var gsapReady = window.SG.hasGSAP;
  var reduced = window.SG.prefersReducedMotion();

  var index = -1;
  var timer = null;
  var progressTween = null;
  var SLIDE_MS = 7000;

  totalEl.textContent = String(slides.length).padStart(2, "0");

  function buildSlideMarkup(slide) {
    var cta2 = slide.ctaSecondary
      ? '<a class="text-link" href="' + slide.ctaSecondary.href + '">' + slide.ctaSecondary.label + "</a>"
      : "";
    return (
      '<div class="hero-slide-content">' +
      '<p class="eyebrow">' + slide.eyebrow + "</p>" +
      "<h1>" + slide.heading + "</h1>" +
      '<p class="lead">' + slide.lead + "</p>" +
      '<div class="hero-cta">' +
      '<a class="btn btn-primary" href="' + slide.ctaPrimary.href + '" data-hero-cta>' + slide.ctaPrimary.label + "</a>" +
      cta2 +
      "</div></div>"
    );
  }

  /* ---------------- Persistent video layer (VideoPlaybackManager) ----------------
     A regra: o <video> nunca é pausado por causa de troca de slide, nunca é
     recriado, nunca troca de src. Só a opacidade decide o que o usuário vê.
     Isso preserva o currentTime sozinho na maioria dos browsers. Como proteção
     extra contra o Safari/iOS suspender mídia fora de tela, guardamos
     currentTime + timestamp e recalculamos a posição esperada ao retomar. */
  var videoStarted = false;
  var savedCurrentTime = 0;
  var suspendedAt = 0;
  var heroRect = heroEl.getBoundingClientRect();
  var heroVisible = heroRect.bottom > 0 && heroRect.top < window.innerHeight;

  function startVideoOnce() {
    if (!video || videoStarted || reduced || !heroVisible || document.hidden) return;
    videoStarted = true;
    video.setAttribute("data-ready", video.readyState >= 2 ? "1" : "0");
    var p = video.play();
    if (p && p.catch) p.catch(function () { video.setAttribute("data-ready", "0"); });
  }

  function resumeVideoIfNeeded() {
    if (!video || !videoStarted || reduced || !heroVisible || document.hidden) return;
    if (!video.paused) return;
    if (suspendedAt && video.duration) {
      var elapsed = (Date.now() - suspendedAt) / 1000;
      var expected = (savedCurrentTime + elapsed) % video.duration;
      if (isFinite(expected)) { try { video.currentTime = expected; } catch (e) {} }
    }
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  function pauseVideoOffscreen() {
    if (!video || !videoStarted || video.paused) return;
    savedCurrentTime = video.currentTime || savedCurrentTime;
    suspendedAt = Date.now();
    video.pause();
  }

  function syncHeroActivity() {
    if (!heroVisible || document.hidden) {
      clearTimeout(timer);
      pauseVideoOffscreen();
      return;
    }
    if (index >= 0 && slides[index].type === "video") startVideoOnce();
    restartAutoplay();
    resumeVideoIfNeeded();
  }

  if (video) {
    video.addEventListener("playing", function () { video.setAttribute("data-ready", "1"); suspendedAt = 0; });
    video.addEventListener("error", function () { video.setAttribute("data-ready", "0"); });
    video.addEventListener("pause", function () {
      // se pausou sem ter sido a gente a mandar (ex: SO suspendendo mídia fora de tela)
      savedCurrentTime = video.currentTime || savedCurrentTime;
      suspendedAt = Date.now();
    });
    video.addEventListener("canplay", resumeVideoIfNeeded);
    window.addEventListener("pageshow", syncHeroActivity);
  }

  function setMedia(slide) {
    if (slide.type === "video" && !reduced) {
      fallbackImg.style.opacity = "0";
      startVideoOnce();
      resumeVideoIfNeeded();
    } else {
      fallbackImg.style.objectPosition = slide.focus || "center";
      fallbackImg.src = slide.type === "video" ? filmPosterSrc : slide.image;
      fallbackImg.style.opacity = "1";
      // vídeo continua tocando por trás, só fica invisível — nunca pausamos aqui
    }
  }

  function applyAccent(slide) {
    heroEl.style.setProperty("--accent", slide.accent || "#ff5a00");
  }

  function renderContent(slide) {
    if (gsapReady && !reduced) {
      var out = track.firstElementChild;
      var tl = window.gsap.timeline();
      if (out) {
        tl.to(out, { opacity: 0, y: -14, duration: window.SG.motion.fast, ease: window.SG.motion.easeOut });
      }
      tl.call(function () {
        track.innerHTML = buildSlideMarkup(slide);
        var el = track.firstElementChild;
        window.gsap.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: window.SG.motion.base, ease: window.SG.motion.easeOut });
      });
    } else {
      track.innerHTML = buildSlideMarkup(slide);
    }
  }

  function runProgress() {
    if (progressTween) progressTween.kill && progressTween.kill();
    if (reduced) { progressEl.style.width = "100%"; return; }
    progressEl.style.width = "0%";
    if (gsapReady) {
      progressTween = window.gsap.to(progressEl, { width: "100%", duration: SLIDE_MS / 1000, ease: "none" });
    } else if (progressEl.animate) {
      progressEl.animate([{ width: "0%" }, { width: "100%" }], { duration: SLIDE_MS, fill: "forwards", easing: "linear" });
    }
  }

  function goTo(i, opts) {
    opts = opts || {};
    var next = (i + slides.length) % slides.length;
    if (next === index && !opts.force) return;
    index = next;
    var slide = slides[index];

    applyAccent(slide);
    setMedia(slide);
    renderContent(slide);
    currentEl.textContent = String(index + 1).padStart(2, "0");
    runProgress();

    if (!opts.silent) restartAutoplay();
  }

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function restartAutoplay() {
    clearTimeout(timer);
    if (reduced || !heroVisible || document.hidden) return;
    timer = setTimeout(next, SLIDE_MS);
  }

  prevBtn && prevBtn.addEventListener("click", prev);
  nextBtn && nextBtn.addEventListener("click", next);

  heroEl.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  heroEl.setAttribute("tabindex", "-1");

  // pause autoplay (do carousel, não do vídeo) enquanto usuário interage — cortesia desktop
  heroEl.addEventListener("pointerenter", function () { clearTimeout(timer); });
  heroEl.addEventListener("pointerleave", function () { restartAutoplay(); });

  // swipe support (mobile) — precisa distinguir de um scroll vertical normal
  // sobre o hero: sem checar dy/scrollY, um gesto de rolagem com qualquer
  // componente horizontal (comum, a mão descreve um arco) trocava de slide
  // sozinho no meio da rolagem
  var touchX = null, touchY = null, touchStartScrollY = 0;
  heroEl.addEventListener("touchstart", function (e) {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
    touchStartScrollY = window.scrollY;
  }, { passive: true });
  heroEl.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    var dy = e.changedTouches[0].clientY - touchY;
    var scrolled = Math.abs(window.scrollY - touchStartScrollY) > 8;
    if (!scrolled && Math.abs(dx) > 40 && Math.abs(dy) < 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      dx < 0 ? next() : prev();
    }
    touchX = null; touchY = null;
  }, { passive: true });

  if ("IntersectionObserver" in window) {
    var heroObserver = new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      syncHeroActivity();
    }, { threshold: 0.01 });
    heroObserver.observe(heroEl);
  }

  document.addEventListener("visibilitychange", syncHeroActivity);

  goTo(0, { force: true, silent: true });
  restartAutoplay();

})();

export {};
