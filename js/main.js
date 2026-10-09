/* Street Goose 034 — orquestração geral: header, menu mobile, reveals, newsletter */
(function () {
  "use strict";

  // Scroll suave só em clique de âncora interna — nunca scroll-behavior:smooth
  // global, que suaviza TODO scroll (inclusive roda/trackpad) e duplica a
  // suavização que o ScrollTrigger.scrub já faz, deixando o desktop "atrasado"
  if (!window.SG.prefersReducedMotion()) {
    document.addEventListener("click", function (e) {
      var link = e.target.closest('a[href^="#"]:not([href="#"])');
      if (!link) return;
      var id = link.getAttribute("href").slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", "#" + id);
    });
  }

  // Header: encolhe ao rolar
  var header = document.querySelector("[data-header]");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 30); };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Progresso global da página — linha fina sincronizada ao scroll real, via rAF
  var progressBar = document.querySelector("[data-page-progress-bar]");
  if (progressBar && !window.SG.prefersReducedMotion()) {
    var progressTicking = false;
    var updateProgress = function () {
      progressTicking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progressBar.style.transform = "scaleX(" + pct + ")";
    };
    var requestProgressUpdate = function () {
      if (progressTicking) return;
      progressTicking = true;
      requestAnimationFrame(updateProgress);
    };
    addEventListener("scroll", requestProgressUpdate, { passive: true });
    addEventListener("resize", requestProgressUpdate, { passive: true });
    updateProgress();
  }

  // Menu mobile — origem única de verdade, fecha por X/backdrop/link/ESC
  var menu = document.querySelector("[data-mobile-menu]");
  var menuToggles = document.querySelectorAll("[data-menu-toggle]");
  var menuBtn = document.querySelector(".menu-btn");
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    menuBtn && menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }
  menuToggles.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setMenu(!menu.classList.contains("is-open"));
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu && menu.classList.contains("is-open")) setMenu(false);
  });

  // Newsletter — valida, envia pro Supabase quando configurado, erro/loading
  // reais. Sem Supabase configurado, mostra estado honesto de indisponível
  // em vez de fingir "você está na lista" sem nada ter sido salvo de verdade.
  var form = document.querySelector("[data-newsletter-form]");
  if (form) {
    var newsletterSubmitting = false;
    var newsletterMsg = document.querySelector("[data-newsletter-msg]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (newsletterSubmitting) return;
      var input = form.querySelector("input[type=email]");
      var email = input.value.trim();
      var trap = form.querySelector('input[name="website"]');
      if (trap && trap.value) { form.reset(); return; } // robô: finge sucesso, não envia
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailOk) {
        if (newsletterMsg) { newsletterMsg.textContent = "E-mail inválido."; newsletterMsg.hidden = false; newsletterMsg.className = "newsletter-msg is-error"; }
        input.focus();
        return;
      }
      var btn = form.querySelector("button");
      var original = btn.textContent;
      newsletterSubmitting = true;
      btn.disabled = true;
      btn.textContent = "Enviando…";
      if (newsletterMsg) newsletterMsg.hidden = true;

      import("../src/lib/supabase.ts").then(function (mod) {
        if (!mod.supabase) {
          if (newsletterMsg) { newsletterMsg.textContent = "Inscrição ainda não configurada — tente pelo WhatsApp por enquanto."; newsletterMsg.hidden = false; newsletterMsg.className = "newsletter-msg is-error"; }
          btn.disabled = false; btn.textContent = original; newsletterSubmitting = false;
          return;
        }
        // só via RPC newsletter_subscribe: valida, limita por IP e grava
        // (insert direto na tabela é bloqueado no banco — migration 0010)
        mod.supabase.rpc("newsletter_subscribe", { p_email: email, p_locale: document.documentElement.lang || "pt-BR" }).then(function (r) {
          if (r.error) return { error: r.error };
          return { error: r.data && r.data.ok === false ? { code: r.data.reason } : null };
        }).then(function (res) {
          newsletterSubmitting = false;
          btn.disabled = false;
          if (res.error && res.error.code !== "23505") { // 23505 = já inscrito, trata como sucesso
            btn.textContent = original;
            var msg = res.error.code === "rate_limited" ? "Muitas tentativas. Espera uns minutos e tenta de novo."
              : res.error.code === "invalid_email" ? "E-mail inválido."
              : "Algo deu errado. Tente de novo.";
            if (newsletterMsg) { newsletterMsg.textContent = msg; newsletterMsg.hidden = false; newsletterMsg.className = "newsletter-msg is-error"; }
            return;
          }
          btn.textContent = "Você está na lista ✓";
          form.reset();
          if (newsletterMsg) newsletterMsg.hidden = true;
          setTimeout(function () { btn.textContent = original; }, 3200);
        });
      });
    });
  }

  // Imagens lazy que carregam depois do refresh inicial do ScrollTrigger
  // deslocam a altura da página e deixam os triggers mais abaixo (ex: Final
  // Act, footer) com posições erradas — nunca disparam. Recalcula com debounce
  // sempre que uma imagem termina de carregar.
  if (window.ScrollTrigger) {
    var stRefreshTimer;
    document.addEventListener("load", function (e) {
      if (e.target.tagName !== "IMG") return;
      clearTimeout(stRefreshTimer);
      stRefreshTimer = setTimeout(function () { window.ScrollTrigger.refresh(); }, 200);
    }, true);
  }

  // Reveals — GSAP ScrollTrigger com fallback simples (IntersectionObserver) se GSAP faltar
  var reveals = document.querySelectorAll(".reveal-up");
  if (window.SG.hasGSAP && window.ScrollTrigger && !window.SG.prefersReducedMotion()) {
    reveals.forEach(function (el) {
      window.gsap.fromTo(el, { opacity: 0, y: 34 }, {
        opacity: 1, y: 0, duration: window.SG.motion.slow, ease: window.SG.motion.easeOut,
        scrollTrigger: { trigger: el, start: "top 85%" }
      });
    });
  } else if ("IntersectionObserver" in window && !window.SG.prefersReducedMotion()) {
    reveals.forEach(function (el) { el.style.opacity = "0"; el.style.transform = "translateY(24px)"; el.style.transition = "opacity .8s ease, transform .8s ease"; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  // Product Orbit — rotação sutil ligada ao scroll (10-18°), CSS/GSAP, produto sempre reconhecível
  var orbitImg = document.querySelector(".orbit-fallback");
  if (orbitImg && window.SG.hasGSAP && window.ScrollTrigger && !window.SG.prefersReducedMotion()) {
    window.gsap.fromTo(orbitImg, { rotate: -9 }, {
      rotate: 9, ease: "none",
      scrollTrigger: { trigger: ".orbit-stage", start: "top bottom", end: "bottom top", scrub: 0.6 }
    });
  }

  // Feature Film banner (Future Vision) — reveal por wipe + light sweep a cada entrada
  // na tela (descendo e voltando), scale sutil ligado ao scroll. Composição do banner
  // nunca é alterada, só o container/camada.
  var filmBanner = document.querySelector("[data-film-banner]");
  if (filmBanner && window.SG.hasGSAP && window.ScrollTrigger && !window.SG.prefersReducedMotion()) {
    var filmImg = filmBanner.querySelector(".banner-img");
    var filmSweep = filmBanner.querySelector(".film-sweep");
    var lightTier = window.SG.perfTier !== "low";

    // reveal toca toda vez que o banner entra na tela — descendo E voltando
    // (subindo). Só é "rebobinado" quando já saiu totalmente da tela, então
    // nunca some na frente de quem está olhando.
    var filmReveal = window.gsap.fromTo(filmBanner, { clipPath: "inset(0 0 0 100%)" }, {
      clipPath: "inset(0 0 0 0%)", duration: 1.2, ease: "power3.out", paused: true
    });
    var filmSweepTween = filmSweep && lightTier
      ? window.gsap.fromTo(filmSweep, { xPercent: -130 }, {
          xPercent: 230, duration: 1.6, ease: "power2.inOut", delay: 0.15, paused: true
        })
      : null;
    var playFilm = function () {
      filmReveal.restart();
      if (filmSweepTween) filmSweepTween.restart(true);
    };
    var rewindFilm = function () {
      filmReveal.pause(0);
      if (filmSweepTween) filmSweepTween.pause(0);
    };
    window.ScrollTrigger.create({
      trigger: filmBanner, start: "top 88%", end: "bottom 12%",
      onEnter: playFilm, onEnterBack: playFilm
    });
    window.ScrollTrigger.create({
      trigger: filmBanner, start: "top bottom", end: "bottom top",
      onLeave: rewindFilm, onLeaveBack: rewindFilm
    });
    window.gsap.fromTo(filmImg, { scale: 1 }, {
      scale: lightTier ? 1.05 : 1.02, ease: "none",
      scrollTrigger: { trigger: filmBanner, start: "top bottom", end: "bottom top", scrub: 0.6 }
    });
  }
})();

export {};
