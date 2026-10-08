/* Street Goose 034 — checkout foundation.
   Sem gateway de pagamento conectado ainda: a etapa final é um handoff
   estruturado para o WhatsApp, com o resumo do pedido pronto. Arquitetura
   pronta para plugar um provider real depois (ver window.SG_PAYMENT_CONFIG). */
(function () {
  "use strict";

  var body = document.querySelector("[data-checkout-body]");
  if (!body) return;

  var CEP_MASK = function (v) { return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"); };
  var PHONE_MASK = function (v) {
    v = v.replace(/\D/g, "").slice(0, 11);
    if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
    return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
  };

  function money(p) { return p.priceLabel; }

  function orderSummaryHtml(rows) {
    return (
      '<div class="checkout-summary">' +
      rows.map(function (r) {
        return (
          '<div class="checkout-summary-row">' +
          '<img src="' + window.SG.esc(r.product.images[0]) + '" alt="" width="48" height="48">' +
          "<span>" + window.SG.esc(r.product.name) + " × " + r.qty + "</span>" +
          "<b data-price-for=\"" + r.product.id + "\">" + money(r.product) + "</b></div>"
        );
      }).join("") +
      '<div class="checkout-summary-total"><span>Total</span><b data-cart-subtotal>' +
      window.SG.subtotalLabel(rows) + "</b></div></div>"
    );
  }

  function formHtml() {
    return (
      '<form class="checkout-form" data-checkout-form novalidate>' +
      '<div class="checkout-grid">' +
      '<label>Nome completo<input type="text" name="name" required autocomplete="name"></label>' +
      '<label>E-mail<input type="email" name="email" required autocomplete="email"></label>' +
      '<label>Telefone<input type="tel" name="phone" required autocomplete="tel" data-mask="phone" placeholder="(00) 00000-0000"></label>' +
      '<label>CEP<input type="text" name="cep" required data-mask="cep" placeholder="00000-000"></label>' +
      '<label class="span-2">Rua<input type="text" name="street" required autocomplete="address-line1"></label>' +
      '<label>Número<input type="text" name="number" required autocomplete="address-line2"></label>' +
      '<label>Complemento<input type="text" name="complement" autocomplete="address-line3"></label>' +
      '<label>Bairro<input type="text" name="neighborhood" required></label>' +
      '<label>Cidade<input type="text" name="city" required autocomplete="address-level2"></label>' +
      '<label>Estado<input type="text" name="state" required maxlength="2" autocomplete="address-level1" placeholder="UF"></label>' +
      "</div>" +
      '<p class="checkout-note">Frete calculado no atendimento. Pagamento finalizado com a equipe Street Goose pelo WhatsApp.</p>' +
      '<button class="btn btn-primary checkout-submit" type="submit">Finalizar pelo WhatsApp</button>' +
      "</form>"
    );
  }

  function buildWhatsAppMessage(rows, data) {
    var lines = ["Olá! Quero fechar esse pedido Street Goose 034:", ""];
    rows.forEach(function (r) {
      lines.push("• " + r.product.name + " (" + r.qty + "x) — " + money(r.product));
    });
    lines.push("");
    lines.push("Nome: " + data.name);
    lines.push("Telefone: " + data.phone);
    lines.push("E-mail: " + data.email);
    lines.push("Endereço: " + data.street + ", " + data.number + (data.complement ? " - " + data.complement : "") +
      " — " + data.neighborhood + ", " + data.city + "/" + data.state.toUpperCase() + " — CEP " + data.cep);
    return lines.join("\n");
  }

  function render() {
    var rows = window.SG.cart ? window.SG.cart.getItems() : [];
    if (!rows.length) {
      body.innerHTML = '<p class="checkout-empty">Sua sacola está vazia. <a href="#colecao" data-close-checkout>Voltar para a coleção</a></p>';
      return;
    }
    body.innerHTML = orderSummaryHtml(rows) + formHtml();

    var form = body.querySelector("[data-checkout-form]");
    form.querySelectorAll('[data-mask="cep"]').forEach(function (el) {
      el.addEventListener("input", function () { el.value = CEP_MASK(el.value); });
    });
    form.querySelectorAll('[data-mask="phone"]').forEach(function (el) {
      el.addEventListener("input", function () { el.value = PHONE_MASK(el.value); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var data = {};
      fd.forEach(function (v, k) { data[k] = String(v).trim(); });

      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
      form.querySelectorAll(".field-error").forEach(function (n) { n.classList.remove("field-error"); });
      var invalid = [];
      form.querySelectorAll("input[required]").forEach(function (input) {
        if (!input.value.trim()) invalid.push(input);
      });
      if (!emailOk) invalid.push(form.querySelector('[name="email"]'));
      if (invalid.length) {
        invalid.forEach(function (input) { input.closest("label").classList.add("field-error"); });
        invalid[0].focus();
        return;
      }

      var msg = buildWhatsAppMessage(rows, data);
      window.open(window.SG.waLink(msg), "_blank", "noopener");
      if (window.SG.toast) window.SG.toast("PEDIDO ENVIADO PARA O WHATSAPP");
      window.SG.cart.clear();
      if (window.SG.closeCheckout) window.SG.closeCheckout();
    });
  }

  window.SG.startCheckout = function () {
    render();
    if (window.SG.openCheckout) window.SG.openCheckout();
  };

  document.addEventListener("click", function (e) {
    var buyNow = e.target.closest("[data-buy-now]");
    if (buyNow) {
      e.preventDefault();
      window.SG.cart.addItem(buyNow.getAttribute("data-buy-now"), 1);
      window.SG.startCheckout();
      return;
    }
    if (e.target.closest("[data-open-checkout]")) {
      e.preventDefault();
      window.SG.startCheckout();
    }
  });
})();

export {};
