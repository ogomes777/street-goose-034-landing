/* Street Goose 034 — /admin, painel do lojista: pedidos, clientes,
   moderação da comunidade, cupons/recompensas e newsletter.
   A UI só pergunta is_admin() para decidir o que mostrar — quem protege os
   dados é o banco (migration 0100): não-admin que forçasse as chamadas
   recebe 'forbidden' / zero linhas. Todo texto vindo de cliente (nome,
   legenda, endereço) passa por esc() — o painel roda com a sessão do dono. */
export function mountAdminPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }

  var TABS = [
    { id: "pedidos", label: "Pedidos" },
    { id: "precos", label: "Preços" },
    { id: "clientes", label: "Clientes" },
    { id: "comunidade", label: "Comunidade" },
    { id: "cupons", label: "Cupons & Recompensas" },
    { id: "newsletter", label: "Newsletter" },
  ];
  var ORDER_STATUS = {
    pending_payment: "Aguardando",
    paid: "Pago",
    fulfilled: "Enviado",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
  };
  var POST_STATUS = { pending: "Pendente", approved: "Aprovada", rejected: "Rejeitada" };
  var REWARD_KIND = { coupon: "Cupom", gift: "Brinde", discount: "Desconto" };
  var REJECT_REASONS = ["Foto sem peça Street Goose", "Imagem com baixa qualidade", "Conteúdo impróprio", "Foto de outra pessoa/marca"];
  var MAX_ROWS = 400;

  var svc = null, money = null, csv = null;
  var destroyed = false;
  var unsubscribeAuth = null;
  var currentUserId; // undefined = ainda não checado
  var searchTimer = null;
  var seq = {};
  var state = {
    tab: tabFromUrl(),
    overview: null,
    orderStatus: "pending_payment", orderSearch: "", orders: [], openOrderId: null,
    customerSearch: "", customers: [],
    postStatus: "pending", posts: [], rejectingPostId: null,
    coupons: [], rewards: [], levels: [], editingCoupon: null, editingReward: null,
    newsletterFilter: "active", newsletterSearch: "", subscribers: [],
    priceCategory: "lupa", priceSearch: "", prices: {}, pricesLoaded: false,
  };

  var robots = document.createElement("meta");
  robots.name = "robots";
  robots.content = "noindex, nofollow";
  document.head.appendChild(robots);

  root.innerHTML =
    '<div class="app-page-head admin-head">' +
      '<div class="admin-head-title"><p class="admin-eyebrow">STREET GOOSE 034</p><h1>Painel</h1></div>' +
      '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    "</div>" +
    '<div class="app-page-body admin-body" data-admin-body><div class="app-page-loading">' + t("common.loading") + "</div></div>";

  var bodyEl = root.querySelector("[data-admin-body]");

  // ---------- helpers ----------
  var esc = window.SG.esc;
  var DATE_TIME = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  var DATE_ONLY = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  function fmtDateTime(iso) { return iso ? DATE_TIME.format(new Date(iso)) : "—"; }
  function fmtDate(iso) { return iso ? DATE_ONLY.format(new Date(iso)) : "—"; }
  function brl(cents) { return window.SG.formatPrice(Number(cents) || 0); }
  function toast(msg) { if (window.SG.toast) window.SG.toast(msg); }
  function nextSeq(key) { seq[key] = (seq[key] || 0) + 1; return seq[key]; }
  function stale(key, n) { return destroyed || seq[key] !== n; }
  function loading() { return '<div class="admin-state">' + t("common.loading") + "</div>"; }
  function errorState(message, retry) {
    return '<div class="admin-state admin-state--error"><p>' + esc(message) + '</p><button class="btn btn-ghost" type="button" data-action="retry" data-retry="' + retry + '">Tentar de novo</button></div>';
  }
  function emptyState(message) { return '<div class="admin-state"><p>' + esc(message) + "</p></div>"; }
  function chip(action, value, label, active, count) {
    return '<button class="admin-chip' + (active ? " is-active" : "") + '" type="button" data-action="' + action + '" data-value="' + value + '" aria-pressed="' + active + '">' +
      esc(label) + (count != null ? " <span>" + count + "</span>" : "") + "</button>";
  }
  function tabFromUrl() {
    var tab = new URLSearchParams(location.search).get("tab");
    return TABS.some(function (x) { return x.id === tab; }) ? tab : "pedidos";
  }
  function waLink(phone) {
    var digits = String(phone || "").replace(/\D/g, "");
    if (digits.length < 10) return "";
    return "https://wa.me/" + (digits.length <= 11 ? "55" + digits : digits);
  }
  function dateInput(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dateFromInput(value, endOfDay) {
    if (!value) return null;
    var p = value.split("-").map(Number);
    return (endOfDay ? new Date(p[0], p[1] - 1, p[2], 23, 59, 59) : new Date(p[0], p[1] - 1, p[2])).toISOString();
  }
  function setFormError(form, message) {
    var el = form.querySelector("[data-form-error]");
    if (!el) return;
    el.textContent = message || "";
    el.hidden = !message;
  }
  function field(form, name) { return form.querySelector('[name="' + name + '"]'); }
  function setBusy(form, busy) {
    form.querySelectorAll("button").forEach(function (b) { b.disabled = busy; });
  }

  async function loadDeps() {
    if (svc) return;
    var mods = await Promise.all([
      import("../src/services/AdminService.ts"),
      import("../src/lib/money.ts"),
      import("../src/lib/csv.ts"),
    ]);
    svc = mods[0].AdminService;
    money = mods[1];
    csv = mods[2];
  }

  // ---------- gate ----------
  async function gate() {
    await loadDeps();
    if (destroyed) return;
    if (!svc.isConfigured()) {
      bodyEl.innerHTML = restrictedHtml("Painel indisponível", "O backend da loja ainda não está configurado neste ambiente.", "");
      return;
    }
    var authMod = await import("../src/services/AuthService.ts");
    var session = await authMod.AuthService.getSession();
    if (destroyed) return;
    currentUserId = session ? session.user.id : null;
    if (!unsubscribeAuth) {
      unsubscribeAuth = authMod.AuthService.onAuthStateChange(function (_event, s) {
        var id = s ? s.user.id : null;
        // fora do callback: chamar o supabase dentro dele pode travar o lock de auth
        if (id !== currentUserId) setTimeout(function () { if (!destroyed) gate(); }, 0);
      });
    }
    if (!session) {
      bodyEl.innerHTML = restrictedHtml("Acesso restrito", "Entre com a conta da equipe Street Goose para abrir o painel.",
        '<button class="btn btn-primary" type="button" data-action="login">Entrar</button>');
      return;
    }
    bodyEl.innerHTML = loading();
    var isAdmin = await svc.isAdmin();
    if (destroyed) return;
    if (!isAdmin) {
      bodyEl.innerHTML = restrictedHtml("Acesso restrito", "Esta conta não tem acesso de lojista. Se você é da equipe, peça para liberarem seu acesso.",
        '<a class="btn btn-ghost" href="/">Voltar para a loja</a>');
      return;
    }
    renderShell();
  }

  function restrictedHtml(title, text, action) {
    return '<div class="admin-gate">' +
      '<span class="admin-gate-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/></svg></span>' +
      '<p class="admin-eyebrow">ÁREA DA EQUIPE</p><h2>' + esc(title) + "</h2><p>" + esc(text) + "</p>" + action + "</div>";
  }

  // ---------- shell ----------
  function renderShell() {
    bodyEl.innerHTML =
      '<div class="admin-kpis" data-admin-kpis aria-live="polite"></div>' +
      '<div class="admin-tabs" role="tablist" aria-label="Seções do painel">' +
        TABS.map(function (tab) {
          var active = tab.id === state.tab;
          return '<button class="admin-tab' + (active ? " is-active" : "") + '" type="button" role="tab" id="admin-tab-' + tab.id + '" aria-controls="admin-panel" aria-selected="' + active + '" tabindex="' + (active ? 0 : -1) + '" data-admin-tab="' + tab.id + '">' +
            esc(tab.label) + '<span class="admin-tab-badge" data-tab-badge="' + tab.id + '" hidden></span></button>';
        }).join("") +
      "</div>" +
      '<section class="admin-panel" id="admin-panel" role="tabpanel" aria-labelledby="admin-tab-' + state.tab + '" data-admin-panel></section>';
    loadOverview();
    renderPanel();
  }

  async function loadOverview() {
    var n = nextSeq("overview");
    var res = await svc.overview();
    if (stale("overview", n) || !res.ok) return;
    var o = res.data;
    state.overview = o;
    var kpis = bodyEl.querySelector("[data-admin-kpis]");
    if (!kpis) return;
    kpis.innerHTML = [
      ["Pedidos aguardando", o.orders_pending, o.orders_pending > 0],
      ["Pagos · 30 dias", o.orders_paid_30d],
      ["Faturado · 30 dias", brl(o.revenue_30d_cents)],
      ["Fotos para moderar", o.posts_pending, o.posts_pending > 0],
      ["Clientes", o.customers],
      ["Newsletter ativa", o.newsletter_active],
    ].map(function (k) {
      return '<div class="admin-kpi' + (k[2] ? " is-hot" : "") + '"><span>' + esc(k[0]) + "</span><b>" + esc(k[1]) + "</b></div>";
    }).join("");
    setBadge("pedidos", o.orders_pending);
    setBadge("comunidade", o.posts_pending);
  }

  function setBadge(tab, count) {
    var el = bodyEl.querySelector('[data-tab-badge="' + tab + '"]');
    if (!el) return;
    el.textContent = count > 99 ? "99+" : String(count);
    el.hidden = !count;
  }

  function selectTab(id, focus) {
    if (id === state.tab && bodyEl.querySelector("[data-admin-panel]").childElementCount) return;
    state.tab = id;
    bodyEl.querySelectorAll("[data-admin-tab]").forEach(function (b) {
      var active = b.getAttribute("data-admin-tab") === id;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
      b.tabIndex = active ? 0 : -1;
      if (active && focus) b.focus();
    });
    var panel = bodyEl.querySelector("[data-admin-panel]");
    panel.setAttribute("aria-labelledby", "admin-tab-" + id);
    try { history.replaceState(history.state, "", "/admin" + (id === "pedidos" ? "" : "?tab=" + id)); } catch (e) {}
    renderPanel();
  }

  function renderPanel() {
    var panel = bodyEl.querySelector("[data-admin-panel]");
    if (!panel) return;
    if (state.tab === "pedidos") { panel.innerHTML = ordersToolbar() + '<div class="admin-list" data-list="orders"></div>'; loadOrders(); }
    else if (state.tab === "precos") { panel.innerHTML = pricesShell(); renderPriceCategory(); loadPrices(); }
    else if (state.tab === "clientes") { panel.innerHTML = customersToolbar() + '<div data-list="customers"></div>'; loadCustomers(); }
    else if (state.tab === "comunidade") { panel.innerHTML = postsToolbar() + '<div data-list="posts"></div>'; loadPosts(); }
    else if (state.tab === "cupons") { panel.innerHTML = promoShell(); loadPromo(); }
    else if (state.tab === "newsletter") { panel.innerHTML = '<div data-newsletter-toolbar></div><div data-list="newsletter"></div>'; loadNewsletter(); }
  }

  function list(name) { return bodyEl.querySelector('[data-list="' + name + '"]'); }

  // ---------- pedidos ----------
  function ordersToolbar() {
    var statuses = [["pending_payment", "Aguardando"], ["paid", "Pagos"], ["fulfilled", "Enviados"], ["cancelled", "Cancelados"], ["refunded", "Reembolsados"], ["all", "Todos"]];
    return '<div class="admin-toolbar">' +
      '<div class="admin-chips" role="group" aria-label="Filtrar pedidos por status">' +
        statuses.map(function (s) { return chip("order-filter", s[0], s[1], state.orderStatus === s[0]); }).join("") +
      "</div>" +
      '<label class="admin-search"><span class="sr-only">Buscar pedidos</span><input type="search" data-search="orders" placeholder="#pedido, e-mail, nome ou telefone" value="' + esc(state.orderSearch) + '" autocomplete="off"></label>' +
    "</div>";
  }

  async function loadOrders() {
    var el = list("orders");
    if (!el) return;
    var n = nextSeq("orders");
    el.innerHTML = loading();
    var res = await svc.listOrders({ status: state.orderStatus === "all" ? null : state.orderStatus, search: state.orderSearch });
    if (stale("orders", n)) return;
    if (!res.ok) { el.innerHTML = errorState(res.message, "orders"); return; }
    state.orders = res.data;
    if (!state.orders.length) {
      el.innerHTML = emptyState(state.orderSearch ? "Nenhum pedido encontrado para essa busca." : state.orderStatus === "pending_payment" ? "Nenhum pedido aguardando. Tudo em dia." : "Nenhum pedido aqui ainda.");
      return;
    }
    el.innerHTML = state.orders.map(orderHtml).join("");
  }

  function orderHtml(o) {
    var ship = o.shipping_address || {};
    var name = ship.name || o.customer.display_name || "Cliente";
    var itemCount = o.items.reduce(function (sum, i) { return sum + i.qty; }, 0);
    var open = state.openOrderId === o.id;
    var wa = waLink(ship.phone);
    return '<article class="admin-order' + (open ? " is-open" : "") + '" data-order-id="' + o.id + '">' +
      '<button class="admin-order-summary" type="button" data-action="order-toggle" data-id="' + o.id + '" aria-expanded="' + open + '" aria-controls="order-' + o.id + '">' +
        '<span class="admin-order-id">#' + esc(o.short_id) + "</span>" +
        '<span class="admin-order-customer"><b>' + esc(name) + "</b><small>" + esc(o.customer.email || ship.email || "") + "</small></span>" +
        '<span class="admin-order-meta">' + itemCount + (itemCount === 1 ? " item" : " itens") + " · " + fmtDateTime(o.created_at) + "</span>" +
        '<span class="admin-order-total">' + (o.total_cents ? brl(o.total_cents) : "A confirmar") + "</span>" +
        '<span class="admin-status admin-status--' + o.status + '">' + ORDER_STATUS[o.status] + "</span>" +
      "</button>" +
      '<div class="admin-order-detail" id="order-' + o.id + '"' + (open ? "" : " hidden") + ">" +
        '<div class="admin-order-info">' +
          '<div><h3>Cliente</h3><p>' + esc(name) + "<br>" + esc(ship.email || o.customer.email || "") + "<br>" + esc(ship.phone || "—") + "</p>" +
            (wa ? '<a class="admin-link" href="' + esc(wa) + '" target="_blank" rel="noopener">Abrir WhatsApp</a>' : "") + "</div>" +
          '<div><h3>Entrega</h3><p>' + (ship.street
            ? esc(ship.street) + ", " + esc(ship.number) + (ship.complement ? " — " + esc(ship.complement) : "") + "<br>" +
              esc(ship.neighborhood) + " · " + esc(ship.city) + "/" + esc(ship.state) + "<br>CEP " + esc(ship.cep)
            : "Sem endereço informado") + "</p></div>" +
          '<div><h3>Pagamento</h3><p>' + esc(o.payment_method === "whatsapp" ? "Fechado pelo WhatsApp" : o.payment_method || "—") +
            (o.coupon_code ? "<br>Cupom " + esc(o.coupon_code) : "") + "<br>Atualizado " + fmtDateTime(o.updated_at) + "</p></div>" +
        "</div>" +
        '<form class="admin-order-form" data-form="order" data-id="' + o.id + '" novalidate>' +
          '<div class="admin-items" role="table" aria-label="Itens do pedido">' +
            o.items.map(function (i) {
              return '<div class="admin-item" role="row">' +
                '<span class="admin-item-name" role="cell">' + esc(i.product_name) + "<small>" + esc(i.product_id) + "</small></span>" +
                '<span class="admin-item-qty" role="cell">× ' + i.qty + "</span>" +
                '<label class="admin-money" role="cell"><span class="sr-only">Preço unitário de ' + esc(i.product_name) + '</span><em>R$</em><input inputmode="decimal" data-item-price="' + i.id + '" data-qty="' + i.qty + '" value="' + money.centsToInput(i.unit_price_cents) + '" placeholder="0,00"></label>' +
              "</div>";
            }).join("") +
          "</div>" +
          '<div class="admin-order-totals">' +
            '<p>Subtotal <b data-subtotal>' + brl(o.subtotal_cents) + "</b></p>" +
            '<label class="admin-field">Total cobrado<span class="admin-money"><em>R$</em><input inputmode="decimal" name="total" value="' + money.centsToInput(o.total_cents) + '" placeholder="0,00"' + (o.total_cents !== o.subtotal_cents ? " data-dirty" : "") + '></span><small>Inclua frete ou desconto, se houver.</small></label>' +
          "</div>" +
          '<div class="admin-form-row">' +
            '<label class="admin-field">Status<select name="status">' +
              Object.keys(ORDER_STATUS).map(function (s) { return '<option value="' + s + '"' + (s === o.status ? " selected" : "") + ">" + ORDER_STATUS[s] + "</option>"; }).join("") +
            "</select></label>" +
            '<label class="admin-field admin-field--grow">Nota interna<textarea name="note" rows="2" maxlength="1000" placeholder="Só a equipe vê">' + esc(o.staff_note || "") + "</textarea></label>" +
          "</div>" +
          '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
          '<div class="admin-form-actions">' +
            (o.status === "pending_payment" ? '<button class="btn btn-primary" type="button" data-action="order-mark-paid" data-id="' + o.id + '">Salvar e marcar pago</button>' : "") +
            '<button class="btn ' + (o.status === "pending_payment" ? "btn-ghost" : "btn-primary") + '" type="submit">Salvar</button>' +
          "</div>" +
        "</form>" +
      "</div>" +
    "</article>";
  }

  function recalcOrderForm(form) {
    var subtotal = 0, valid = true;
    form.querySelectorAll("[data-item-price]").forEach(function (input) {
      var cents = money.parseMoneyToCents(input.value);
      input.classList.toggle("is-invalid", cents === null);
      if (cents === null) valid = false;
      else subtotal += cents * Number(input.getAttribute("data-qty"));
    });
    form.querySelector("[data-subtotal]").textContent = valid ? brl(subtotal) : "—";
    var total = form.querySelector('[name="total"]');
    if (valid && !total.hasAttribute("data-dirty")) total.value = money.centsToInput(subtotal);
  }

  async function saveOrder(form, forceStatus) {
    var id = form.getAttribute("data-id");
    var order = state.orders.find(function (o) { return o.id === id; });
    if (!order) return;
    setFormError(form, "");
    var patch = {};
    var itemPrices = [];
    var invalid = false;
    form.querySelectorAll("[data-item-price]").forEach(function (input) {
      var cents = money.parseMoneyToCents(input.value);
      if (cents === null) { invalid = true; return; }
      var item = order.items.find(function (i) { return i.id === input.getAttribute("data-item-price"); });
      if (item && item.unit_price_cents !== cents) itemPrices.push({ id: item.id, unitPriceCents: cents });
    });
    if (invalid) { setFormError(form, "Confira os preços — use o formato 197,00."); return; }
    if (itemPrices.length) patch.itemPrices = itemPrices;

    var totalRaw = form.querySelector('[name="total"]').value;
    var total = money.parseMoneyToCents(totalRaw);
    if (total === null) { setFormError(form, "Total inválido — use o formato 197,00."); return; }
    if (total !== order.total_cents || itemPrices.length) patch.totalCents = total;

    var status = forceStatus || form.querySelector('[name="status"]').value;
    if (status !== order.status) patch.status = status;
    if ((status === "paid" || status === "fulfilled") && total <= 0) {
      setFormError(form, "Defina o total do pedido antes de marcar como pago.");
      return;
    }
    var note = form.querySelector('[name="note"]').value;
    if (note.trim() !== (order.staff_note || "")) patch.staffNote = note;

    if (!Object.keys(patch).length) { toast("NADA PARA SALVAR"); return; }
    setBusy(form, true);
    var res = await svc.updateOrder(id, patch);
    if (destroyed) return;
    setBusy(form, false);
    if (!res.ok) { setFormError(form, res.message); return; }
    toast(patch.status ? "PEDIDO #" + order.short_id + " — " + ORDER_STATUS[patch.status].toUpperCase() : "PEDIDO #" + order.short_id + " SALVO");
    loadOrders();
    loadOverview();
  }

  // ---------- preços ----------
  // Fonte única: public.product_prices — a mesma que grava o preço do pedido
  // (create_whatsapp_order) e que o site aplica no boot (js/price-sync.js).
  function priceCategory() {
    var cats = window.SG_CATALOG || [];
    return cats.find(function (c) { return c.id === state.priceCategory; }) || cats[0] || null;
  }
  function findCatalogItem(id) {
    var found = null;
    (window.SG_CATALOG || []).some(function (c) {
      found = c.items.find(function (i) { return i.id === id; }) || null;
      return !!found;
    });
    return found;
  }
  function siteLabelWithoutPrice(item) {
    return window.SG.priceLabelFor ? window.SG.priceLabelFor(item.category, null) : "Consultar disponibilidade";
  }

  function pricesShell() {
    var cats = window.SG_CATALOG || [];
    return '<div class="admin-toolbar">' +
        '<div class="admin-chips" role="group" aria-label="Categoria">' + cats.map(function (c) {
          return chip("price-cat", c.id, c.label, state.priceCategory === c.id, c.count);
        }).join("") + "</div>" +
        '<label class="admin-search"><span class="sr-only">Buscar peça</span><input type="search" data-search="prices" placeholder="Buscar peça ou código" value="' + esc(state.priceSearch) + '" autocomplete="off"></label>' +
      "</div>" +
      '<p class="admin-hint">Vale para pedidos novos e aparece no site na hora. Pedidos já registrados mantêm o preço que tinham. Peça sem preço aparece como "Consultar" no site.</p>' +
      "<div data-price-bulk></div>" +
      '<div data-list="prices"></div>';
  }

  function renderPriceCategory() {
    var cat = priceCategory();
    var bulk = bodyEl.querySelector("[data-price-bulk]");
    if (!cat || !bulk) return;
    bulk.innerHTML =
      '<form class="admin-bulk" data-form="price-bulk" novalidate>' +
        '<p class="admin-bulk-title"><b>' + esc(cat.label) + "</b> · " + cat.count + " peças<span data-price-unpriced></span></p>" +
        '<div class="admin-bulk-row">' +
          '<label class="admin-money"><span class="sr-only">Mesmo preço para todas as peças de ' + esc(cat.label) + '</span><em>R$</em><input name="price" inputmode="decimal" placeholder="Mesmo preço para todas" autocomplete="off"></label>' +
          '<button class="btn btn-ghost" type="submit" data-bulk-submit>Aplicar a todas</button>' +
          '<button class="admin-text-btn" type="button" data-action="bulk-cancel" hidden>Cancelar</button>' +
        "</div>" +
        '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
      "</form>";
    renderPriceList();
  }

  async function loadPrices() {
    var el = list("prices");
    if (!el) return;
    var n = nextSeq("prices");
    if (!state.pricesLoaded) el.innerHTML = loading();
    var res = await svc.listPrices();
    if (stale("prices", n)) return;
    if (!res.ok) { el.innerHTML = errorState(res.message, "prices"); return; }
    state.prices = res.data;
    state.pricesLoaded = true;
    renderPriceList();
  }

  function renderUnpricedCount() {
    var cat = priceCategory();
    var counter = bodyEl.querySelector("[data-price-unpriced]");
    if (!cat || !counter || !state.pricesLoaded) return;
    var unpriced = cat.items.filter(function (i) { return !state.prices[i.id]; }).length;
    counter.textContent = unpriced ? " · " + unpriced + " sem preço" : " · todas com preço";
  }

  function renderPriceList() {
    var el = list("prices");
    var cat = priceCategory();
    if (!el || !cat || !state.pricesLoaded) return;
    renderUnpricedCount();
    var q = state.priceSearch.trim().toLowerCase();
    var items = cat.items.filter(function (i) { return !q || i.name.toLowerCase().indexOf(q) !== -1 || i.id.indexOf(q) !== -1; });
    el.innerHTML = items.length ? '<div class="admin-prices">' + items.map(priceRowHtml).join("") + "</div>" : emptyState("Nenhuma peça encontrada.");
  }

  function priceRowHtml(item) {
    var row = state.prices[item.id];
    var cents = row ? row.price_cents : null;
    return '<form class="admin-price' + (cents ? "" : " is-unpriced") + '" data-form="price" data-id="' + esc(item.id) + '" novalidate>' +
      '<img class="admin-price-thumb" src="' + esc(item.images[0]) + '" alt="" loading="lazy" width="56" height="56">' +
      '<div class="admin-price-info"><b>' + esc(item.name) + "</b>" +
        "<small>" + esc(item.id) + (row ? " · " + fmtDateTime(row.updated_at) : "") + "</small>" +
        (cents ? "" : '<small class="admin-price-site">No site: ' + esc(siteLabelWithoutPrice(item)) + "</small>") +
      "</div>" +
      '<label class="admin-money"><span class="sr-only">Preço de ' + esc(item.name) + '</span><em>R$</em><input name="price" inputmode="decimal" value="' + money.centsToInput(cents) + '" placeholder="Sem preço" autocomplete="off"></label>' +
      '<div class="admin-price-actions">' +
        '<button class="btn btn-ghost" type="submit">Salvar</button>' +
        (cents ? '<button class="admin-text-btn" type="button" data-action="price-clear" data-id="' + esc(item.id) + '">Tirar preço</button>' : "") +
      "</div>" +
      '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
    "</form>";
  }

  function priceForm(id) {
    var el = list("prices");
    return el ? el.querySelector('[data-form="price"][data-id="' + id + '"]') : null;
  }

  function pricesChanged(ids, cents) {
    var now = new Date().toISOString();
    ids.forEach(function (id) {
      if (cents) state.prices[id] = { product_id: id, price_cents: cents, updated_at: now };
      else delete state.prices[id];
    });
    if (ids.length === 1) {
      var formEl = priceForm(ids[0]);
      var item = findCatalogItem(ids[0]);
      if (formEl && item) formEl.outerHTML = priceRowHtml(item);
      renderUnpricedCount();
    } else {
      renderPriceList();
    }
    // o próprio site atrás do painel já passa a mostrar o preço novo
    if (window.SG.prices) window.SG.prices.refresh();
  }

  // Enter num preço salva e já leva para a próxima peça (perfumes: 40 preços)
  function focusNextPrice(id) {
    var formEl = priceForm(id);
    var next = formEl && formEl.nextElementSibling;
    var input = next && next.querySelector('[name="price"]');
    if (input) { input.focus(); input.select(); }
  }

  async function savePrice(form) {
    var id = form.getAttribute("data-id");
    var current = state.prices[id] ? state.prices[id].price_cents : null;
    var raw = field(form, "price").value.trim();
    var item = findCatalogItem(id);
    setFormError(form, "");
    if (!raw) {
      if (current === null) { toast("NADA PARA SALVAR"); return; }
      clearPrice(id, form);
      return;
    }
    var cents = money.parseMoneyToCents(raw);
    if (cents === null) { setFormError(form, "Use o formato 197,00."); return; }
    if (cents <= 0) { setFormError(form, "O preço precisa ser maior que zero. Para tirar o preço, deixe o campo vazio."); return; }
    if (cents === current) { toast("NADA PARA SALVAR"); return; }
    setBusy(form, true);
    var res = await svc.setPrices([{ productId: id, priceCents: cents }]);
    if (destroyed) return;
    setBusy(form, false);
    if (!res.ok) { setFormError(form, res.message); return; }
    pricesChanged([id], cents);
    toast((item ? item.name : id).toUpperCase() + " — " + brl(cents));
    focusNextPrice(id);
  }

  async function clearPrice(id, form) {
    var item = findCatalogItem(id);
    if (form) setBusy(form, true);
    var res = await svc.clearPrices([id]);
    if (destroyed) return;
    if (form) setBusy(form, false);
    if (!res.ok) { if (form) setFormError(form, res.message); return; }
    pricesChanged([id], null);
    toast((item ? item.name : id).toUpperCase() + " — SEM PREÇO");
  }

  function resetBulk(form) {
    if (!form || !form.hasAttribute("data-confirm")) return;
    form.removeAttribute("data-confirm");
    var btn = form.querySelector("[data-bulk-submit]");
    btn.textContent = "Aplicar a todas";
    btn.classList.add("btn-ghost");
    btn.classList.remove("btn-primary");
    form.querySelector('[data-action="bulk-cancel"]').hidden = true;
  }

  // dois cliques: o primeiro mostra quantas peças e o valor, o segundo grava
  async function applyBulk(form) {
    var cat = priceCategory();
    if (!cat) return;
    var cents = money.parseMoneyToCents(field(form, "price").value);
    if (cents === null || cents <= 0) { setFormError(form, "Informe um preço maior que zero, ex: 197,00."); return; }
    var btn = form.querySelector("[data-bulk-submit]");
    if (form.getAttribute("data-confirm") !== String(cents)) {
      form.setAttribute("data-confirm", String(cents));
      btn.textContent = "Confirmar: " + cat.count + " peças por " + brl(cents);
      btn.classList.add("btn-primary");
      btn.classList.remove("btn-ghost");
      form.querySelector('[data-action="bulk-cancel"]').hidden = false;
      return;
    }
    var ids = cat.items.map(function (i) { return i.id; });
    setBusy(form, true);
    var res = await svc.setPrices(ids.map(function (pid) { return { productId: pid, priceCents: cents }; }));
    if (destroyed) return;
    setBusy(form, false);
    if (!res.ok) { setFormError(form, res.message); return; }
    resetBulk(form);
    field(form, "price").value = "";
    pricesChanged(ids, cents);
    toast(cat.label.toUpperCase() + " — " + cat.count + " PEÇAS POR " + brl(cents));
  }

  // ---------- clientes ----------
  function customersToolbar() {
    return '<div class="admin-toolbar">' +
      '<label class="admin-search"><span class="sr-only">Buscar clientes</span><input type="search" data-search="customers" placeholder="Nome, e-mail ou @apelido" value="' + esc(state.customerSearch) + '" autocomplete="off"></label>' +
      '<button class="btn btn-ghost admin-export" type="button" data-action="export-customers">Exportar CSV</button>' +
    "</div>";
  }

  async function loadCustomers() {
    var el = list("customers");
    if (!el) return;
    var n = nextSeq("customers");
    el.innerHTML = loading();
    var res = await svc.listCustomers(state.customerSearch);
    if (stale("customers", n)) return;
    if (!res.ok) { el.innerHTML = errorState(res.message, "customers"); return; }
    state.customers = res.data;
    if (!state.customers.length) { el.innerHTML = emptyState(state.customerSearch ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."); return; }
    var rows = state.customers.slice(0, MAX_ROWS);
    el.innerHTML =
      '<table class="admin-table"><thead><tr><th scope="col">Cliente</th><th scope="col">Desde</th><th scope="col">Pedidos</th><th scope="col">Gasto</th><th scope="col">XP</th><th scope="col"><span class="sr-only">Marcas</span></th></tr></thead><tbody>' +
      rows.map(function (c) {
        var tags = [];
        if (c.is_admin) tags.push('<span class="admin-tag admin-tag--accent">Equipe</span>');
        if (c.newsletter) tags.push('<span class="admin-tag">Newsletter</span>');
        if (c.ranking_opt_in) tags.push('<span class="admin-tag">Ranking</span>');
        return "<tr>" +
          '<td data-label="Cliente"><span class="admin-cell"><b>' + esc(c.display_name || c.public_handle || "Sem nome") + "</b><small>" + esc(c.email) + "</small></span></td>" +
          '<td data-label="Desde"><span class="admin-cell">' + fmtDate(c.created_at) + "</span></td>" +
          '<td data-label="Pedidos"><span class="admin-cell">' + c.paid_order_count + " pagos <small>de " + c.order_count + "</small></span></td>" +
          '<td data-label="Gasto"><span class="admin-cell">' + brl(c.total_spent_cents) + "</span></td>" +
          '<td data-label="XP"><span class="admin-cell">' + c.total_xp + " <small>nível " + c.level + "</small></span></td>" +
          '<td data-label="Marcas" class="admin-table-tags"><span class="admin-cell">' + (tags.join("") || '<small>—</small>') + "</span></td>" +
        "</tr>";
      }).join("") +
      "</tbody></table>" +
      (state.customers.length > MAX_ROWS ? '<p class="admin-note">Mostrando ' + MAX_ROWS + " de " + state.customers.length + " — use a busca ou exporte o CSV.</p>" : "");
  }

  function exportCustomers() {
    if (!state.customers.length) { toast("NADA PARA EXPORTAR"); return; }
    var rows = state.customers.map(function (c) {
      return [c.display_name, c.email, c.public_handle, dateInput(c.created_at), c.order_count, c.paid_order_count, (c.total_spent_cents / 100).toFixed(2).replace(".", ","), c.total_xp, c.level, c.newsletter ? "sim" : "não"];
    });
    // ";" — separador que o Excel em pt-BR abre em colunas (Sheets detecta sozinho)
    csv.downloadCsv("street-goose-clientes-" + dateInput(new Date().toISOString()) + ".csv",
      csv.toCsv(["nome", "email", "apelido", "cliente_desde", "pedidos", "pedidos_pagos", "total_gasto_reais", "xp", "nivel", "newsletter"], rows, ";"));
  }

  // ---------- comunidade ----------
  function postsToolbar() {
    return '<div class="admin-toolbar"><div class="admin-chips" role="group" aria-label="Filtrar publicações">' +
      [["pending", "Pendentes"], ["approved", "Aprovadas"], ["rejected", "Rejeitadas"], ["all", "Todas"]].map(function (s) {
        return chip("post-filter", s[0], s[1], state.postStatus === s[0]);
      }).join("") + "</div></div>";
  }

  async function loadPosts() {
    var el = list("posts");
    if (!el) return;
    var n = nextSeq("posts");
    el.innerHTML = loading();
    var res = await svc.listPosts(state.postStatus === "all" ? null : state.postStatus);
    if (stale("posts", n)) return;
    if (!res.ok) { el.innerHTML = errorState(res.message, "posts"); return; }
    state.posts = res.data;
    if (!state.posts.length) { el.innerHTML = emptyState(state.postStatus === "pending" ? "Nenhuma foto esperando moderação." : "Nada por aqui."); return; }
    el.innerHTML = '<div class="admin-posts">' + state.posts.map(postHtml).join("") + "</div>";
  }

  function postHtml(p) {
    var author = p.author.display_name || (p.author.public_handle ? "@" + p.author.public_handle : "") || "Cliente";
    var rejecting = state.rejectingPostId === p.id;
    return '<article class="admin-post" data-post-id="' + p.id + '">' +
      (p.image_url
        ? '<a class="admin-post-media" href="' + esc(p.image_url) + '" target="_blank" rel="noopener" aria-label="Abrir foto em tamanho real"><img src="' + esc(p.image_url) + '" alt="Foto enviada por ' + esc(author) + '" loading="lazy"></a>'
        : '<div class="admin-post-media admin-post-media--empty">Imagem indisponível</div>') +
      '<div class="admin-post-body">' +
        '<div class="admin-post-head"><p><b>' + esc(author) + "</b><small>" + esc(p.author.email || "") + "</small></p>" +
          '<span class="admin-status admin-status--' + p.status + '">' + POST_STATUS[p.status] + "</span></div>" +
        (p.caption ? '<p class="admin-post-caption">' + esc(p.caption) + "</p>" : "") +
        '<p class="admin-post-meta">' + fmtDateTime(p.created_at) + (p.rating ? " · " + p.rating + "/5" : "") + (p.product_id ? " · " + esc(p.product_id) : "") + "</p>" +
        (p.status === "rejected" && p.rejection_reason ? '<p class="admin-post-reason">Motivo: ' + esc(p.rejection_reason) + "</p>" : "") +
        (rejecting
          ? '<form class="admin-reject" data-form="reject" data-id="' + p.id + '" novalidate>' +
              '<div class="admin-chips admin-chips--small">' + REJECT_REASONS.map(function (r) {
                return '<button class="admin-chip" type="button" data-action="reject-reason" data-value="' + esc(r) + '">' + esc(r) + "</button>";
              }).join("") + "</div>" +
              '<label class="admin-field">Motivo da rejeição<textarea name="reason" rows="2" maxlength="500" required></textarea></label>' +
              '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
              '<div class="admin-form-actions"><button class="btn btn-ghost" type="button" data-action="reject-cancel">Cancelar</button><button class="btn btn-primary" type="submit">Rejeitar</button></div>' +
            "</form>"
          : '<div class="admin-form-actions">' +
              (p.status !== "approved" ? '<button class="btn btn-primary" type="button" data-action="post-approve" data-id="' + p.id + '">Aprovar</button>' : "") +
              (p.status !== "rejected" ? '<button class="btn btn-ghost" type="button" data-action="post-reject" data-id="' + p.id + '">' + (p.status === "approved" ? "Tirar do ar" : "Rejeitar") + "</button>" : "") +
            "</div>") +
      "</div>" +
    "</article>";
  }

  async function moderate(id, status, reason, form) {
    if (form) setBusy(form, true);
    var res = await svc.moderatePost(id, status, reason);
    if (destroyed) return;
    if (form) setBusy(form, false);
    if (!res.ok) {
      if (form) setFormError(form, res.message);
      else { toast(res.message.toUpperCase()); loadPosts(); }
      return;
    }
    state.rejectingPostId = null;
    toast(status === "approved" ? "FOTO APROVADA — JÁ ESTÁ NO FEED" : "FOTO REJEITADA");
    loadPosts();
    loadOverview();
  }

  // ---------- cupons & recompensas ----------
  function promoShell() {
    return '<div class="admin-split">' +
      '<section class="admin-section" aria-labelledby="admin-coupons-title">' +
        '<div class="admin-section-head"><h2 id="admin-coupons-title">Cupons</h2><button class="btn btn-ghost" type="button" data-action="coupon-new">Novo cupom</button></div>' +
        '<div data-coupon-editor></div><div data-list="coupons"></div>' +
      "</section>" +
      '<section class="admin-section" aria-labelledby="admin-rewards-title">' +
        '<div class="admin-section-head"><h2 id="admin-rewards-title">Recompensas</h2><button class="btn btn-ghost" type="button" data-action="reward-new">Nova recompensa</button></div>' +
        '<div data-reward-editor></div><div data-list="rewards"></div>' +
      "</section>" +
    "</div>";
  }

  async function loadPromo() {
    var n = nextSeq("promo");
    var cEl = list("coupons"), rEl = list("rewards");
    cEl.innerHTML = loading();
    rEl.innerHTML = loading();
    var results = await Promise.all([svc.listCoupons(), svc.listRewards(), state.levels.length ? Promise.resolve(state.levels) : svc.listLevels()]);
    if (stale("promo", n)) return;
    state.levels = results[2];
    if (!results[0].ok) cEl.innerHTML = errorState(results[0].message, "promo");
    else { state.coupons = results[0].data; renderCoupons(); }
    if (!results[1].ok) rEl.innerHTML = errorState(results[1].message, "promo");
    else { state.rewards = results[1].data; renderRewards(); }
  }

  function couponDiscount(c) {
    if (c.discount_percent) return c.discount_percent + "%";
    if (c.discount_cents) return brl(c.discount_cents);
    return "—";
  }

  function renderCoupons() {
    var el = list("coupons");
    if (!el) return;
    if (!state.coupons.length) { el.innerHTML = emptyState("Nenhum cupom criado."); return; }
    el.innerHTML = '<ul class="admin-cards">' + state.coupons.map(function (c) {
      var expired = c.valid_until && new Date(c.valid_until) < new Date();
      return '<li class="admin-card' + (c.active ? "" : " is-off") + '">' +
        '<div class="admin-card-main"><p class="admin-code">' + esc(c.code) + "</p>" +
          "<p>" + couponDiscount(c) + " off · " + c.uses_count + (c.max_uses ? " / " + c.max_uses : "") + " usos</p>" +
          "<small>" + (c.valid_until ? (expired ? "Expirou " : "Até ") + fmtDate(c.valid_until) : "Sem data de fim") + "</small></div>" +
        '<div class="admin-card-side"><span class="admin-status admin-status--' + (c.active && !expired ? "on" : "off") + '">' + (c.active ? (expired ? "Expirado" : "Ativo") : "Inativo") + "</span>" +
          '<div class="admin-card-actions"><button class="admin-text-btn" type="button" data-action="coupon-edit" data-id="' + esc(c.code) + '">Editar</button>' +
          '<button class="admin-text-btn" type="button" data-action="coupon-toggle" data-id="' + esc(c.code) + '">' + (c.active ? "Desativar" : "Ativar") + "</button></div></div>" +
      "</li>";
    }).join("") + "</ul>";
  }

  function couponEditorHtml(c) {
    var isNew = !c;
    c = c || { code: "", discount_percent: 10, discount_cents: null, max_uses: null, valid_from: new Date().toISOString(), valid_until: null, active: true };
    var kind = c.discount_cents ? "cents" : "percent";
    return '<form class="admin-editor" data-form="coupon" data-new="' + isNew + '" novalidate>' +
      '<h3>' + (isNew ? "Novo cupom" : "Editar " + esc(c.code)) + "</h3>" +
      '<div class="admin-form-grid">' +
        '<label class="admin-field">Código<input name="code" value="' + esc(c.code) + '" maxlength="32" autocapitalize="characters" autocomplete="off" placeholder="RUA034"' + (isNew ? "" : " readonly") + "></label>" +
        '<label class="admin-field">Tipo<select name="kind"><option value="percent"' + (kind === "percent" ? " selected" : "") + '>% de desconto</option><option value="cents"' + (kind === "cents" ? " selected" : "") + ">Valor fixo (R$)</option></select></label>" +
        '<label class="admin-field">Desconto<input name="amount" inputmode="decimal" value="' + (kind === "percent" ? esc(c.discount_percent || "") : money.centsToInput(c.discount_cents)) + '" placeholder="10"></label>' +
        '<label class="admin-field">Limite de usos<input name="max_uses" inputmode="numeric" value="' + esc(c.max_uses || "") + '" placeholder="Sem limite"></label>' +
        '<label class="admin-field">Começa em<input type="date" name="valid_from" value="' + dateInput(c.valid_from) + '"></label>' +
        '<label class="admin-field">Termina em<input type="date" name="valid_until" value="' + dateInput(c.valid_until) + '"></label>' +
      "</div>" +
      '<label class="admin-check"><input type="checkbox" name="active"' + (c.active ? " checked" : "") + "> Ativo</label>" +
      '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
      '<div class="admin-form-actions"><button class="btn btn-ghost" type="button" data-action="coupon-cancel">Cancelar</button><button class="btn btn-primary" type="submit">Salvar cupom</button></div>' +
    "</form>";
  }

  function openCouponEditor(coupon) {
    var el = bodyEl.querySelector("[data-coupon-editor]");
    el.innerHTML = couponEditorHtml(coupon);
    var first = el.querySelector(coupon ? '[name="amount"]' : '[name="code"]');
    if (first) first.focus();
  }

  async function saveCoupon(form) {
    setFormError(form, "");
    var isNew = form.getAttribute("data-new") === "true";
    var code = field(form, "code").value.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) { setFormError(form, "Código com 3 a 32 caracteres: letras, números, - ou _."); return; }
    var kind = field(form, "kind").value;
    var percent = null, cents = null;
    if (kind === "percent") {
      percent = Number(field(form, "amount").value.replace(",", "."));
      if (!Number.isInteger(percent) || percent < 1 || percent > 100) { setFormError(form, "Desconto em % deve ser um número inteiro de 1 a 100."); return; }
    } else {
      cents = money.parseMoneyToCents(field(form, "amount").value);
      if (!cents) { setFormError(form, "Informe o valor do desconto, ex: 20,00."); return; }
    }
    var maxUses = field(form, "max_uses").value.trim() ? Number(field(form, "max_uses").value) : null;
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) { setFormError(form, "Limite de usos deve ser um número inteiro."); return; }
    var from = dateFromInput(field(form, "valid_from").value, false) || new Date().toISOString();
    var until = dateFromInput(field(form, "valid_until").value, true);
    if (until && until < from) { setFormError(form, "A data de fim vem antes do início."); return; }
    if (isNew && state.coupons.some(function (c) { return c.code === code; })) { setFormError(form, "Já existe um cupom com esse código."); return; }

    setBusy(form, true);
    var res = await svc.saveCoupon({ code: code, discount_percent: percent, discount_cents: cents, max_uses: maxUses, valid_from: from, valid_until: until, active: field(form, "active").checked }, isNew);
    if (destroyed) return;
    setBusy(form, false);
    if (!res.ok) { setFormError(form, res.message); return; }
    bodyEl.querySelector("[data-coupon-editor]").innerHTML = "";
    toast("CUPOM " + code + " SALVO");
    loadPromo();
  }

  function renderRewards() {
    var el = list("rewards");
    if (!el) return;
    if (!state.rewards.length) { el.innerHTML = emptyState("Nenhuma recompensa criada."); return; }
    el.innerHTML = '<ul class="admin-cards">' + state.rewards.map(function (r) {
      var level = state.levels.find(function (l) { return l.level_number === r.requirement_level; });
      return '<li class="admin-card' + (r.active ? "" : " is-off") + '">' +
        '<div class="admin-card-main"><p class="admin-card-title">' + esc(r.title) + "</p>" +
          "<p>" + REWARD_KIND[r.kind] + " · " + (level ? "Nível " + level.level_number + " — " + esc(level.name) : "Livre") +
            (r.coupon_code ? " · " + esc(r.coupon_code) : "") + (r.discount_percent ? " · " + r.discount_percent + "%" : "") + "</p>" +
          "<small>" + r.redemptions + (r.redemptions === 1 ? " resgate" : " resgates") + "</small></div>" +
        '<div class="admin-card-side"><span class="admin-status admin-status--' + (r.active ? "on" : "off") + '">' + (r.active ? "Ativa" : "Inativa") + "</span>" +
          '<div class="admin-card-actions"><button class="admin-text-btn" type="button" data-action="reward-edit" data-id="' + r.id + '">Editar</button>' +
          '<button class="admin-text-btn" type="button" data-action="reward-toggle" data-id="' + r.id + '">' + (r.active ? "Desativar" : "Ativar") + "</button></div></div>" +
      "</li>";
    }).join("") + "</ul>";
  }

  function rewardEditorHtml(r) {
    var isNew = !r;
    r = r || { title: "", description: "", kind: "coupon", requirement_level: null, coupon_code: "", discount_percent: null, active: true };
    return '<form class="admin-editor" data-form="reward" data-id="' + (isNew ? "" : r.id) + '" novalidate>' +
      "<h3>" + (isNew ? "Nova recompensa" : "Editar recompensa") + "</h3>" +
      '<div class="admin-form-grid">' +
        '<label class="admin-field admin-field--wide">Título<input name="title" value="' + esc(r.title) + '" maxlength="80" placeholder="Bucket hat 034"></label>' +
        '<label class="admin-field admin-field--wide">Descrição<textarea name="description" rows="2" maxlength="300">' + esc(r.description) + "</textarea></label>" +
        '<label class="admin-field">Tipo<select name="kind">' + Object.keys(REWARD_KIND).map(function (k) {
          return '<option value="' + k + '"' + (k === r.kind ? " selected" : "") + ">" + REWARD_KIND[k] + "</option>";
        }).join("") + "</select></label>" +
        '<label class="admin-field">Nível mínimo<select name="level"><option value="">Livre</option>' + state.levels.map(function (l) {
          return '<option value="' + l.level_number + '"' + (l.level_number === r.requirement_level ? " selected" : "") + ">" + l.level_number + " — " + esc(l.name) + "</option>";
        }).join("") + "</select></label>" +
        '<label class="admin-field">Cupom entregue<input name="coupon_code" value="' + esc(r.coupon_code || "") + '" list="admin-coupon-codes" maxlength="32" autocomplete="off" placeholder="Opcional"></label>' +
        '<datalist id="admin-coupon-codes">' + state.coupons.map(function (c) { return '<option value="' + esc(c.code) + '">'; }).join("") + "</datalist>" +
        '<label class="admin-field">Desconto %<input name="discount_percent" inputmode="numeric" value="' + esc(r.discount_percent || "") + '" placeholder="Opcional"></label>' +
      "</div>" +
      '<label class="admin-check"><input type="checkbox" name="active"' + (r.active ? " checked" : "") + "> Ativa (aparece em /recompensas)</label>" +
      '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
      '<div class="admin-form-actions"><button class="btn btn-ghost" type="button" data-action="reward-cancel">Cancelar</button><button class="btn btn-primary" type="submit">Salvar recompensa</button></div>' +
    "</form>";
  }

  function openRewardEditor(reward) {
    var el = bodyEl.querySelector("[data-reward-editor]");
    el.innerHTML = rewardEditorHtml(reward);
    el.querySelector('[name="title"]').focus();
  }

  async function saveReward(form) {
    setFormError(form, "");
    var title = field(form, "title").value.trim();
    var description = field(form, "description").value.trim();
    if (!title || !description) { setFormError(form, "Título e descrição são obrigatórios."); return; }
    var pct = field(form, "discount_percent").value.trim() ? Number(field(form, "discount_percent").value) : null;
    if (pct !== null && (!Number.isInteger(pct) || pct < 1 || pct > 100)) { setFormError(form, "Desconto % deve ser um inteiro de 1 a 100."); return; }
    var code = field(form, "coupon_code").value.trim().toUpperCase();
    if (field(form, "kind").value === "coupon" && !code) { setFormError(form, "Recompensa do tipo cupom precisa de um código."); return; }
    if (code && !state.coupons.some(function (c) { return c.code === code; })) { setFormError(form, "O cupom " + code + " não existe — crie ele primeiro."); return; }
    setBusy(form, true);
    var res = await svc.saveReward({
      id: form.getAttribute("data-id") || undefined,
      title: title, description: description, kind: field(form, "kind").value,
      requirement_level: field(form, "level").value ? Number(field(form, "level").value) : null,
      coupon_code: code || null, discount_percent: pct, active: field(form, "active").checked,
    });
    if (destroyed) return;
    setBusy(form, false);
    if (!res.ok) { setFormError(form, res.message); return; }
    bodyEl.querySelector("[data-reward-editor]").innerHTML = "";
    toast("RECOMPENSA SALVA");
    loadPromo();
  }

  // ---------- newsletter ----------
  function filteredSubscribers() {
    var q = state.newsletterSearch.trim().toLowerCase();
    return state.subscribers.filter(function (s) {
      var active = !s.unsubscribed_at;
      if (state.newsletterFilter === "active" && !active) return false;
      if (state.newsletterFilter === "inactive" && active) return false;
      return !q || s.email.indexOf(q) !== -1;
    });
  }

  async function loadNewsletter() {
    var el = list("newsletter");
    if (!el) return;
    var n = nextSeq("newsletter");
    el.innerHTML = loading();
    var res = await svc.listNewsletter();
    if (stale("newsletter", n)) return;
    if (!res.ok) { el.innerHTML = errorState(res.message, "newsletter"); return; }
    state.subscribers = res.data;
    renderNewsletterToolbar();
    renderNewsletterList();
  }

  function renderNewsletterToolbar() {
    var bar = bodyEl.querySelector("[data-newsletter-toolbar]");
    if (!bar) return;
    var active = state.subscribers.filter(function (s) { return !s.unsubscribed_at; }).length;
    bar.innerHTML = '<div class="admin-toolbar">' +
      '<div class="admin-chips" role="group" aria-label="Filtrar inscritos">' +
        chip("news-filter", "active", "Ativos", state.newsletterFilter === "active", active) +
        chip("news-filter", "inactive", "Descadastrados", state.newsletterFilter === "inactive", state.subscribers.length - active) +
        chip("news-filter", "all", "Todos", state.newsletterFilter === "all", state.subscribers.length) +
      "</div>" +
      '<label class="admin-search"><span class="sr-only">Buscar e-mail</span><input type="search" data-search="newsletter" placeholder="Buscar e-mail" value="' + esc(state.newsletterSearch) + '" autocomplete="off"></label>' +
      '<button class="btn btn-ghost admin-export" type="button" data-action="export-newsletter">Exportar CSV</button>' +
    "</div>";
  }

  function renderNewsletterList() {
    var el = list("newsletter");
    if (!el) return;
    var rows = filteredSubscribers();
    if (!rows.length) { el.innerHTML = emptyState(state.subscribers.length ? "Nenhum e-mail nesse filtro." : "Ninguém inscrito ainda."); return; }
    el.innerHTML =
      '<table class="admin-table"><thead><tr><th scope="col">E-mail</th><th scope="col">Idioma</th><th scope="col">Inscrito em</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Ação</span></th></tr></thead><tbody>' +
      rows.slice(0, MAX_ROWS).map(function (s) {
        var active = !s.unsubscribed_at;
        return "<tr>" +
          '<td data-label="E-mail"><span class="admin-cell"><b>' + esc(s.email) + "</b></span></td>" +
          '<td data-label="Idioma"><span class="admin-cell">' + esc(s.locale) + "</span></td>" +
          '<td data-label="Inscrito em"><span class="admin-cell">' + fmtDate(s.subscribed_at) + "</span></td>" +
          '<td data-label="Status"><span class="admin-cell"><span class="admin-status admin-status--' + (active ? "on" : "off") + '">' + (active ? "Ativo" : "Saiu " + fmtDate(s.unsubscribed_at)) + "</span></span></td>" +
          '<td data-label="Ação"><span class="admin-cell"><button class="admin-text-btn" type="button" data-action="news-toggle" data-id="' + esc(s.email) + '">' + (active ? "Descadastrar" : "Reativar") + "</button></span></td>" +
        "</tr>";
      }).join("") +
      "</tbody></table>" +
      (rows.length > MAX_ROWS ? '<p class="admin-note">Mostrando ' + MAX_ROWS + " de " + rows.length + " — o CSV leva todos.</p>" : "");
  }

  function exportNewsletter() {
    var rows = filteredSubscribers();
    if (!rows.length) { toast("NADA PARA EXPORTAR"); return; }
    csv.downloadCsv("street-goose-newsletter-" + dateInput(new Date().toISOString()) + ".csv",
      csv.toCsv(["email", "idioma", "inscrito_em", "descadastrado_em"], rows.map(function (s) {
        return [s.email, s.locale, dateInput(s.subscribed_at), s.unsubscribed_at ? dateInput(s.unsubscribed_at) : ""];
      }), ";"));
  }

  // ---------- eventos (delegados — re-render não duplica listener) ----------
  async function onClick(e) {
    var tabBtn = e.target.closest("[data-admin-tab]");
    if (tabBtn) { selectTab(tabBtn.getAttribute("data-admin-tab")); return; }
    var btn = e.target.closest("[data-action]");
    if (!btn || !root.contains(btn)) return;
    var action = btn.getAttribute("data-action");
    var id = btn.getAttribute("data-id");
    var value = btn.getAttribute("data-value");

    if (action === "login") { if (window.SG.auth) window.SG.auth.open(); }
    else if (action === "retry") {
      var what = btn.getAttribute("data-retry");
      ({ orders: loadOrders, prices: loadPrices, customers: loadCustomers, posts: loadPosts, promo: loadPromo, newsletter: loadNewsletter })[what]();
    }
    else if (action === "order-filter") { state.orderStatus = value; state.openOrderId = null; markChip(btn); loadOrders(); }
    else if (action === "order-toggle") {
      state.openOrderId = state.openOrderId === id ? null : id;
      var article = btn.closest(".admin-order");
      var openNow = state.openOrderId === id;
      article.classList.toggle("is-open", openNow);
      btn.setAttribute("aria-expanded", String(openNow));
      article.querySelector(".admin-order-detail").hidden = !openNow;
      list("orders").querySelectorAll(".admin-order.is-open").forEach(function (other) {
        if (other === article) return;
        other.classList.remove("is-open");
        other.querySelector(".admin-order-summary").setAttribute("aria-expanded", "false");
        other.querySelector(".admin-order-detail").hidden = true;
      });
    }
    else if (action === "order-mark-paid") { saveOrder(btn.closest("form"), "paid"); }
    else if (action === "export-customers") { exportCustomers(); }
    else if (action === "post-filter") { state.postStatus = value; state.rejectingPostId = null; markChip(btn); loadPosts(); }
    else if (action === "post-approve") { btn.disabled = true; moderate(id, "approved"); }
    else if (action === "post-reject") { state.rejectingPostId = id; rerenderPost(id, true); }
    else if (action === "reject-cancel") { var pid = state.rejectingPostId; state.rejectingPostId = null; rerenderPost(pid); }
    else if (action === "reject-reason") {
      var ta = btn.closest("form").querySelector('[name="reason"]');
      ta.value = value;
      ta.focus();
    }
    else if (action === "coupon-new") { openCouponEditor(null); }
    else if (action === "coupon-edit") { openCouponEditor(state.coupons.find(function (c) { return c.code === id; })); }
    else if (action === "coupon-cancel") { bodyEl.querySelector("[data-coupon-editor]").innerHTML = ""; }
    else if (action === "coupon-toggle") {
      var coupon = state.coupons.find(function (c) { return c.code === id; });
      btn.disabled = true;
      var cres = await svc.setCouponActive(id, !coupon.active);
      if (destroyed) return;
      if (!cres.ok) { btn.disabled = false; toast(cres.message.toUpperCase()); return; }
      toast("CUPOM " + id + (coupon.active ? " DESATIVADO" : " ATIVADO"));
      loadPromo();
    }
    else if (action === "reward-new") { openRewardEditor(null); }
    else if (action === "reward-edit") { openRewardEditor(state.rewards.find(function (r) { return r.id === id; })); }
    else if (action === "reward-cancel") { bodyEl.querySelector("[data-reward-editor]").innerHTML = ""; }
    else if (action === "reward-toggle") {
      var reward = state.rewards.find(function (r) { return r.id === id; });
      btn.disabled = true;
      var rres = await svc.setRewardActive(id, !reward.active);
      if (destroyed) return;
      if (!rres.ok) { btn.disabled = false; toast(rres.message.toUpperCase()); return; }
      toast(reward.active ? "RECOMPENSA DESATIVADA" : "RECOMPENSA ATIVADA");
      loadPromo();
    }
    else if (action === "news-filter") { state.newsletterFilter = value; markChip(btn); renderNewsletterList(); }
    else if (action === "news-toggle") {
      var sub = state.subscribers.find(function (s) { return s.email === id; });
      btn.disabled = true;
      var nres = await svc.setNewsletterSubscribed(id, !!sub.unsubscribed_at);
      if (destroyed) return;
      if (!nres.ok) { btn.disabled = false; toast(nres.message.toUpperCase()); return; }
      sub.unsubscribed_at = sub.unsubscribed_at ? null : new Date().toISOString();
      renderNewsletterToolbar();
      renderNewsletterList();
      loadOverview();
    }
    else if (action === "export-newsletter") { exportNewsletter(); }
    else if (action === "price-cat") {
      state.priceCategory = value;
      state.priceSearch = "";
      var priceSearch = bodyEl.querySelector('[data-search="prices"]');
      if (priceSearch) priceSearch.value = "";
      markChip(btn);
      renderPriceCategory();
    }
    else if (action === "price-clear") { clearPrice(id, btn.closest("form")); }
    else if (action === "bulk-cancel") { resetBulk(btn.closest("form")); }
  }

  function markChip(btn) {
    btn.parentElement.querySelectorAll(".admin-chip").forEach(function (c) {
      var on = c === btn;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-pressed", String(on));
    });
  }

  function rerenderPost(id, focusReason) {
    var post = state.posts.find(function (p) { return p.id === id; });
    var el = post && list("posts").querySelector('[data-post-id="' + id + '"]');
    if (!el) return;
    el.outerHTML = postHtml(post);
    if (focusReason) {
      var ta = list("posts").querySelector('[data-post-id="' + id + '"] [name="reason"]');
      if (ta) ta.focus();
    }
  }

  function onSubmit(e) {
    var form = e.target.closest("[data-form]");
    if (!form || !root.contains(form)) return;
    e.preventDefault();
    var kind = form.getAttribute("data-form");
    if (kind === "order") saveOrder(form);
    else if (kind === "reject") {
      var reason = field(form, "reason").value.trim();
      if (!reason) { setFormError(form, "Informe o motivo da rejeição."); field(form, "reason").focus(); return; }
      moderate(form.getAttribute("data-id"), "rejected", reason, form);
    }
    else if (kind === "coupon") saveCoupon(form);
    else if (kind === "reward") saveReward(form);
    else if (kind === "price") savePrice(form);
    else if (kind === "price-bulk") applyBulk(form);
  }

  function onInput(e) {
    // erro de validação some assim que o lojista mexe no formulário
    var editing = e.target.closest("[data-form]");
    if (editing) setFormError(editing, "");
    if (editing && editing.getAttribute("data-form") === "price-bulk") resetBulk(editing);
    var search = e.target.closest("[data-search]");
    if (search) {
      var which = search.getAttribute("data-search");
      if (which === "newsletter") { state.newsletterSearch = search.value; renderNewsletterList(); return; }
      if (which === "prices") { state.priceSearch = search.value; renderPriceList(); return; }
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        if (which === "orders") { state.orderSearch = search.value; loadOrders(); }
        else if (which === "customers") { state.customerSearch = search.value; loadCustomers(); }
      }, 300);
      return;
    }
    if (e.target.matches("[data-item-price]")) recalcOrderForm(e.target.closest("form"));
    else if (e.target.matches('[data-form="order"] [name="total"]')) e.target.setAttribute("data-dirty", "");
  }

  function onKeydown(e) {
    var tab = e.target.closest && e.target.closest("[data-admin-tab]");
    if (tab && ["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(e.key) !== -1) {
      e.preventDefault();
      var i = TABS.findIndex(function (x) { return x.id === tab.getAttribute("data-admin-tab"); });
      var next = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
      selectTab(TABS[next].id, true);
      return;
    }
    if (e.key !== "Escape") return;
    if (document.querySelector("[data-auth-modal]:not([hidden])")) return; // ESC fecha o login primeiro
    // ESC dentro de campo não fecha o painel inteiro (perderia o que foi digitado)
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { e.target.blur(); return; }
    onClose();
  }

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  root.addEventListener("click", onClick);
  root.addEventListener("submit", onSubmit);
  root.addEventListener("input", onInput);
  // captura: roda antes do ESC do auth-modal, enquanto ele ainda está aberto
  document.addEventListener("keydown", onKeydown, true);

  gate().catch(function () {
    if (!destroyed) bodyEl.innerHTML = restrictedHtml("Painel indisponível", "Não foi possível carregar agora. Tente de novo em instantes.", "");
  });

  return function destroy() {
    destroyed = true;
    clearTimeout(searchTimer);
    if (unsubscribeAuth) unsubscribeAuth();
    document.removeEventListener("keydown", onKeydown, true);
    root.removeEventListener("click", onClick);
    root.removeEventListener("submit", onSubmit);
    root.removeEventListener("input", onInput);
    robots.remove();
  };
}
