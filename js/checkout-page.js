/* Street Goose 034 — /checkout em etapas (Identificação → Endereço →
   Pagamento → Revisão → Confirmação). Único método realmente funcional
   hoje é o handoff por WhatsApp (mesma lógica que já existia no modal
   antigo) — os demais aparecem desabilitados até um PSP ser configurado
   (ver PaymentService). Nenhum pagamento é aprovado no cliente. */
import { checkoutFieldErrors } from "./checkout-validation.js";

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
        '<label class="span-2">' + t("auth.name") + '<input name="name" required value="' + window.SG.esc(f.name) + '\"></label>' +
        '<label>' + t("auth.email") + '<input type="email" name="email" required value="' + window.SG.esc(f.email) + '\"></label>' +
        '<label>Telefone<input type="tel" inputmode="tel" autocomplete="tel" name="phone" required data-mask="phone" placeholder="(00) 00000-0000" value="' + window.SG.esc(f.phone) + '\"></label>' +
        "</div>"
      );
    }
    if (STEPS[stepIndex] === "address") {
      return (
        '<div class="checkout-grid">' +
        '<label>CEP<input inputmode="numeric" autocomplete="postal-code" name="cep" required data-mask="cep" placeholder="00000-000" value="' + window.SG.esc(f.cep) + '\"></label>' +
        '<label class="span-2">Rua<input name="street" required value="' + window.SG.esc(f.street) + '\"></label>' +
        '<label>Número<input name="number" required value="' + window.SG.esc(f.number) + '\"></label>' +
        '<label>Complemento<input name="complement" value="' + window.SG.esc(f.complement) + '\"></label>' +
        '<label>Bairro<input name="neighborhood" required value="' + window.SG.esc(f.neighborhood) + '\"></label>' +
        '<label>Cidade<input name="city" required value="' + window.SG.esc(f.city) + '\"></label>' +
        '<label>Estado<input name="state" autocomplete="address-level1" required maxlength="2" placeholder="UF" value="' + window.SG.esc(f.state) + '\"></label>' +
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
        '<h3>' + t("checkout.step.identification") + '</h3><p>' + window.SG.esc(formData.name + ". " + formData.email + ". " + formData.phone) + "</p>" +
        '<h3>' + t("checkout.step.address") + '</h3><p>' + window.SG.esc(formData.street + ", " + formData.number + ". " + formData.neighborhood + ", " + formData.city + "/" + formData.state.toUpperCase() + ". " + formData.cep) + "</p>" +
        '<h3>' + t("checkout.step.payment") + '</h3><p>' + t("checkout.payment." + formData.payment) + "</p>" +
        '<h3>' + t("cart.title") + '</h3>' +
        rows.map(function (r) { return "<p>" + window.SG.esc(r.product.name) + " × " + window.SG.esc(r.qty) + " — <span data-price-for=\"" + window.SG.esc(r.product.id) + "\">" + window.SG.esc(r.product.priceLabel) + "</span></p>"; }).join("") +
        '<p class="checkout-review-total"><b>Total: <span data-cart-subtotal>' + window.SG.subtotalLabel(rows) + "</span></b></p>" +
        '<div class="checkout-coupon" data-coupon-box>' + couponHtml() + "</div>" +
      "</div>"
    );
  }

  // ---- cupom (migration 0104): prévia aqui, desconto de verdade no servidor ----
  var coupon = null; // { code, discountPercent, discountCents }
  var hasSession = false;
  var COUPON_MESSAGES = {
    invalid: "Cupom inválido.",
    not_started: "Esse cupom ainda não começou a valer.",
    expired: "Esse cupom expirou.",
    used_up: "Esse cupom já atingiu o limite de usos.",
    reward_only: "Esse cupom é exclusivo de quem resgatou a recompensa.",
    already_used: "Você já usou esse cupom.",
    rate_limited: "Muitas tentativas. Tente de novo em alguns minutos.",
    auth_required: "Entre na sua conta para usar cupom.",
  };
  function pricedSubtotal() {
    return rows.reduce(function (sum, r) { return typeof r.product.price === "number" ? sum + r.product.price * r.qty : sum; }, 0);
  }
  function hasUnpriced() { return rows.some(function (r) { return typeof r.product.price !== "number"; }); }
  function couponDiscount() {
    if (!coupon) return 0;
    var base = pricedSubtotal();
    return coupon.discountPercent ? Math.round(base * coupon.discountPercent / 100) : Math.min(coupon.discountCents || 0, base);
  }
  function couponHtml() {
    if (coupon) {
      var d = couponDiscount();
      return '<p class="checkout-coupon-applied">Cupom <b>' + window.SG.esc(coupon.code) + "</b> aplicado" +
        (d ? " — <span>−" + window.SG.formatPrice(d) + "</span>" : " (o desconto vale sobre itens com preço)") +
        ' <button type="button" class="text-link" data-coupon-remove>Remover</button></p>' +
        (d ? '<p class="checkout-review-total"><b>Total com desconto: ' + window.SG.formatPrice(Math.max(0, pricedSubtotal() - d)) + (hasUnpriced() ? " + itens a consultar" : "") + "</b></p>" : "");
    }
    if (!hasSession) return '<p class="checkout-coupon-hint">Tem cupom? <button type="button" class="text-link" data-coupon-login>Entre na sua conta</button> para usar.</p>';
    return '<div class="checkout-coupon-form"><label>Cupom<input name="coupon" autocomplete="off" maxlength="32" placeholder="CÓDIGO" autocapitalize="characters"></label>' +
      '<button type="button" class="btn btn-ghost" data-coupon-apply>Aplicar</button></div>' +
      '<p class="checkout-coupon-msg" data-coupon-msg role="status"></p>';
  }
  function refreshCouponBox() {
    var box = bodyEl.querySelector("[data-coupon-box]");
    if (box) box.innerHTML = couponHtml();
  }
  async function applyCoupon() {
    var input = bodyEl.querySelector('[name="coupon"]');
    var msg = bodyEl.querySelector("[data-coupon-msg]");
    var btn = bodyEl.querySelector("[data-coupon-apply]");
    if (!input) return;
    var code = input.value.trim();
    if (!code) { msg.textContent = "Digite o código do cupom."; return; }
    btn.disabled = true;
    msg.textContent = "Conferindo…";
    var mod = await import("../src/services/OrderService.ts");
    var res = await mod.OrderService.validateCoupon(code);
    btn.disabled = false;
    if (!res.ok) { msg.textContent = COUPON_MESSAGES[res.reason] || "Não foi possível aplicar esse cupom agora."; return; }
    coupon = { code: res.code, discountPercent: res.discountPercent, discountCents: res.discountCents };
    refreshCouponBox();
    if (window.SG.toast) window.SG.toast("CUPOM " + res.code + " APLICADO");
  }
  bodyEl.addEventListener("click", function (e) {
    if (e.target.closest("[data-coupon-apply]")) applyCoupon();
    else if (e.target.closest("[data-coupon-remove]")) { coupon = null; refreshCouponBox(); }
    else if (e.target.closest("[data-coupon-login]") && window.SG.auth) window.SG.auth.open();
  });
  bodyEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.name === "coupon") { e.preventDefault(); applyCoupon(); }
  });
  // entrou pelo modal sem sair do checkout: libera o campo de cupom
  var unsubscribeAuth = null;
  import("../src/services/AuthService.ts").then(function (m) {
    unsubscribeAuth = m.AuthService.onAuthStateChange(function (_event, session) {
      var now = !!session;
      if (now === hasSession) return;
      hasSession = now;
      if (!now) coupon = null;
      setTimeout(refreshCouponBox, 0);
    });
  });

  function confirmationStepHtml() {
    if (formData.payment === "whatsapp") {
      return '<div class="app-page-empty"><h2>Pedido preparado para o WhatsApp.</h2>' +
        (orderId ? '<p>Pedido <strong>#' + orderId.slice(0, 8).toUpperCase() + '</strong> salvo na sua conta.</p>' : "") +
        (orderSummary && orderSummary.couponCode && orderSummary.discountCents > 0
          ? "<p>Cupom <b>" + window.SG.esc(orderSummary.couponCode) + "</b> aplicado: −" + window.SG.formatPrice(orderSummary.discountCents) + ".</p>"
          : (coupon && orderId ? "<p>O cupom não pôde ser aplicado no pedido. a equipe confere no atendimento.</p>" : "")) +
        '<p>A equipe Street Goose confirma disponibilidade e fecha o pagamento por lá.</p>' +
        (handoffUrl ? '<p><a class="btn btn-primary" target="_blank" rel="noopener noreferrer" href="' + window.SG.esc(handoffUrl) + '">Abrir conversa no WhatsApp</a></p>' : "") +
        '<a class="text-link" href="/">' + t("cart.continueShopping") + "</a></div>";
    }
    return '<div class="app-page-empty"><h2>' + t("checkout.payment.unavailable") + "</h2><p>Esse método ainda depende de um provedor de pagamento configurado.</p></div>";
  }

  var orderId = null;
  var orderSummary = null;
  // One accepted backend order must count only once, even on a repeated attempt.
  var leadTrackedOrderId = null;
  var handoffUrl = null;
  var submitting = false;
  var idempotencyKey = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);

  // Registra o pedido no backend quando há sessão (RPC create_whatsapp_order).
  // Sem login/backend, segue só pelo WhatsApp — nunca bloqueia a compra.
  async function registerOrder() {
    try {
      var mod = await import("../src/services/OrderService.ts");
      var res = await mod.OrderService.createWhatsAppOrder(
        rows.map(function (r) { return { productId: String(r.product.id), productName: r.product.name, qty: r.qty }; }),
        { name: formData.name, email: formData.email, phone: formData.phone, cep: formData.cep, street: formData.street,
          number: formData.number, complement: formData.complement, neighborhood: formData.neighborhood,
          city: formData.city, state: formData.state.toUpperCase() },
        idempotencyKey,
        coupon ? coupon.code : null
      );
      if (res.ok && res.orderId) {
        orderId = res.orderId;
        // A falha ao buscar resumo (cupons/conexão) não pode apagar um lead
        // cujo pedido já foi confirmado e gravado no Supabase.
        // Não inclui ID, nome, telefone ou endereço nos parâmetros do GA4.
        if (leadTrackedOrderId !== orderId) {
          leadTrackedOrderId = orderId;
          if (window.SG.track) window.SG.track("order_created", {
            items: rows.reduce(function (total, row) { return total + row.qty; }, 0),
            has_unpriced: hasUnpriced()
          });
        }
        try { orderSummary = await mod.OrderService.getSummary(orderId); }
        catch (_e) { orderSummary = null; /* mantém o pedido e segue para WhatsApp */ }
      }
    } catch (_e) { /* segue pelo WhatsApp */ }
  }

  function buildWhatsAppMessage() {
    var lines = ["Olá! Quero fechar esse pedido Street Goose 034:", ""];
    if (orderId) { lines[0] = "Olá! Quero fechar o pedido #" + orderId.slice(0, 8).toUpperCase() + " Street Goose 034:"; }
    rows.forEach(function (r) { lines.push(" " + r.product.name + " (" + r.qty + "x). " + r.product.priceLabel); });
    if (orderSummary && orderSummary.couponCode && orderSummary.discountCents > 0) {
      lines.push("Cupom: " + orderSummary.couponCode + " (−" + window.SG.formatPrice(orderSummary.discountCents) + ")");
      lines.push("Total: " + window.SG.formatPrice(orderSummary.totalCents) + (hasUnpriced() ? " + itens a consultar" : ""));
    } else {
      if (coupon) lines.push("Cupom informado: " + coupon.code + " (conferir no atendimento)");
      lines.push("Total: " + window.SG.subtotalLabel(rows));
    }
    lines.push("");
    lines.push("Nome: " + formData.name);
    lines.push("Telefone: " + formData.phone);
    lines.push("E-mail: " + formData.email);
    lines.push("Endereço: " + formData.street + ", " + formData.number + (formData.complement ? " - " + formData.complement : "") +
      ". " + formData.neighborhood + ", " + formData.city + "/" + formData.state.toUpperCase() + ". CEP " + formData.cep);
    return lines.join("\n");
  }

  function collectFields() {
    bodyEl.querySelectorAll(".checkout-grid input").forEach(function (input) {
      formData[input.name] = input.value.trim();
    });
  }

  function validateStep() {
    if (STEPS[stepIndex] !== "identification" && STEPS[stepIndex] !== "address") return true;
    var current = {};
    bodyEl.querySelectorAll(".checkout-grid input").forEach(function (input) {
      current[input.name] = input.value.trim();
      input.removeAttribute("aria-invalid");
      input.closest("label").classList.remove("field-error");
    });
    var errors = checkoutFieldErrors(current);
    var first = null;
    Object.keys(errors).forEach(function (field) {
      var input = bodyEl.querySelector('.checkout-grid input[name="' + field + '"]');
      if (!input) return;
      input.setAttribute("aria-invalid", "true");
      input.closest("label").classList.add("field-error");
      if (!first) first = input;
    });
    var notice = bodyEl.querySelector("[data-checkout-error]");
    if (notice) {
      notice.textContent = first ? errors[first.name] : "";
      notice.hidden = !first;
    }
    if (first) first.focus();
    return !first;
  }

  async function renderStep() {
    titleEl.textContent = t("checkout.step." + STEPS[stepIndex]);
    renderStepsTrack();

    if (!rows.length) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("cart.empty.title") + "</h2><a class=\"btn btn-primary\" href=\"/\">" + t("cart.continueShopping") + "</a></div>";
      return;
    }

    var stepName = STEPS[stepIndex];
    if (stepName === "review") hasSession = !!(window.SG.auth && await window.SG.auth.getSession());
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

    bodyEl.innerHTML = '<div class="checkout-step-content">' + content + "</div>" +
      '<p class="checkout-validation-error" data-checkout-error role="alert" hidden></p>' + navHtml;

    bodyEl.querySelectorAll('[data-mask="cep"]').forEach(function (el) { el.addEventListener("input", function () { el.value = CEP_MASK(el.value); }); });
    bodyEl.querySelectorAll('[data-mask="phone"]').forEach(function (el) { el.addEventListener("input", function () { el.value = PHONE_MASK(el.value); }); });

    var backBtn = bodyEl.querySelector("[data-checkout-back]");
    if (backBtn) backBtn.addEventListener("click", function () { stepIndex--; renderStep(); });
    var nextBtn = bodyEl.querySelector("[data-checkout-next]");
    if (nextBtn) nextBtn.addEventListener("click", async function () {
      if (submitting) return;
      if (stepName === "identification" || stepName === "address") { collectFields(); if (!validateStep()) return; }
      if (stepName === "payment") {
        var checked = bodyEl.querySelector('input[name="payment"]:checked');
        formData.payment = checked ? checked.value : "whatsapp";
      }
      if (stepName === "review") {
        if (formData.payment === "whatsapp") {
          // abre a aba já no clique (senão o bloqueador de popup barra
          // depois do await) e só depois aponta para o link com o nº do pedido
          var waWin = window.open("", "_blank");
          submitting = true;
          nextBtn.disabled = true;
          try {
            await registerOrder();
            handoffUrl = window.SG.waLink(buildWhatsAppMessage());
            if (waWin) {
              try { waWin.opener = null; } catch (_e) {}
              waWin.location.href = handoffUrl;
            } else {
              // Alguns navegadores mobile bloqueiam popups: há um link
              // explícito de recuperação na confirmação caso não abra.
            }
            if (window.SG.track) window.SG.track("whatsapp_click", { location: "checkout" });
            if (window.SG.cart) window.SG.cart.clear();
          } catch (_error) {
            if (waWin) try { waWin.close(); } catch (_e) {}
            var notice = bodyEl.querySelector("[data-checkout-error]");
            if (notice) {
              notice.hidden = false;
              notice.textContent = "Não foi possível preparar o WhatsApp. Tente novamente; sua sacola está salva.";
            }
            submitting = false;
            nextBtn.disabled = false;
            return;
          }
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

  return function destroy() {
    document.removeEventListener("keydown", onKeydown);
    if (unsubscribeAuth) unsubscribeAuth();
  };
}
