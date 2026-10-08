/* Street Goose 034 — toast minimalista, acessível, auto-dismiss.
   window.SG.toast("ADICIONADO À SACOLA") — sem alert(), sem confetti. */
(function () {
  "use strict";

  var region = document.createElement("div");
  region.className = "sg-toast-region";
  region.setAttribute("aria-live", "polite");
  region.setAttribute("role", "status");
  document.addEventListener("DOMContentLoaded", function () {
    document.body.appendChild(region);
  });
  if (document.readyState !== "loading") document.body.appendChild(region);

  window.SG.toast = function (message, opts) {
    opts = opts || {};
    var el = document.createElement("div");
    el.className = "sg-toast";
    el.textContent = message;
    region.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("is-in"); });
    var dismiss = function () {
      el.classList.remove("is-in");
      setTimeout(function () { el.remove(); }, 320);
    };
    setTimeout(dismiss, opts.duration || 2600);
    return dismiss;
  };
})();

export {};
