// Street Goose 034 — GA4, carregado somente após consentimento explícito.
// Não interfere no bootstrap, nas animações ou na navegação da loja.
(() => {
  "use strict";

  const MEASUREMENT_ID = "G-XPZWPBGLDN";
  const STORAGE_KEY = "sg034_analytics_consent_v1";
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

  function loadAnalytics() {
    if (loaded || document.querySelector("script[data-sg034-ga4]")) return;
    loaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    // A medição otimizada do fluxo GA4 já acompanha page_view e alterações
    // de histórico; não disparar page_view manual para evitar duplicação.
    window.gtag("config", MEASUREMENT_ID, { anonymize_ip: true });

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

  const choice = readChoice();
  if (choice === "accepted") loadAnalytics();
  if (choice !== "accepted" && choice !== "denied") showPanel();
})();
