/* Street Goose 034 — SG Payment Terminal: monta os cards HTML (dados reais
   do PaymentService, textos, logos) e deixa a posição/profundidade deles pra
   quem sabe onde a câmera 3D está — js/payment-terminal-scene.js, carregado
   à parte via webgl-director. Esse arquivo nunca inventa disponibilidade:
   cada chip reflete listMethods() ao pé da letra. WhatsApp nunca entra na
   órbita como "forma de pagamento": vira um cartão separado, com copy
   explícita de atendimento/concierge, porque não processa cobrança nenhuma
   aqui. Sem WebGL/3D (reduced-motion, perf baixo, contexto indisponível),
   os cards caem num grid estático — nunca ficam invisíveis. */
(function () {
  "use strict";

  var section = document.querySelector("[data-payment-terminal]");
  var orbit = document.querySelector("[data-payment-orbit]");
  var waSlot = document.querySelector("[data-payment-whatsapp]");
  if (!section || !orbit || !waSlot || !window.SG) return;

  var reducedMotion = window.SG.prefersReducedMotion();
  var t = function (key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; };

  var NETWORK_MARKS = {
    visa: '<svg viewBox="0 0 48 30" aria-hidden="true"><rect width="48" height="30" rx="4" fill="#1A1F71"/><text x="24" y="20" font-family="Arial,sans-serif" font-size="13" font-style="italic" font-weight="800" fill="#fff" text-anchor="middle">VISA</text></svg>',
    mastercard: '<svg viewBox="0 0 48 30" aria-hidden="true"><rect width="48" height="30" rx="4" fill="#16171a"/><circle cx="20" cy="15" r="9" fill="#EB001B"/><circle cx="30" cy="15" r="9" fill="#F79E1B" opacity=".92"/></svg>',
    amex: '<svg viewBox="0 0 48 30" aria-hidden="true"><rect width="48" height="30" rx="4" fill="#006FCF"/><text x="24" y="19" font-family="Arial,sans-serif" font-size="10.5" font-weight="800" fill="#fff" text-anchor="middle">AMEX</text></svg>',
    elo: '<svg viewBox="0 0 48 30" aria-hidden="true"><rect width="48" height="30" rx="4" fill="#16171a"/><text x="24" y="15" font-family="Arial,sans-serif" font-size="12" font-weight="800" fill="#fff" text-anchor="middle" font-style="italic">elo</text><circle cx="14" cy="21.5" r="2" fill="#FFCB05"/><circle cx="24" cy="21.5" r="2" fill="#00A4E0"/><circle cx="34" cy="21.5" r="2" fill="#EF4123"/></svg>',
    hipercard: '<svg viewBox="0 0 48 30" aria-hidden="true"><rect width="48" height="30" rx="4" fill="#AB1519"/><text x="24" y="19" font-family="Georgia,serif" font-size="9.5" font-weight="700" fill="#fff" text-anchor="middle" font-style="italic">hipercard</text></svg>'
  };

  var PIX_MARK = '<svg class="pmt-icon" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="#32BCAD" stroke-width="2.6" stroke-linejoin="round"><path d="M11 6.5 L16 11.5 L21 6.5"/><path d="M11 25.5 L16 20.5 L21 25.5"/><path d="M6.5 11 L11.5 16 L6.5 21"/><path d="M25.5 11 L20.5 16 L25.5 21"/></g></svg>';
  var BOLETO_MARK = '<svg class="pmt-icon" viewBox="0 0 32 32" aria-hidden="true"><g fill="currentColor"><rect x="4" y="6" width="2" height="20"/><rect x="8" y="6" width="1" height="20"/><rect x="11" y="6" width="3" height="20"/><rect x="16" y="6" width="1" height="20"/><rect x="19" y="6" width="2" height="20"/><rect x="23" y="6" width="1" height="20"/><rect x="26" y="6" width="3" height="20"/></g></svg>';
  var APPLE_MARK = '<svg class="pmt-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.365 1.43c0 1.14-.415 2.055-1.243 2.746-.885.744-1.925 1.171-2.878 1.093-.107-1.048.4-2.144 1.19-2.845.836-.727 2.008-1.202 2.93-1.24.001.082.001.164.001.246zm3.9 17.19c-.518 1.19-.766 1.72-1.43 2.774-.928 1.474-2.238 3.31-3.862 3.325-1.44.014-1.81-.943-3.762-.932-1.951.011-2.358.949-3.803.935-1.624-.015-2.862-1.673-3.79-3.148-2.6-4.106-2.873-8.93-1.27-11.5.06-.097-.03-.16-.03-.16C3.55 8.7 4.966 7.72 6.474 7.71c1.55-.01 2.523 1.043 3.804 1.043 1.24 0 1.996-1.045 3.784-1.045 1.318 0 2.716.72 3.71 1.965-3.264 1.79-2.734 6.457.493 7.947z"/></svg>';
  var GOOGLE_MARK = '<svg class="pmt-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.55-5.17 3.55-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.25 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.87 12c0-.79.14-1.56.4-2.28V6.63H1.29A11.98 11.98 0 0 0 0 12c0 1.93.46 3.75 1.29 5.37l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/></svg>';
  var WHATSAPP_MARK = '<svg class="pmt-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#25D366" d="M12.02 2C6.5 2 2.02 6.48 2.02 12c0 1.85.5 3.58 1.36 5.07L2 22l5.08-1.33A9.96 9.96 0 0 0 12.02 22C17.54 22 22 17.52 22 12S17.54 2 12.02 2z"/><path fill="#fff" d="M16.9 14.24c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.13-.42-2.15-1.34-.8-.71-1.33-1.6-1.49-1.87-.16-.27-.02-.42.12-.55.12-.12.27-.32.4-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.02-.22-.53-.44-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.28 0 1.35.98 2.65 1.12 2.83.14.18 1.93 2.95 4.68 4.14.65.28 1.16.45 1.56.58.66.21 1.25.18 1.72.11.53-.08 1.6-.65 1.82-1.29.23-.63.23-1.17.16-1.29-.07-.11-.25-.18-.52-.32z"/></svg>';

  function methodLogo(id) {
    if (id === "pix") return PIX_MARK;
    if (id === "boleto") return BOLETO_MARK;
    if (id === "applePay") return APPLE_MARK;
    if (id === "googlePay") return GOOGLE_MARK;
    if (id === "card") return '<span class="pmt-networks">' + NETWORK_MARKS.visa + NETWORK_MARKS.mastercard + NETWORK_MARKS.amex + NETWORK_MARKS.elo + "</span>";
    if (id === "debit") return '<span class="pmt-networks">' + NETWORK_MARKS.visa + NETWORK_MARKS.mastercard + NETWORK_MARKS.elo + NETWORK_MARKS.hipercard + "</span>";
    return "";
  }

  import("../src/services/PaymentService.ts").then(function (mod) {
    var methods = mod.PaymentService.listMethods().filter(function (m) { return m.id !== "whatsapp"; });
    var chips = [];

    methods.forEach(function (m) {
      var chip = document.createElement("div");
      chip.className = "payment-chip" + (m.available ? " is-available" : " is-pending");
      chip.innerHTML =
        '<span class="payment-chip-logo">' + methodLogo(m.id) + "</span>" +
        '<span class="payment-chip-label">' + t(m.labelKey) + "</span>" +
        '<span class="payment-chip-status">' + (m.available ? t("checkout.payment.available") : t("checkout.payment.unavailable")) + "</span>";
      orbit.appendChild(chip);
      chips.push(chip);
    });

    waSlot.innerHTML =
      WHATSAPP_MARK +
      '<div><p class="payment-whatsapp-title">' + t("paymentTerminal.whatsappTitle") + '</p>' +
      '<p class="payment-whatsapp-copy">' + t("paymentTerminal.whatsappCopy") + "</p></div>" +
      '<a class="btn btn-ghost payment-whatsapp-cta" href="#" data-whatsapp-cta>' + t("paymentTerminal.whatsappCta") + "</a>";
    var waLink = waSlot.querySelector("[data-whatsapp-cta]");
    if (waLink && window.SG.waLink) {
      waLink.href = window.SG.waLink(t("paymentTerminal.whatsappMessage"));
      waLink.target = "_blank";
      waLink.rel = "noopener";
    }

    // handoff pra cena 3D: ela decide posição/profundidade/entrada de cada
    // chip. Se ela nunca chegar a assumir (reduced-motion, sem WebGL, perf
    // baixo), caímos num grid estático — nunca ficam invisíveis nem presos
    // num "opacity:0" órfão. O timer de fallback só começa a contar quando a
    // seção fica visível (não da carga da página) — numa página comprida o
    // usuário real leva bem mais que 2.6s pra rolar até aqui, e um timer
    // contado da carga sempre disparava antes da cena 3D ter chance de agir.
    window.SG.paymentTerminal = { orbit: orbit, section: section, chips: chips, methods: methods };
    // a órbita 3D roda em qualquer largura — desktop e mobile, câmera e
    // escala se adaptam ao container real (ver payment-terminal-scene.js).
    // O grid estático é só fallback de verdade: reduced-motion, sem GSAP, ou
    // a cena 3D não conseguiu assumir a tempo (sem WebGL, perf muito baixa)
    if (reducedMotion || !window.SG.hasGSAP) {
      orbit.classList.add("is-static");
    } else if ("IntersectionObserver" in window) {
      var fallbackIo = new IntersectionObserver(function (entries) {
        if (!entries.some(function (e) { return e.isIntersecting; })) return;
        fallbackIo.disconnect();
        window.setTimeout(function () {
          if (!orbit.classList.contains("is-synced")) orbit.classList.add("is-static");
        }, 3200);
      }, { threshold: 0.1 });
      fallbackIo.observe(section);
    }

    if (window.SG.hasGSAP && !reducedMotion) {
      window.gsap.set(waSlot, { opacity: 0, y: 20 });
      var io = new IntersectionObserver(function (entries) {
        if (!entries.some(function (e) { return e.isIntersecting; })) return;
        window.gsap.to(waSlot, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay: 0.3 });
        io.disconnect();
      }, { threshold: 0.2 });
      io.observe(section);
    } else {
      waSlot.style.opacity = "1";
    }
  });
})();

export {};
