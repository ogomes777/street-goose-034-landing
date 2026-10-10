/* Street Goose 034 — /busca. Vitrine de busca 100% client-side sobre o
   catálogo real (window.SG_PRODUCTS, já sem peças ocultas pelo painel).
   Campo vazio: buscas recentes, sugestões, categorias com vídeo e seleção da
   casa. Digitando: cards com preço/ação, destaque do termo, filtro por
   categoria. Busca sem acento e por sinônimo ("moletom", "mochila",
   "óculos"), já que os nomes de fábrica das peças são genéricos.
   Estilo em search-page.css (carregado só quando a busca abre). */
import "./search-page.css";

export function mountSearchPage(root, _params, onClose) {
  var esc = window.SG.esc;

  // ---------- textos (PT/EN/ES) ----------
  var TEXT = {
    "pt-BR": {
      placeholder: "Buscar peça, categoria, estilo…", clear: "Limpar", close: "Fechar", esc: "ESC fecha",
      recent: "Buscas recentes", clearHistory: "Limpar histórico", suggestions: "Sugestões",
      categories: "Explorar categorias", highlights: "Seleção Street Goose", highlightsSub: "Peças que fecham o visual — escolhidas da coleção atual.",
      pieces: "peças", piece: "peça", all: "Todas",
      results: function (n, q) { return (n === 1 ? "1 peça para " : n + " peças para ") + "“" + q + "”"; },
      none: function (q) { return "Nada com “" + q + "” por aqui."; },
      noneHint: "Tenta outra palavra — ou fala direto com a gente que a gente procura pra você.",
      ask: "Perguntar no WhatsApp", askMsg: function (q) { return "Olá! Procurei “" + q + "” no site da Street Goose 034. Vocês têm?"; },
      add: "Adicionar à sacola", consult: "Consultar no WhatsApp", soldOut: "Esgotado", fav: "Favoritar", see: "Ver"
    },
    en: {
      placeholder: "Search piece, category, style…", clear: "Clear", close: "Close", esc: "ESC to close",
      recent: "Recent searches", clearHistory: "Clear history", suggestions: "Suggestions",
      categories: "Browse categories", highlights: "Street Goose selection", highlightsSub: "Pieces that complete the look — picked from the current collection.",
      pieces: "pieces", piece: "piece", all: "All",
      results: function (n, q) { return (n === 1 ? "1 piece for " : n + " pieces for ") + "“" + q + "”"; },
      none: function (q) { return "Nothing for “" + q + "” here."; },
      noneHint: "Try another word — or message us and we'll look for it.",
      ask: "Ask on WhatsApp", askMsg: function (q) { return "Hi! I searched for “" + q + "” on the Street Goose 034 site. Do you have it?"; },
      add: "Add to bag", consult: "Ask on WhatsApp", soldOut: "Sold out", fav: "Favorite", see: "View"
    },
    es: {
      placeholder: "Buscar pieza, categoría, estilo…", clear: "Limpiar", close: "Cerrar", esc: "ESC cierra",
      recent: "Búsquedas recientes", clearHistory: "Borrar historial", suggestions: "Sugerencias",
      categories: "Explorar categorías", highlights: "Selección Street Goose", highlightsSub: "Piezas que cierran el look — elegidas de la colección actual.",
      pieces: "piezas", piece: "pieza", all: "Todas",
      results: function (n, q) { return (n === 1 ? "1 pieza para " : n + " piezas para ") + "“" + q + "”"; },
      none: function (q) { return "Nada con “" + q + "” por aquí."; },
      noneHint: "Prueba otra palabra — o escríbenos y lo buscamos por ti.",
      ask: "Preguntar por WhatsApp", askMsg: function (q) { return "¡Hola! Busqué “" + q + "” en el sitio de Street Goose 034. ¿Lo tienen?"; },
      add: "Agregar a la bolsa", consult: "Consultar por WhatsApp", soldOut: "Agotado", fav: "Favorito", see: "Ver"
    }
  };
  function L() {
    var lang = window.SG.i18n ? window.SG.i18n.get() : "pt-BR";
    return TEXT[lang] || TEXT["pt-BR"];
  }

  // ---------- busca: sem acento + sinônimos ----------
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }
  var CATEGORY_WORDS = {
    lupa: "lupa lupas oculos oculos de sol sol solar armacao lente",
    acessorios: "acessorio acessorios",
    relogios: "relogio relogios watch pulso",
    perfumes: "perfume perfumes fragrancia colonia arabe importado",
    trajes: "traje trajes moletom moletons blusa blusa de frio casaco hoodie roupa agasalho frio"
  };
  var PIECE_WORDS = {
    "acessorios-02": "mochila bolsa backpack",
    "acessorios-03": "chapeu bucket",
    "acessorios-07": "chapeu bucket",
    "acessorios-04": "colete",
    "acessorios-06": "colete",
    "relogios-03": "quadrado cronografo"
  };
  var SUGGESTIONS = [
    { label: "Lupas", q: "lupa" },
    { label: "Relógios", q: "relógio" },
    { label: "Perfumes", q: "perfume" },
    { label: "Blusa de frio", q: "blusa de frio" },
    { label: "Mochila", q: "mochila" },
    { label: "Chapéu", q: "chapéu" },
    { label: "Colete", q: "colete" }
  ];

  function haystack(p) {
    return norm([p.name, p.categoryLabel, p.category, p.desc, CATEGORY_WORDS[p.category] || "", PIECE_WORDS[p.id] || ""].join(" "));
  }
  function search(term) {
    var q = norm(term);
    if (!q) return [];
    // frase inteira primeiro (ex: "blusa de frio"); senão todas as palavras
    var tokens = q.split(/\s+/).filter(Boolean);
    return products().filter(function (p) {
      var h = haystack(p);
      return h.indexOf(q) !== -1 || tokens.every(function (tk) { return h.indexOf(tk) !== -1; });
    });
  }
  function products() { return (window.SG_PRODUCTS || []).filter(function (p) { return p && p.images && p.images.length; }); }
  function categories() { return window.SG_CATALOG || []; }
  function catMeta(id) {
    return categories().filter(function (c) { return c.id === id; })[0] || { a: "#ff5a00", b: "#0a0a0a", label: id };
  }

  // ---------- histórico ----------
  var HISTORY_KEY = "sgSearchHistory";
  function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]").filter(function (h) { return typeof h === "string"; }); } catch (e) { return []; } }
  function saveHistory(list) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 8))); } catch (e) {} }
  function pushHistory(term) {
    term = String(term || "").trim().slice(0, 60);
    if (!term) return;
    var list = loadHistory().filter(function (h) { return norm(h) !== norm(term); });
    list.unshift(term);
    saveHistory(list);
  }

  // ---------- peças ----------
  var ICON = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-10-9.4C.4 7.6 2 4 5.6 4 8 4 10 5.4 12 8c2-2.6 4-4 6.4-4C22 4 23.6 7.6 22 11.1 19.5 15.9 12 20.5 12 20.5z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/><path d="M12 11v5M9.5 13.5h5"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/></svg>'
  };

  function highlight(name, term) {
    var safe = esc(name);
    var q = String(term || "").trim();
    if (q.length < 2) return safe;
    var i = name.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return safe;
    return esc(name.slice(0, i)) + "<mark>" + esc(name.slice(i, i + q.length)) + "</mark>" + esc(name.slice(i + q.length));
  }

  function cardHtml(p, i, term) {
    var t = L();
    var cat = catMeta(p.category);
    var fav = window.SG.wishlist && window.SG.wishlist.isFavorite && window.SG.wishlist.isFavorite(p.id);
    var action = p.soldOut
      ? '<span class="sp-card-sold">' + esc(t.soldOut) + "</span>"
      : p.consultWhatsApp
        ? '<a class="sp-card-act sp-card-act--wa" href="' + esc(window.SG.waProductLink(p)) + '" target="_blank" rel="noopener" aria-label="' + esc(t.consult + " — " + p.name) + '">' + ICON.chat + "</a>"
        : '<button class="sp-card-act" type="button" data-add-to-cart="' + esc(p.id) + '" aria-label="' + esc(t.add + " — " + p.name) + '">' + ICON.bag + "</button>";
    return (
      '<article class="sp-card' + (p.soldOut ? " is-sold" : "") + '" style="--i:' + Math.min(i, 14) + ";--ca:" + esc(cat.a) + ";--cb:" + esc(cat.b) + '">' +
        '<a class="sp-card-hit" href="#" data-search-result data-open-quickview="' + esc(p.id) + '">' +
          '<span class="sp-card-media"><img src="' + esc(p.images[0]) + '" alt="' + esc(p.alt || p.name) + '" loading="lazy" decoding="async"></span>' +
          '<span class="sp-card-tag">' + esc(cat.label || p.categoryLabel || "") + "</span>" +
          '<span class="sp-card-name">' + highlight(p.name, term) + "</span>" +
        "</a>" +
        '<div class="sp-card-foot"><span class="sp-card-price' + (p.price ? "" : " is-soft") + '">' + esc(p.priceLabel || "") + "</span>" + action + "</div>" +
        '<button class="sp-card-fav favorite-btn' + (fav ? " is-active" : "") + '" type="button" data-favorite-toggle="' + esc(p.id) + '" aria-pressed="' + (fav ? "true" : "false") + '" aria-label="' + esc(t.fav + " — " + p.name) + '">' + ICON.heart + "</button>" +
      "</article>"
    );
  }

  function categoriesHtml() {
    var t = L();
    return categories().filter(function (c) { return c.count > 0; }).map(function (c, i) {
      // capa = 1º frame do loop da categoria; o vídeo entra por cima dela
      // (mountCatVideos) — no reduced motion a capa fica sozinha
      return (
        '<a class="sp-cat" href="/categoria/' + esc(c.slug) + '" data-sp-cat="' + esc(c.slug) + '" style="--i:' + i + ";--ca:" + esc(c.a) + ";--cb:" + esc(c.b) + '">' +
          '<img class="sp-cat-bg" src="' + esc(c.heroPoster) + '" alt="" loading="lazy" decoding="async">' +
          '<span class="sp-cat-shade"></span>' +
          '<span class="sp-cat-text"><span class="sp-cat-label">' + esc(c.label) + "</span>" +
          '<span class="sp-cat-count">' + c.count + " " + esc(c.count === 1 ? t.piece : t.pieces) + "</span></span>" +
          '<span class="sp-cat-go">' + ICON.arrow + "</span>" +
        "</a>"
      );
    }).join("");
  }

  // seleção da casa: alterna categorias (até 2 por categoria), sem esgotados
  function highlights() {
    var picked = [];
    var pools = categories().map(function (c) {
      return (c.items || []).filter(function (p) { return !p.soldOut && p.images && p.images.length; });
    });
    for (var round = 0; round < 2; round++) {
      pools.forEach(function (pool) { if (pool[round]) picked.push(pool[round]); });
    }
    return picked.slice(0, 10);
  }

  // ---------- estrutura ----------
  var t0 = L();
  root.classList.add("is-search"); // fundo próprio da busca (search-page.css)
  root.innerHTML =
    '<div class="sp-head">' +
      '<label class="sp-field">' +
        '<span class="sp-field-icon">' + ICON.search + "</span>" +
        '<input type="search" class="sp-input" data-search-input placeholder="' + esc(t0.placeholder) + '" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="' + esc(t0.placeholder) + '">' +
        '<button class="sp-clear" type="button" data-search-clear hidden aria-label="' + esc(t0.clear) + '">' + ICON.close + "</button>" +
        '<kbd class="sp-kbd">' + esc(t0.esc) + "</kbd>" +
      "</label>" +
      '<button class="sp-close" type="button" data-app-close aria-label="' + esc(t0.close) + '">' + ICON.close + "</button>" +
    "</div>" +
    '<div class="sp-body" data-search-results aria-live="polite"></div>';

  var input = root.querySelector("[data-search-input]");
  var clearBtn = root.querySelector("[data-search-clear]");
  var resultsEl = root.querySelector("[data-search-results]");
  var activeIndex = -1;
  var activeFilter = "all";

  function section(title, icon, inner, extra, i) {
    return (
      '<section class="sp-section" style="--i:' + i + '">' +
        '<div class="sp-section-head"><h2 class="sp-section-title">' + (icon || "") + esc(title) + "</h2>" + (extra || "") + "</div>" +
        inner +
      "</section>"
    );
  }

  // ---------- vídeo nos cards de categoria ----------
  // Mesmo preview em loop dos cards da home (category-portals.js). Cada
  // <video> nasce uma vez por categoria e só troca de card quando a lista
  // redesenha (digitar, trocar idioma, catálogo mudar): é reinserido na mesma
  // tarefa, então segue tocando de onde estava, sem recarregar nem piscar.
  // Só toca o card visível e com a aba aberta.
  var reducedMotion = window.SG.prefersReducedMotion();
  var catVideos = {}; // slug -> <video>
  var onScreen = new WeakMap(); // card -> visível?
  var videoIo = null;

  function catVideo(c) {
    var v = catVideos[c.slug];
    if (v) return v;
    v = document.createElement("video");
    v.className = "sp-cat-video";
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute("playsinline", ""); // alguns iOS antigos só respeitam o atributo
    v.setAttribute("aria-hidden", "true");
    v.preload = "metadata";
    v.src = c.heroPreview;
    // só aparece com frame decodificado — antes disso fica a capa
    function markReady() {
      if (v.readyState >= 2 && v.parentNode) v.parentNode.classList.add("is-video-ready");
    }
    v.addEventListener("loadeddata", markReady);
    v.addEventListener("playing", markReady);
    catVideos[c.slug] = v;
    return v;
  }

  function syncCard(card) {
    var v = card.querySelector(".sp-cat-video");
    if (!v) return;
    if (onScreen.get(card) && !document.hidden) {
      // autoplay bloqueado (economia de bateria) só rejeita: a capa fica
      var p = v.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    } else {
      v.pause();
    }
  }

  if (!reducedMotion && "IntersectionObserver" in window) {
    videoIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { onScreen.set(e.target, e.isIntersecting); syncCard(e.target); });
    }, { threshold: 0.25 });
  }

  function mountCatVideos() {
    if (!videoIo) return;
    videoIo.disconnect(); // cards antigos saíram do DOM junto com o innerHTML
    resultsEl.querySelectorAll("[data-sp-cat]").forEach(function (card) {
      var slug = card.getAttribute("data-sp-cat");
      var c = categories().filter(function (x) { return x.slug === slug; })[0];
      if (!c || !c.heroPreview) return;
      var v = catVideo(c);
      var bg = card.querySelector(".sp-cat-bg");
      card.insertBefore(v, bg ? bg.nextSibling : card.firstChild);
      if (v.readyState >= 2) card.classList.add("is-video-ready");
      videoIo.observe(card);
    });
  }

  function setResults(html) {
    resultsEl.innerHTML = html;
    mountCatVideos();
  }

  function onVisibility() {
    resultsEl.querySelectorAll("[data-sp-cat]").forEach(syncCard);
  }
  document.addEventListener("visibilitychange", onVisibility);

  function renderIdle() {
    var t = L();
    activeIndex = -1;
    var html = "";
    var hist = loadHistory();
    var n = 0;
    if (hist.length) {
      html += section(t.recent, ICON.clock,
        '<div class="sp-chips">' + hist.map(function (h) {
          return '<button class="sp-chip sp-chip--recent" type="button" data-search-term="' + esc(h) + '">' + ICON.clock + esc(h) + "</button>";
        }).join("") + "</div>",
        '<button class="sp-link" type="button" data-clear-history>' + esc(t.clearHistory) + "</button>", n++);
    }
    html += section(t.suggestions, ICON.spark,
      '<div class="sp-chips">' + SUGGESTIONS.map(function (s) {
        return '<button class="sp-chip" type="button" data-search-term="' + esc(s.q) + '">' + esc(s.label) + ICON.arrow + "</button>";
      }).join("") + "</div>", "", n++);
    html += section(t.categories, "", '<div class="sp-cats">' + categoriesHtml() + "</div>", "", n++);
    var picks = highlights();
    if (picks.length) {
      html += section(t.highlights, "",
        '<p class="sp-section-sub">' + esc(t.highlightsSub) + "</p>" +
        '<div class="sp-grid">' + picks.map(function (p, i) { return cardHtml(p, i, ""); }).join("") + "</div>", "", n++);
    }
    setResults(html);
  }

  function renderResults(term) {
    var t = L();
    activeIndex = -1;
    var q = term.trim();
    if (!q) { activeFilter = "all"; renderIdle(); return; }
    var all = search(q);
    if (!all.length) {
      setResults(
        '<div class="sp-empty">' +
          '<span class="sp-empty-icon">' + ICON.search + "</span>" +
          '<h2 class="sp-empty-title">' + esc(t.none(q)) + "</h2>" +
          '<p class="sp-empty-text">' + esc(t.noneHint) + "</p>" +
          '<a class="sp-empty-cta" href="' + esc(window.SG.waLink(t.askMsg(q))) + '" target="_blank" rel="noopener">' + ICON.chat + esc(t.ask) + "</a>" +
          '<div class="sp-chips sp-chips--center">' + SUGGESTIONS.map(function (s) {
            return '<button class="sp-chip" type="button" data-search-term="' + esc(s.q) + '">' + esc(s.label) + "</button>";
          }).join("") + "</div>" +
        "</div>" +
        section(t.categories, "", '<div class="sp-cats">' + categoriesHtml() + "</div>", "", 1));
      return;
    }
    // filtro por categoria (contagem dentro do resultado)
    var counts = {};
    all.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    var cats = categories().filter(function (c) { return counts[c.id]; });
    if (activeFilter !== "all" && !counts[activeFilter]) activeFilter = "all";
    var shown = activeFilter === "all" ? all : all.filter(function (p) { return p.category === activeFilter; });
    var filters = cats.length > 1
      ? '<div class="sp-filters" role="tablist">' +
          '<button class="sp-filter' + (activeFilter === "all" ? " is-active" : "") + '" type="button" role="tab" aria-selected="' + (activeFilter === "all") + '" data-filter="all">' + esc(t.all) + "<b>" + all.length + "</b></button>" +
          cats.map(function (c) {
            var on = activeFilter === c.id;
            return '<button class="sp-filter' + (on ? " is-active" : "") + '" type="button" role="tab" aria-selected="' + on + '" data-filter="' + esc(c.id) + '" style="--ca:' + esc(c.a) + '">' + esc(c.label) + "<b>" + counts[c.id] + "</b></button>";
          }).join("") +
        "</div>"
      : "";
    setResults(
      '<div class="sp-results-head"><p class="sp-results-count">' + esc(t.results(all.length, q)) + "</p>" + filters + "</div>" +
      '<div class="sp-grid sp-grid--results">' + shown.slice(0, 60).map(function (p, i) { return cardHtml(p, i, q); }).join("") + "</div>");
  }

  // ---------- eventos ----------
  var debounceTimer = null;
  input.addEventListener("input", function () {
    clearBtn.hidden = !input.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { renderResults(input.value); }, 140);
  });

  function hits() { return resultsEl.querySelectorAll("[data-search-result]"); }
  function focusActive() {
    var items = hits();
    items.forEach(function (el, i) { el.closest(".sp-card").classList.toggle("is-active", i === activeIndex); });
    if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  input.addEventListener("keydown", function (e) {
    var items = hits();
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight" && input.selectionStart === input.value.length) {
      e.preventDefault(); activeIndex = Math.min(items.length - 1, activeIndex + 1); focusActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); activeIndex = Math.max(0, activeIndex - 1); focusActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (input.value.trim()) pushHistory(input.value);
      if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].click();
    }
  });

  clearBtn.addEventListener("click", function () {
    input.value = ""; clearBtn.hidden = true; activeFilter = "all"; renderResults(""); input.focus();
  });

  resultsEl.addEventListener("click", function (e) {
    var term = e.target.closest("[data-search-term]");
    if (term) {
      input.value = term.getAttribute("data-search-term");
      clearBtn.hidden = false; activeFilter = "all";
      renderResults(input.value);
      input.focus();
      return;
    }
    if (e.target.closest("[data-clear-history]")) { saveHistory([]); renderIdle(); return; }
    var filter = e.target.closest("[data-filter]");
    if (filter) { activeFilter = filter.getAttribute("data-filter"); renderResults(input.value); return; }
    if (e.target.closest("[data-search-result], [data-add-to-cart], .sp-card-act--wa") && input.value.trim()) pushHistory(input.value);
  });

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  // captura: roda antes do popup.js fechar a quick view — ESC com a peça
  // aberta fecha só a peça, não a busca inteira
  function onKeydown(e) { if (e.key === "Escape" && !document.querySelector(".quickview.is-open")) onClose(); }
  document.addEventListener("keydown", onKeydown, true);
  // painel mudou o catálogo (catalog-sync) ou trocou o idioma: redesenha
  function refresh() { renderResults(input.value); }
  window.addEventListener("sg:catalog", refresh);
  function onLang() { input.placeholder = L().placeholder; refresh(); }
  document.addEventListener("sg:lang-change", onLang);

  renderIdle();
  requestAnimationFrame(function () { input.focus(); });

  return function destroy() {
    root.classList.remove("is-search");
    document.removeEventListener("keydown", onKeydown, true);
    window.removeEventListener("sg:catalog", refresh);
    document.removeEventListener("sg:lang-change", onLang);
    document.removeEventListener("visibilitychange", onVisibility);
    clearTimeout(debounceTimer);
    if (videoIo) videoIo.disconnect();
    // solta decoder e buffer na hora, sem esperar o GC
    Object.keys(catVideos).forEach(function (slug) {
      var v = catVideos[slug];
      v.pause();
      v.removeAttribute("src");
      v.load();
    });
  };
}
