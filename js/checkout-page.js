/* Street Goose 034 — /checkout em etapas (Identificação → Endereço →
   Pagamento → Revisão → Confirmação). Único método realmente funcional
   hoje é o handoff por WhatsApp (mesma lógica que já existia no modal
   antigo) — os demais aparecem desabilitados até um PSP ser configurado
   (ver PaymentService). Nenhum pagamento é aprovado no cliente. */
export function mountCheckoutPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }

  var STEPS = ["identification", "address", "payment", "review", "confirmation"];
  var stepIndex = 0;
  var formData = { name: "", email: "", phone: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", payment: "whatsapp" };

  var CEP_MASK = function (v) { return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"); };
  var PHONE_MASK = function (v) {
    v = v.replace(/\D/g, "").slice(0, 11);
    if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
    return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
  };

  var rows = window.SG.cart ? window.SG.cart.getItems() : [];

  root.innerHTML =
    '<div class="app-page-head"><h1>' + t("checkout.step." + STEPS[0]) + '</h1>' +
    '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    '<div class="checkout-steps-track" data-checkout-steps></div>' +
    '<div class="app-page-body checkout-page-body" data-checkout-body></div>';

  var titleEl = root.querySelector(".app-page-head h1");
  var stepsTrack = root.querySelector("[data-checkout-steps]");
  var bodyEl = root.querySelector("[data-checkout-body]");

  function renderStepsTrack() {
    stepsTrack.innerHTML = STEPS.map(function (s, i) {
      return '<span class="checkout-step-dot' + (i <= stepIndex ? " is-active" : "") + '">' + (i + 1) + "</span>";
    }).join('<span class="checkout-step-line"></span>');
  }

  function fieldsHtml() {
    var f = formData;
    if (STEPS[stepIndex] === "identification") {
      return (
        '<div class="checkout-grid">' +
        '<label class="span-2">' + t("auth.name") + '<input name="name" required value="' + f.name + '"></label>' +
        '<label>' + t("auth.email") + '<input type="email" name="email" required value="' + f.email + '"></label>' +
        '<label>Telefone<input name="phone" required data-mask="phone" placeholder="(00) 00000-0000" value="' + f.phone + '"></label>' +
        "</div>"
      );
    }
    if (STEPS[stepIndex] === "address") {
      return (
        '<div class="checkout-grid">' +
        '<label>CEP<input name="cep" required data-mask="cep" placeholder="00000-000" value="' + f.cep + '"></label>' +
        '<label class="span-2">Rua<input name="street" required value="' + f.street + '"></label>' +
        '<label>Número<input name="number" required value="' + f.number + '"></label>' +
        '<label>Complemento<input name="complement" value="' + f.complement + '"></label>' +
        '<label>Bairro<input name="neighborhood" required value="' + f.neighborhood + '"></label>' +
        '<label>Cidade<input name="city" required value="' + f.city + '"></label>' +
        '<label>Estado<input name="state" required maxlength="2" placeholder="UF" value="' + f.state + '"></label>' +
        "</div>"
      );
    }
    return "";
  }

  async function paymentStepHtml() {
    var mod = await import("../src/services/PaymentService.ts");
    var methods = mod.PaymentService.listMethods();
    return '<div class="payment-methods">' + methods.map(function (m) {
      return (
        '<label class="payment-method' + (!m.available ? " is-disabled" : "") + '">' +
          '<input type="radio" name="payment" value="' + m.id + '"' + (m.id === formData.payment ? " checked" : "") + (!m.available ? " disabled" : "") + ">" +
          "<span>" + t(m.labelKey) + "</span>" +
          (!m.available ? '<em>' + t("checkout.payment.unavailable") + "</em>" : "") +
        "</label>"
      );
    }).join("") + "</div>";
  }

  function reviewStepHtml() {
    return (
      '<div class="checkout-review">' +
        '<h3>' + t("checkout.step.identification") + '</h3><p>' + formData.name + " — " + formData.email + " — " + formData.phone + "</p>" +
        '<h3>' + t("checkout.step.address") + '</h3><p>' + formData.street + ", " + formData.number + " — " + formData.neighborhood + ", " + formData.city + "/" + formData.state.toUpperCase() + " — " + formData.cep + "</p>" +
        '<h3>' + t("checkout.step.payment") + '</h3><p>' + t("checkout.payment." + formData.payment) + "</p>" +
        '<h3>' + t("cart.title") + '</h3>' +
        rows.map(function (r) { return "<p>" + r.product.name + " × " + r.qty + " — " + r.product.priceLabel + "</p>"; }).join("") +
      "</div>"
    );
  }

  function confirmationStepHtml() {
    if (formData.payment === "whatsapp") {
      return '<div class="app-page-empty"><h2>Pedido enviado para o WhatsApp.</h2><p>A equipe Street Goose confirma disponibilidade e fecha o pagamento por lá.</p><a class="btn btn-primary" href="/">' + t("cart.continueShopping") + "</a></div>";
    }
    return '<div class="app-page-empty"><h2>' + t("checkout.payment.unavailable") + "</h2><p>Esse método ainda depende de um provedor de pagamento configurado.</p></div>";
  }

  function buildWhatsAppMessage() {
    var lines = ["Olá! Quero fechar esse pedido Street Goose 034:", ""];
    rows.forEach(function (r) { lines.push("• " + r.product.name + " (" + r.qty + "x) — " + r.product.priceLabel); });
    lines.push("");
    lines.push("Nome: " + formData.name);
    lines.push("Telefone: " + formData.phone);
    lines.push("E-mail: " + formData.email);
    lines.push("Endereço: " + formData.street + ", " + formData.number + (formData.complement ? " - " + formData.complement : "") +
      " — " + formData.neighborhood + ", " + formData.city + "/" + formData.state.toUpperCase() + " — CEP " + formData.cep);
    return lines.join("\n");
  }

  function collectFields() {
    bodyEl.querySelectorAll(".checkout-grid input").forEach(function (input) {
      formData[input.name] = input.value.trim();
    });
  }

  function validateStep() {
    if (STEPS[stepIndex] === "identification" || STEPS[stepIndex] === "address") {
      var invalid = [];
      bodyEl.querySelectorAll(".checkout-grid input[required]").forEach(function (input) {
        input.closest("label").classList.remove("field-error");
        if (!input.value.trim()) invalid.push(input);
      });
      if (STEPS[stepIndex] === "identification") {
        var emailInput = bodyEl.querySelector('[name="email"]');
        if (emailInput && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) invalid.push(emailInput);
      }
      if (invalid.length) {
        invalid.forEach(function (input) { input.closest("label").classList.add("field-error"); });
        invalid[0].focus();
        return false;
      }
    }
    return true;
  }

  async function renderStep() {
    titleEl.textContent = t("checkout.step." + STEPS[stepIndex]);
    renderStepsTrack();

    if (!rows.length) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("cart.empty.title") + "</h2><a class=\"btn btn-primary\" href=\"/\">" + t("cart.continueShopping") + "</a></div>";
      return;
    }

    var stepName = STEPS[stepIndex];
    var content = "";
    if (stepName === "identification" || stepName === "address") content = fieldsHtml();
    else if (stepName === "payment") content = await paymentStepHtml();
    else if (stepName === "review") content = reviewStepHtml();
    else content = confirmationStepHtml();

    var navHtml = stepName === "confirmation" ? "" :
      '<div class="checkout-nav">' +
      (stepIndex > 0 ? '<button class="btn btn-ghost" data-checkout-back>' + t("checkout.back") + "</button>" : "<span></span>") +
      '<button class="btn btn-primary" data-checkout-next>' + (stepName === "review" ? t("cart.checkout") : t("checkout.next")) + "</button>" +
      "</div>";

    bodyEl.innerHTML = '<div class="checkout-step-content">' + content + "</div>" + navHtml;

    bodyEl.querySelectorAll('[data-mask="cep"]').forEach(function (el) { el.addEventListener("input", function () { el.value = CEP_MASK(el.value); }); });
    bodyEl.querySelectorAll('[data-mask="phone"]').forEach(function (el) { el.addEventListener("input", function () { el.value = PHONE_MASK(el.value); }); });

    var backBtn = bodyEl.querySelector("[data-checkout-back]");
    if (backBtn) backBtn.addEventListener("click", function () { stepIndex--; renderStep(); });
    var nextBtn = bodyEl.querySelector("[data-checkout-next]");
    if (nextBtn) nextBtn.addEventListener("click", function () {
      if (stepName === "identification" || stepName === "address") { collectFields(); if (!validateStep()) return; }
      if (stepName === "payment") {
        var checked = bodyEl.querySelector('input[name="payment"]:checked');
        formData.payment = checked ? checked.value : "whatsapp";
      }
      if (stepName === "review") {
        if (formData.payment === "whatsapp") {
          window.open(window.SG.waLink(buildWhatsAppMessage()), "_blank", "noopener");
          if (window.SG.cart) window.SG.cart.clear();
        }
      }
      stepIndex++;
      renderStep();
    });
  }

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeydown);

  renderStep();

  return function destroy() { document.removeEventListener("keydown", onKeydown); };
}
