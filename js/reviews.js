/* Street Goose 034 — SG Community: rail de avaliações + "mostrar meu visual".
   Sem backend real: envios ficam salvos só neste navegador (localStorage),
   claramente como pré-visualização de demo — nunca fingimos publicação
   pública nem "compra verificada" sem pedido real. */
(function () {
  "use strict";

  var STORAGE_KEY = "sgDemoReviews";
  var products = window.SG_PRODUCTS || [];
  var seedReviews = window.SG_REVIEWS || [];
  var rail = document.querySelector("[data-review-rail]");
  var modalEl = document.querySelector("[data-review-modal]");
  var body = document.querySelector("[data-review-body]");
  var MAX_PHOTO_BYTES = 5 * 1024 * 1024;
  var ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  function loadSubmitted() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  var submitted = loadSubmitted();

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(submitted)); } catch (e) {}
  }

  function findProduct(id) { return products.find(function (p) { return p.id === id; }); }

  function starsMarkup(rating) {
    var out = "";
    for (var i = 1; i <= 5; i++) {
      out += '<span class="star' + (i <= Math.round(rating) ? " is-filled" : "") + '" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7L12 17.3 5.7 21l1.7-7L2 9.2l7.1-.6z"/></svg></span>';
    }
    return out;
  }

  function cardMarkup(r) {
    var p = findProduct(r.productId);
    return (
      '<article class="review-card">' +
      (r.photo ? '<img class="review-photo" src="' + r.photo + '" alt="" width="80" height="80">' : "") +
      '<div class="review-stars" role="img" aria-label="' + Math.round(r.rating) + ' de 5 estrelas">' + starsMarkup(r.rating) + "</div>" +
      '<p class="review-comment">“' + r.comment + '”</p>' +
      '<div class="review-meta"><b>' + r.customerName + "</b>" + (p ? "<span>" + p.name + "</span>" : "") + "</div>" +
      (r.demo ? "" : '<span class="review-tag">pré-visualização</span>') +
      "</article>"
    );
  }

  function render() {
    if (!rail) return;
    var all = submitted.concat(seedReviews);
    rail.innerHTML = all.map(cardMarkup).join("");
  }

  function starInputMarkup() {
    var out = '<div class="star-input" data-star-input role="radiogroup" aria-label="Sua nota">';
    for (var i = 1; i <= 5; i++) {
      out += '<button type="button" class="star-input-btn" data-star-value="' + i + '" aria-pressed="false" aria-label="' + i + (i === 1 ? " estrela" : " estrelas") + '">' +
        '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7L12 17.3 5.7 21l1.7-7L2 9.2l7.1-.6z"/></svg></button>';
    }
    out += "</div>";
    return out;
  }

  function formHtml() {
    var options = products.map(function (p) { return '<option value="' + p.id + '">' + p.name + "</option>"; }).join("");
    return (
      '<form class="checkout-form" data-review-form novalidate>' +
      '<div class="checkout-grid">' +
      '<label class="span-2">Nome<input type="text" name="name" required autocomplete="name"></label>' +
      '<label class="span-2">Produto<select name="productId" required><option value="">Selecione</option>' + options + "</select></label>" +
      "</div>" +
      '<div><p class="field-label">Sua nota</p>' + starInputMarkup() + '<input type="hidden" name="rating" data-rating-value required></div>' +
      '<label>Comentário<textarea name="comment" rows="3" required maxlength="240"></textarea></label>' +
      '<label>Foto (opcional)<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" data-review-photo></label>' +
      '<img class="review-photo-preview" data-review-photo-preview alt="" hidden>' +
      '<p class="checkout-note">Envio de demonstração — fica salvo só neste navegador, não é publicado.</p>' +
      '<button class="btn btn-primary checkout-submit" type="submit">Enviar (demo)</button>' +
      "</form>"
    );
  }

  function wireForm() {
    var form = body.querySelector("[data-review-form]");
    if (!form) return;
    var starInput = form.querySelector("[data-star-input]");
    var ratingField = form.querySelector("[data-rating-value]");
    var photoInput = form.querySelector("[data-review-photo]");
    var photoPreview = form.querySelector("[data-review-photo-preview]");
    var photoDataUrl = null;

    starInput.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-star-value]");
      if (!btn) return;
      var value = parseInt(btn.getAttribute("data-star-value"), 10);
      ratingField.value = String(value);
      starInput.querySelectorAll("[data-star-value]").forEach(function (b) {
        var active = parseInt(b.getAttribute("data-star-value"), 10) <= value;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
    });

    photoInput.addEventListener("change", function () {
      var file = photoInput.files && photoInput.files[0];
      photoDataUrl = null;
      photoPreview.hidden = true;
      if (!file) return;
      if (ACCEPTED_TYPES.indexOf(file.type) === -1) {
        if (window.SG.toast) window.SG.toast("FORMATO NÃO ACEITO — USE JPG, PNG OU WEBP");
        photoInput.value = "";
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        if (window.SG.toast) window.SG.toast("FOTO MUITO GRANDE — LIMITE DE 5MB");
        photoInput.value = "";
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        photoDataUrl = reader.result;
        photoPreview.src = photoDataUrl;
        photoPreview.hidden = false;
      };
      reader.readAsDataURL(file);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      form.querySelectorAll(".field-error").forEach(function (n) { n.classList.remove("field-error"); });
      var invalid = [];
      form.querySelectorAll("input[required], select[required], textarea[required]").forEach(function (input) {
        if (!input.value.trim()) invalid.push(input);
      });
      if (invalid.length) {
        invalid.forEach(function (input) {
          var label = input.closest("label") || input.closest("div");
          label && label.classList.add("field-error");
        });
        invalid[0].focus();
        return;
      }
      var fd = new FormData(form);
      var review = {
        id: "demo-" + Date.now(),
        productId: fd.get("productId"),
        customerName: String(fd.get("name")).trim(),
        rating: parseInt(fd.get("rating"), 10) || 5,
        comment: String(fd.get("comment")).trim(),
        photo: photoDataUrl,
        createdAt: new Date().toISOString().slice(0, 7),
        demo: false
      };
      submitted.unshift(review);
      persist();
      render();
      if (window.SG.toast) window.SG.toast("VISUAL RECEBIDO — SALVO SÓ NESTE NAVEGADOR (DEMO)");
      form.reset();
      photoPreview.hidden = true;
      photoDataUrl = null;
      if (window.SG.closeReviewModal) window.SG.closeReviewModal();
    });
  }

  if (body) {
    body.innerHTML = formHtml();
    wireForm();
  }

  render();

  window.SG.reviews = { render: render };
})();

export {};
