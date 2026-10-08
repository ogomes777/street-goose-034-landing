/* Street Goose 034 — busca premium. 100% client-side sobre o catálogo real
   (window.SG_PRODUCTS) — não depende de backend. Debounce, histórico local,
   navegação por teclado, estados vazio/carregando. */
export function mountSearchPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }

  var HISTORY_KEY = "sgSearchHistory";
  function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch (e) { return []; } }
  function saveHistory(list) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 8))); } catch (e) {} }
  function pushHistory(term) {
    if (!term.trim()) return;
    var list = loadHistory().filter(function (h) { return h.toLowerCase() !== term.toLowerCase(); });
    list.unshift(term);
    saveHistory(list);
  }

  root.innerHTML =
    '<div class="app-page-head">' +
      '<div class="search-input-wrap">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" class="search-icon"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
        '<input type="search" class="search-input" data-search-input placeholder="' + t("search.placeholder") + '" autocomplete="off" />' +
        '<button class="search-clear" data-search-clear hidden aria-label="' + t("search.clear") + '">×</button>' +
      "</div>" +
      '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    "</div>" +
    '<div class="app-page-body" data-search-results></div>';

  var input = root.querySelector("[data-search-input]");
  var clearBtn = root.querySelector("[data-search-clear]");
  var resultsEl = root.querySelector("[data-search-results]");
  var activeIndex = -1;

  var products = window.SG_PRODUCTS || [];

  function cardHtml(p, i) {
    return (
      '<a class="search-result" href="#" data-search-result="' + i + '" data-open-quickview="' + p.id + '">' +
        '<img src="' + window.SG.esc(p.images[0]) + '" alt="' + window.SG.esc(p.name) + '" loading="lazy">' +
        '<div><p class="search-result-name">' + window.SG.esc(p.name) + "</p><p class=\"search-result-cat\">" + (p.categoryLabel || p.category || "") + "</p></div>" +
      "</a>"
    );
  }

  function renderHistory() {
    var hist = loadHistory();
    if (!hist.length) { resultsEl.innerHTML = ""; return; }
    resultsEl.innerHTML =
      '<p class="search-section-label">' + t("search.recent") + "</p>" +
      '<div class="search-history">' +
      hist.map(function (h) { return '<button class="search-history-chip" data-search-history="' + window.SG.esc(h) + '">' + window.SG.esc(h) + "</button>"; }).join("") +
      "</div>";
  }

  function renderResults(term) {
    activeIndex = -1;
    var q = term.trim().toLowerCase();
    if (!q) { renderHistory(); return; }
    var matches = products.filter(function (p) {
      return p.name.toLowerCase().indexOf(q) !== -1 ||
        (p.categoryLabel || "").toLowerCase().indexOf(q) !== -1 ||
        (p.category || "").toLowerCase().indexOf(q) !== -1;
    }).slice(0, 40);
    if (!matches.length) {
      resultsEl.innerHTML = '<div class="app-page-empty"><h2>' + t("search.empty") + "</h2></div>";
      return;
    }
    resultsEl.innerHTML = '<div class="search-results-grid">' + matches.map(cardHtml).join("") + "</div>";
  }

  var debounceTimer = null;
  input.addEventListener("input", function () {
    clearBtn.hidden = !input.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { renderResults(input.value); }, 180);
  });

  input.addEventListener("keydown", function (e) {
    var items = resultsEl.querySelectorAll("[data-search-result]");
    if (e.key === "ArrowDown") { e.preventDefault(); activeIndex = Math.min(items.length - 1, activeIndex + 1); focusActive(items); }
    else if (e.key === "ArrowUp") { e.preventDefault(); activeIndex = Math.max(0, activeIndex - 1); focusActive(items); }
    else if (e.key === "Enter" && activeIndex >= 0 && items[activeIndex]) { items[activeIndex].click(); }
  });
  function focusActive(items) {
    items.forEach(function (el, i) { el.classList.toggle("is-active", i === activeIndex); });
    if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: "nearest" });
  }

  clearBtn.addEventListener("click", function () { input.value = ""; clearBtn.hidden = true; renderResults(""); input.focus(); });

  resultsEl.addEventListener("click", function (e) {
    var chip = e.target.closest("[data-search-history]");
    if (chip) { input.value = chip.getAttribute("data-search-history"); clearBtn.hidden = false; renderResults(input.value); return; }
    var result = e.target.closest("[data-search-result]");
    if (result && input.value.trim()) pushHistory(input.value.trim());
  });

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeydown);

  renderHistory();
  requestAnimationFrame(function () { input.focus(); });

  return function destroy() {
    document.removeEventListener("keydown", onKeydown);
  };
}
