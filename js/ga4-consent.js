// Street Goose 034 — GA4, carregado somente após consentimento explícito.
// Não interfere no bootstrap, nas animações ou na navegação da loja.
(() => {
  "use strict";

  const MEASUREMENT_ID = "G-XPZWPBGLDN";
  const STORAGE_KEY = "sg034_analytics_consent_v1";
  // A propriedade GA4 oficial deve receber apenas acessos ao domínio da loja.
  // Previews Vercel, localhost e homologação não contaminam os relatórios reais.
  const PRODUCTION_HOSTS = new Set(["www.streetgoose034.com.br", "streetgoose034.com.br"]);
  const isProductionDomain = PRODUCTION_HOSTS.has(window.location.hostname.toLowerCase());
  let loaded = false;
  let panel = null;

  function readChoice() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function saveChoice(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Armazenamento bloqueado: a preferência vale só até recarregar.
    }
  }


  // Core Web Vitals RUM: métricas reais do navegador, sem PII e só
  // transmitidas ao GA4 depois que a pessoa aceitou analytics.
  // LCP e CLS usam PerformanceObserver; INP é uma estimativa p98 de
  // interações observadas (a implementação oficial é a referência final).
  // Visitas sem suporte à métrica não geram número artificial.
  let vitalsStarted = false;
  function startWebVitals() {
    if (vitalsStarted || typeof PerformanceObserver !== "function") return;
    vitalsStarted = true;
    const supported = PerformanceObserver.supportedEntryTypes || [];
    let lcp = null;
    let maxCls = 0;
    let sessionCls = 0;
    let sessionStart = 0;
    let previousShift = 0;
    const interactions = new Map();
    let reported = false;

    function observe(type, handler, options = {}) {
      if (!supported.includes(type)) return;
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) handler(entry);
        });
        observer.observe({ type, buffered: true, ...options });
      } catch {
        // Alguns motores não oferecem o mesmo tipo ou configuração.
      }
    }

    observe("largest-contentful-paint", (entry) => { lcp = entry.startTime; });
    observe("layout-shift", (entry) => {
      if (entry.hadRecentInput) return;
      if (!sessionStart || entry.startTime - previousShift > 1000 || entry.startTime - sessionStart > 5000) {
        sessionStart = entry.startTime;
        sessionCls = 0;
      }
      sessionCls += entry.value;
      previousShift = entry.startTime;
      maxCls = Math.max(maxCls, sessionCls);
    });
    observe("event", (entry) => {
      if (!entry.interactionId) return;
      interactions.set(entry.interactionId, Math.max(interactions.get(entry.interactionId) || 0, entry.duration));
    }, { durationThreshold: 40 });

    function emit(name, value, good, improve) {
      if (!Number.isFinite(value)) return;
      window.gtag("event", "web_vital", {
        metric_name: name,
        metric_value: Math.round(value),
        metric_rating: value <= good ? "good" : value <= improve ? "needs_improvement" : "poor",
        metric_origin: "browser",
        non_interaction: true,
      });
    }

    function report() {
      if (reported || !loaded || readChoice() !== "accepted" || typeof window.gtag !== "function") return;
      reported = true;
      if (lcp !== null) emit("LCP", lcp, 2500, 4000);
      // CLS é um número decimal; escala x1000 para manter o evento inteiro.
      if (supported.includes("layout-shift")) emit("CLS", maxCls * 1000, 100, 250);
      if (interactions.size) {
        const delays = [...interactions.values()].sort((a, b) => b - a);
        const sample = Math.min(delays.length - 1, Math.floor(delays.length / 50));
        emit("INP_estimate", delays[sample], 200, 500);
      }
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") report();
    });
    window.addEventListener("pagehide", report, { once: true });
  }

  function loadAnalytics() {
    if (!isProductionDomain) return;
    if (loaded || document.querySelector("script[data-sg034-ga4]")) return;
    loaded = true;
    startWebVitals();

    // Eventos SG disparados antes da autorização ficam só na memória local.
    // Não entregar esse histórico ao Google quando o visitante aceita.
    window.dataLayer = [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    // A medição otimizada do fluxo GA4 já acompanha page_view e alterações
    // de histórico; não disparar page_view manual para evitar duplicação.
    window.gtag("config", MEASUREMENT_ID, {
      anonymize_ip: true,
      page_location: window.location.origin + window.location.pathname.replace(/^\/pedido\/[^/]+$/, "/pedido/:id"),
    });

    const script = document.createElement("script");
    script.async = true;
    script.dataset.sg034Ga4 = "true";
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
  }

  function clearAnalyticsCookies() {
    const names = document.cookie.split(";").map((part) => part.trim().split("=")[0]);
    const hostname = window.location.hostname;
    const domains = ["", hostname, "." + hostname];
    if (hostname.endsWith(".streetgoose034.com.br") || hostname === "streetgoose034.com.br") {
      domains.push("streetgoose034.com.br", ".streetgoose034.com.br");
    }
    names.filter((name) => /^_ga(?:_|$)/.test(name)).forEach((name) => {
      domains.forEach((domain) => {
        document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax" + (domain ? "; Domain=" + domain : "");
      });
    });
  }

  function closePanel() {
    if (panel) {
      panel.remove();
      panel = null;
    }
  }

  function selectChoice(choice) {
    saveChoice(choice);
    closePanel();
    if (choice === "accepted") {
      loadAnalytics();
    } else if (loaded) {
      // Uma tag já carregada não pode ser descarregada com segurança.
      // Revogação remove os cookies e reinicia sem inicializar o GA4.
      clearAnalyticsCookies();
      window.location.reload();
    } else {
      clearAnalyticsCookies();
    }
  }

  function showPanel() {
    if (panel) return;
    panel = document.createElement("section");
    panel.className = "sg034-cookie-panel";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Preferências de privacidade");
    panel.innerHTML = `
      <p class="sg034-cookie-eyebrow">STREET GOOSE 034 / PRIVACIDADE</p>
      <h2>Você escolhe.</h2>
      <p>Podemos usar cookies de análise para entender as visitas e melhorar a loja? Eles só serão ativados com sua autorização.</p>
      <div class="sg034-cookie-actions">
        <button type="button" data-sg034-consent="denied">Recusar</button>
        <button type="button" class="sg034-cookie-accept" data-sg034-consent="accepted">Aceitar análise</button>
      </div>
      <a href="/privacidade">Política de privacidade</a>
    `;
    panel.querySelectorAll("[data-sg034-consent]").forEach((button) => {
      button.addEventListener("click", () => selectChoice(button.dataset.sg034Consent));
    });
    document.body.appendChild(panel);
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-sg034-consent-open]")) {
      event.preventDefault();
      showPanel();
    }
  });

  // A camada própria da loja emite um evento DOM por ação real (js/analytics.js).
  // Encaminhar somente os campos conhecidos, após consentimento, sem PII.
  document.addEventListener("sg:analytics", (event) => {
    if (!loaded || !event.detail || typeof window.gtag !== "function") return;
    const data = event.detail;
    const allowed = new Set([
      "hero_cta_click", "campaign_slide_change", "product_open",
      "add_to_cart", "add_to_wishlist", "begin_checkout", "order_created",
      "whatsapp_click", "drop_popup_open", "drop_popup_close",
      "newsletter_submit", "login", "sign_up",
    ]);
    if (!allowed.has(data.event)) return;

    const text = (value) => typeof value === "string" ? value.slice(0, 80) : undefined;
    // nomes e parâmetros conforme docs/launch/03 (tabela GA4)
    const params = {};
    if (text(data.location)) params.cta_location = text(data.location);
    if (text(data.label)) params.label = text(data.label);
    if (text(data.method)) params.method = text(data.method);
    if (text(data.slide)) params.slide = text(data.slide);
    const item = text(data.product_id);

    if (data.event === "whatsapp_click") {
      // microconversão: clique não é lead confirmado
      window.gtag("event", "click_whatsapp", params);
    } else if (data.event === "product_open" && item) {
      window.gtag("event", "view_item", { items: [{ item_id: item }], ...params });
    } else if ((data.event === "add_to_cart" || data.event === "add_to_wishlist") && item) {
      window.gtag("event", data.event, { items: [{ item_id: item }] });
    } else if (data.event === "order_created") {
      // pedido gravado no banco: lead real; venda só quando a equipe confirma o pagamento
      window.gtag("event", "generate_lead", {
        lead_type: "pedido_whatsapp",
        item_count: typeof data.items === "number" ? data.items : 0,
        has_unpriced: data.has_unpriced === true,
      });
    } else if (data.event === "newsletter_submit") {
      // Inscrição em newsletter não é pedido comercial. Evento separado evita
      // inflar o indicador de leads ao marcar generate_lead como evento-chave.
      window.gtag("event", "newsletter_signup", { method: "website" });
    } else {
      window.gtag("event", data.event, params);
    }
  });

  const choice = readChoice();
  if (choice === "accepted") loadAnalytics();
  if (choice !== "accepted" && choice !== "denied") showPanel();
})();
