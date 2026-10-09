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
    { id: "produtos", label: "Produtos" },
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

  var svc = null, money = null, csv = null, imageLib = null;
  var destroyed = false;
  var unsubscribeAuth = null;
  var currentUserId; // undefined = ainda não checado
  var searchTimer = null;
  var seq = {};
  var state = {
    tab: tabFromUrl(),
    overview: null,
    orderStatus: "pending_payment", orderSearch: "", orders: [], openOrderId: null, orderCounts: null, newOrderPrefill: null,
    customerSearch: "", customers: [],
    postStatus: "pending", posts: [], rejectingPostId: null,
    coupons: [], rewards: [], levels: [], editingCoupon: null, editingReward: null,
    newsletterFilter: "active", newsletterSearch: "", subscribers: [],
    prodCategory: "lupa", prodSearch: "", prices: {}, overlay: {}, prodLoaded: false, openProdId: null, photoDraft: {}, newPhotos: [],
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
    if (tab === "precos") tab = "produtos"; // link antigo da aba de preços
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
      import("../src/lib/image.ts"),
    ]);
    svc = mods[0].AdminService;
    money = mods[1];
    csv = mods[2];
    imageLib = mods[3];
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
    if (state.tab === "pedidos") {
      panel.innerHTML = ordersToolbar() + '<div class="admin-list" data-list="orders"></div>';
      loadOrders();
      if (state.newOrderPrefill) { var pre = state.newOrderPrefill; state.newOrderPrefill = null; openNewOrder(pre); }
    }
    else if (state.tab === "produtos") { panel.innerHTML = productsShell(); renderProdCategory(); loadProducts(); }
    else if (state.tab === "clientes") { panel.innerHTML = customersToolbar() + '<div data-list="customers"></div>'; loadCustomers(); }
    else if (state.tab === "comunidade") { panel.innerHTML = postsToolbar() + '<div data-list="posts"></div>'; loadPosts(); }
    else if (state.tab === "cupons") { panel.innerHTML = promoShell(); loadPromo(); }
    else if (state.tab === "newsletter") { panel.innerHTML = '<div data-newsletter-toolbar></div><div data-list="newsletter"></div>'; loadNewsletter(); }
  }

  function list(name) { return bodyEl.querySelector('[data-list="' + name + '"]'); }

  // ---------- pedidos ----------
  // CRM de pedidos (migration 0103): lista por status com contagem real,
  // pedido manual, edição completa e movimentação com um clique. Tudo passa
  // por admin_save_order (servidor recalcula total e acerta o XP).
  var ORDER_FILTERS = [["pending_payment", "Aguardando"], ["paid", "Pagos"], ["fulfilled", "Enviados"], ["cancelled", "Cancelados"], ["refunded", "Reembolsados"], ["all", "Todos"]];
  var ORDER_MOVES = {
    pending_payment: [["paid", "Marcar como pago", true], ["cancelled", "Cancelar pedido"]],
    paid: [["fulfilled", "Marcar como enviado", true], ["refunded", "Reembolsar"], ["pending_payment", "Voltar para aguardando"]],
    fulfilled: [["paid", "Voltar para pago"], ["refunded", "Reembolsar"]],
    cancelled: [["pending_payment", "Reabrir pedido", true]],
    refunded: [["pending_payment", "Reabrir pedido"]],
  };
  var PAYMENT_LABELS = { whatsapp: "WhatsApp", pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro", outro: "Outro" };
  var SHIP_FIELDS = [
    ["cep", "CEP", ""], ["street", "Rua", "admin-field--wide"], ["number", "Número", ""], ["complement", "Complemento", ""],
    ["neighborhood", "Bairro", ""], ["city", "Cidade", ""], ["state", "UF", ""],
  ];

  function ordersToolbar() {
    var counts = state.orderCounts || {};
    return '<div class="admin-toolbar">' +
      '<div class="admin-chips" role="group" aria-label="Filtrar pedidos por status" data-order-chips>' +
        ORDER_FILTERS.map(function (s) { return chip("order-filter", s[0], s[1], state.orderStatus === s[0], state.orderCounts ? counts[s[0]] || 0 : null); }).join("") +
      "</div>" +
      '<label class="admin-search"><span class="sr-only">Buscar pedidos</span><input type="search" data-search="orders" placeholder="#pedido, e-mail, nome, telefone ou rastreio" value="' + esc(state.orderSearch) + '" autocomplete="off"></label>' +
      '<button class="btn btn-primary" type="button" data-action="order-new">Novo pedido</button>' +
    "</div>" +
    "<div data-order-new></div>" +
    productsDatalist();
  }

  // busca de produto nos itens: nome · código (catálogo visível do site)
  function productsDatalist() {
    return '<datalist id="admin-products-list">' + (window.SG_PRODUCTS || []).map(function (p) {
      return '<option value="' + esc(p.name + " · " + p.id) + '">';
    }).join("") + "</datalist>";
  }

  async function loadOrderCounts() {
    var res = await svc.orderCounts();
    if (destroyed || !res.ok) return;
    state.orderCounts = res.data;
    var box = bodyEl.querySelector("[data-order-chips]");
    if (!box) return;
    box.innerHTML = ORDER_FILTERS.map(function (s) { return chip("order-filter", s[0], s[1], state.orderStatus === s[0], res.data[s[0]] || 0); }).join("");
  }

  async function loadOrders() {
    var el = list("orders");
    if (!el) return;
    var n = nextSeq("orders");
    el.innerHTML = loading();
    loadOrderCounts();
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

  function orderCustomerName(o) {
    var ship = o.shipping_address || {};
    return ship.name || (o.customer && o.customer.display_name) || (o.customer && o.customer.email) || "Cliente sem nome";
  }

  function orderHtml(o) {
    var ship = o.shipping_address || {};
    var itemCount = o.items.reduce(function (sum, i) { return sum + i.qty; }, 0);
    var open = state.openOrderId === o.id;
    var tags = [];
    if (o.source === "admin") tags.push('<span class="admin-tag">Manual</span>');
    if (!o.customer) tags.push('<span class="admin-tag">Sem conta</span>');
    if (o.tracking_code) tags.push('<span class="admin-tag admin-tag--accent">Rastreio</span>');
    return '<article class="admin-order' + (open ? " is-open" : "") + '" data-order-id="' + o.id + '">' +
      '<button class="admin-order-summary" type="button" data-action="order-toggle" data-id="' + o.id + '" aria-expanded="' + open + '" aria-controls="order-' + o.id + '">' +
        '<span class="admin-order-id">#' + esc(o.short_id) + "</span>" +
        '<span class="admin-order-customer"><b>' + esc(orderCustomerName(o)) + "</b><small>" + esc((o.customer && o.customer.email) || ship.email || ship.phone || "") + "</small></span>" +
        '<span class="admin-order-meta">' + itemCount + (itemCount === 1 ? " item" : " itens") + " · " + fmtDateTime(o.created_at) + (tags.length ? " " + tags.join("") : "") + "</span>" +
        '<span class="admin-order-total">' + (o.total_cents ? brl(o.total_cents) : "A confirmar") + "</span>" +
        '<span class="admin-status admin-status--' + o.status + '">' + ORDER_STATUS[o.status] + "</span>" +
      "</button>" +
      '<div class="admin-order-detail" id="order-' + o.id + '"' + (open ? "" : " hidden") + ">" + (open ? orderEditorHtml(o) : "") + "</div>" +
    "</article>";
  }

  function orderItemRowHtml(it) {
    var qty = it.qty || 1;
    var price = typeof it.unit_price_cents === "number" ? it.unit_price_cents : null;
    return '<div class="admin-item admin-item--edit" data-item-row>' +
      '<label class="admin-item-name"><span class="sr-only">Produto</span>' +
        '<input name="item_name" list="admin-products-list" value="' + esc(it.product_name || "") + '" placeholder="Produto (busque pelo nome ou digite)" autocomplete="off" maxlength="200">' +
        '<input type="hidden" name="item_id" value="' + esc(it.product_id || "") + '">' +
        "<small data-item-pid>" + esc(it.product_id && it.product_id !== "manual" ? it.product_id : "item avulso") + "</small>" +
      "</label>" +
      '<label class="admin-item-qty-input"><span class="sr-only">Quantidade</span><em>×</em><input name="item_qty" type="number" min="1" max="99" step="1" value="' + qty + '"></label>' +
      '<label class="admin-money"><span class="sr-only">Preço unitário</span><em>R$</em><input name="item_price" inputmode="decimal" value="' + money.centsToInput(price) + '" placeholder="0,00" autocomplete="off"></label>' +
      '<span class="admin-item-line" data-line-total>' + (price !== null ? brl(price * qty) : "—") + "</span>" +
      '<button type="button" class="admin-item-remove" data-action="item-remove" aria-label="Remover item">×</button>' +
    "</div>";
  }

  // mesmo formulário para editar (o) e para pedido novo (o = null)
  function orderEditorHtml(o, prefill) {
    var isNew = !o;
    var ship = (o && o.shipping_address) || {};
    var pre = prefill || {};
    var status = o ? o.status : "pending_payment";
    var items = o ? o.items : [];
    var moves = o ? ORDER_MOVES[o.status] || [] : [];
    var canDelete = o && (o.status === "pending_payment" || o.status === "cancelled");
    var fieldHtml = function (name, label, value, extra, cls) {
      return '<label class="admin-field' + (cls ? " " + cls : "") + '">' + label + '<input name="' + name + '" value="' + esc(value || "") + '"' + (extra || "") + "></label>";
    };
    return '<form class="admin-order-form" data-form="order" data-id="' + (o ? o.id : "") + '" novalidate>' +
      (isNew ? "<h3>Novo pedido</h3>" : '<div class="admin-order-moves">' +
        '<span class="admin-status admin-status--' + status + '">' + ORDER_STATUS[status] + "</span>" +
        moves.map(function (m) {
          return '<button type="button" class="btn ' + (m[2] ? "btn-primary" : "btn-ghost") + '" data-action="order-move" data-status="' + m[0] + '">' + m[1] + "</button>";
        }).join("") +
      "</div>") +
      '<div class="admin-order-edit">' +
        '<fieldset class="admin-fieldset"><legend>Cliente</legend><div class="admin-form-grid">' +
          fieldHtml("ship_name", "Nome", ship.name || pre.name, ' maxlength="160" autocomplete="off"') +
          fieldHtml("ship_phone", "Telefone / WhatsApp", ship.phone, ' maxlength="40" inputmode="tel" autocomplete="off"') +
          fieldHtml("ship_email", "E-mail de contato", ship.email || pre.email, ' maxlength="160" inputmode="email" autocomplete="off"') +
          fieldHtml("customer_email", "Conta no site (e-mail)", (o && o.customer && o.customer.email) || pre.account || "", ' maxlength="160" inputmode="email" autocomplete="off" placeholder="Vazio = sem conta"') +
        "</div><small>Com conta vinculada, o pedido aparece em Meus pedidos do cliente e gera XP quando pago.</small></fieldset>" +
        '<fieldset class="admin-fieldset"><legend>Entrega</legend><div class="admin-form-grid">' +
          SHIP_FIELDS.map(function (f) { return fieldHtml("ship_" + f[0], f[1], ship[f[0]], ' maxlength="160" autocomplete="off"', f[2]); }).join("") +
          fieldHtml("tracking_code", "Código de rastreio", o && o.tracking_code, ' maxlength="60" autocomplete="off" placeholder="Ex.: AA123456789BR"', "admin-field--wide") +
        "</div></fieldset>" +
      "</div>" +
      '<fieldset class="admin-fieldset"><legend>Itens</legend>' +
        '<div class="admin-items" data-items>' + items.map(orderItemRowHtml).join("") + "</div>" +
        '<button type="button" class="admin-text-btn" data-action="item-add">+ Adicionar item</button>' +
      "</fieldset>" +
      '<div class="admin-order-sums">' +
        '<p>Subtotal <b data-subtotal>' + brl(o ? o.subtotal_cents : 0) + "</b></p>" +
        '<label class="admin-field">Frete<span class="admin-money"><em>R$</em><input name="shipping_cents" inputmode="decimal" value="' + money.centsToInput(o ? o.shipping_cents : 0) + '" placeholder="0,00"></span></label>' +
        '<label class="admin-field">Desconto<span class="admin-money"><em>R$</em><input name="discount_cents" inputmode="decimal" value="' + money.centsToInput(o ? o.discount_cents : 0) + '" placeholder="0,00"></span></label>' +
        '<p class="admin-order-grand">Total <b data-total>' + brl(o ? o.total_cents : 0) + "</b></p>" +
      "</div>" +
      '<div class="admin-form-row">' +
        '<label class="admin-field">Pagamento<select name="payment_method">' + Object.keys(PAYMENT_LABELS).map(function (k) {
          return '<option value="' + k + '"' + (k === ((o && o.payment_method) || (isNew ? "pix" : "whatsapp")) ? " selected" : "") + ">" + PAYMENT_LABELS[k] + "</option>";
        }).join("") + "</select></label>" +
        '<label class="admin-field">Status<select name="status">' + Object.keys(ORDER_STATUS).map(function (s) {
          return '<option value="' + s + '"' + (s === status ? " selected" : "") + ">" + ORDER_STATUS[s] + "</option>";
        }).join("") + "</select></label>" +
        '<label class="admin-field admin-field--grow">Nota interna<textarea name="staff_note" rows="2" maxlength="1000" placeholder="Só a equipe vê">' + esc((o && o.staff_note) || "") + "</textarea></label>" +
      "</div>" +
      (o ? '<p class="admin-note">' + (o.source === "admin" ? "Criado no painel" : "Feito pelo site") + " em " + fmtDateTime(o.created_at) + " · atualizado " + fmtDateTime(o.updated_at) +
        ((ship.phone && waLink(ship.phone)) ? ' · <a class="admin-link" href="' + esc(waLink(ship.phone)) + '" target="_blank" rel="noopener">Abrir WhatsApp</a>' : "") + "</p>" : "") +
      '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
      '<div class="admin-form-actions">' +
        (isNew ? '<button class="btn btn-ghost" type="button" data-action="order-new-cancel">Cancelar</button>' : "") +
        (canDelete ? '<button class="admin-text-btn admin-text-btn--danger" type="button" data-action="order-delete" data-id="' + o.id + '">Excluir pedido</button>' : "") +
        '<button class="btn btn-primary" type="submit">' + (isNew ? "Criar pedido" : "Salvar pedido") + "</button>" +
      "</div>" +
    "</form>";
  }

  function openNewOrder(prefill) {
    var box = bodyEl.querySelector("[data-order-new]");
    if (!box) return;
    box.innerHTML = '<div class="admin-editor admin-order-new">' + orderEditorHtml(null, prefill) + "</div>";
    var form = box.querySelector("form");
    addItemRow(form);
    recalcOrderForm(form);
    var focus = prefill && prefill.name ? form.querySelector('[name="item_name"]') : form.querySelector('[name="ship_name"]');
    if (focus) focus.focus();
  }

  function addItemRow(form, item) {
    var box = form.querySelector("[data-items]");
    box.insertAdjacentHTML("beforeend", orderItemRowHtml(item || { qty: 1, unit_price_cents: null }));
    var rows = box.querySelectorAll("[data-item-row]");
    return rows[rows.length - 1];
  }

  // nome escolhido da lista "Nome · código": liga ao produto e sugere o preço do site
  function onItemName(input) {
    var rowEl = input.closest("[data-item-row]");
    var m = / · ([a-z0-9-]+)$/.exec(input.value);
    var idInput = rowEl.querySelector('[name="item_id"]');
    var label = rowEl.querySelector("[data-item-pid]");
    if (!m) {
      if (idInput.value && idInput.value !== "manual") { idInput.value = ""; label.textContent = "item avulso"; }
      return;
    }
    var p = (window.SG_PRODUCTS || []).find(function (x) { return x.id === m[1]; });
    if (!p) return;
    input.value = p.name;
    idInput.value = p.id;
    label.textContent = p.id;
    var priceInput = rowEl.querySelector('[name="item_price"]');
    if (typeof p.price === "number" && !money.parseMoneyToCents(priceInput.value || "")) priceInput.value = money.centsToInput(p.price);
    recalcOrderForm(input.closest("form"));
  }

  function readMoney(input) {
    var raw = input.value.trim();
    return raw ? money.parseMoneyToCents(raw) : 0;
  }

  function recalcOrderForm(form) {
    var subtotal = 0, valid = true;
    form.querySelectorAll("[data-item-row]").forEach(function (rowEl) {
      var qty = Number(rowEl.querySelector('[name="item_qty"]').value);
      var priceInput = rowEl.querySelector('[name="item_price"]');
      var cents = readMoney(priceInput);
      priceInput.classList.toggle("is-invalid", cents === null);
      var line = rowEl.querySelector("[data-line-total]");
      if (cents === null || !Number.isInteger(qty) || qty < 1) { valid = false; line.textContent = "—"; return; }
      subtotal += cents * qty;
      line.textContent = brl(cents * qty);
    });
    var shipping = readMoney(field(form, "shipping_cents"));
    var discount = readMoney(field(form, "discount_cents"));
    form.querySelector("[data-subtotal]").textContent = valid ? brl(subtotal) : "—";
    form.querySelector("[data-total]").textContent = valid && shipping !== null && discount !== null ? brl(Math.max(0, subtotal + shipping - discount)) : "—";
  }

  function collectOrder(form, statusOverride) {
    var items = [];
    var problem = null;
    form.querySelectorAll("[data-item-row]").forEach(function (rowEl) {
      if (problem) return;
      var name = rowEl.querySelector('[name="item_name"]').value.trim();
      var qty = Number(rowEl.querySelector('[name="item_qty"]').value);
      var cents = readMoney(rowEl.querySelector('[name="item_price"]'));
      if (!name) { problem = "Todo item precisa de um nome."; return; }
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) { problem = "Quantidade de 1 a 99 por item."; return; }
      if (cents === null) { problem = "Preço do item no formato 197,00."; return; }
      items.push({ product_id: rowEl.querySelector('[name="item_id"]').value || "manual", product_name: name, qty: qty, unit_price_cents: cents });
    });
    if (problem) return { error: problem };
    if (!items.length) return { error: "Adicione pelo menos um item." };
    var shipping = readMoney(field(form, "shipping_cents"));
    var discount = readMoney(field(form, "discount_cents"));
    if (shipping === null || discount === null) return { error: "Frete e desconto no formato 19,90 (ou vazio)." };
    var subtotal = items.reduce(function (s, i) { return s + i.qty * i.unit_price_cents; }, 0);
    var total = Math.max(0, subtotal + shipping - discount);
    var status = statusOverride || field(form, "status").value;
    if ((status === "paid" || status === "fulfilled") && total <= 0) return { error: "Defina os preços antes de marcar como pago ou enviado." };
    var shipData = {};
    ["name", "email", "phone", "cep", "street", "number", "complement", "neighborhood", "city", "state"].forEach(function (k) {
      shipData[k] = field(form, "ship_" + k).value.trim();
    });
    return {
      order: {
        status: status,
        customer_email: field(form, "customer_email").value.trim().toLowerCase(),
        shipping: shipData,
        items: items,
        shipping_cents: shipping,
        discount_cents: discount,
        payment_method: field(form, "payment_method").value,
        tracking_code: field(form, "tracking_code").value.trim(),
        staff_note: field(form, "staff_note").value,
      },
      total: total,
    };
  }

  async function saveOrder(form, statusOverride) {
    setFormError(form, "");
    var id = form.getAttribute("data-id") || null;
    var data = collectOrder(form, statusOverride);
    if (data.error) { setFormError(form, data.error); return; }
    var previous = id ? state.orders.find(function (o) { return o.id === id; }) : null;
    setBusy(form, true);
    var res = await svc.saveOrder(id, data.order);
    if (destroyed) return;
    setBusy(form, false);
    if (!res.ok) { setFormError(form, res.message); return; }
    var label = "PEDIDO #" + res.data.short_id;
    if (!id) {
      bodyEl.querySelector("[data-order-new]").innerHTML = "";
      state.orderStatus = res.data.status;
      state.orderSearch = "";
      state.openOrderId = res.data.id;
      toast(label + " CRIADO");
      renderPanel();
      loadOverview();
      return;
    }
    toast(previous && previous.status !== res.data.status ? label + " — " + ORDER_STATUS[res.data.status].toUpperCase() : label + " SALVO");
    loadOrders();
    loadOverview();
  }

  async function deleteOrder(id, btn) {
    if (btn.getAttribute("data-confirm") !== "1") {
      btn.setAttribute("data-confirm", "1");
      btn.textContent = "Confirmar: excluir de vez";
      return;
    }
    btn.disabled = true;
    var res = await svc.deleteOrder(id);
    if (destroyed) return;
    if (!res.ok) { btn.disabled = false; setFormError(btn.closest("form"), res.message); return; }
    state.openOrderId = null;
    toast("PEDIDO EXCLUÍDO");
    loadOrders();
    loadOverview();
  }

  // ---------- produtos ----------
  // Lista = catálogo que o site está mostrando (window.SG.catalogAll, já com
  // a camada public.products aplicada), inclusive peças ocultas. Preço vem de
  // public.product_prices (fonte do pedido). Toda alteração grava no banco,
  // recarrega o que o banco tem e reaplica no próprio site atrás do painel.
  var CATEGORY_LABELS = { lupa: "Lupas", acessorios: "Acessórios", relogios: "Relógios", perfumes: "Perfumes", trajes: "Trajes" };
  var UNSAFE_TEXT = /[<>"`]/;

  function prodCategory() {
    var cats = window.SG_CATALOG || [];
    return cats.find(function (c) { return c.id === state.prodCategory; }) || cats[0] || null;
  }
  function prodList() {
    var cat = prodCategory();
    return cat && window.SG.catalogAll ? window.SG.catalogAll(cat.id) : [];
  }
  function findProd(id) {
    var found = null;
    (window.SG_CATALOG || []).some(function (c) {
      found = (window.SG.catalogAll ? window.SG.catalogAll(c.id) : []).find(function (p) { return p.id === id; }) || null;
      return !!found;
    });
    return found;
  }
  function priceOf(id) { return state.prices[id] ? state.prices[id].price_cents : null; }
  function siteLabelWithoutPrice(p) {
    if (p.soldOut) return "Esgotado";
    return window.SG.priceLabelFor ? window.SG.priceLabelFor(p.category, null) : "Consultar disponibilidade";
  }

  function productsShell() {
    var cats = window.SG_CATALOG || [];
    return '<div class="admin-toolbar">' +
        '<div class="admin-chips" role="group" aria-label="Categoria">' + cats.map(function (c) {
          return chip("prod-cat", c.id, c.label, state.prodCategory === c.id);
        }).join("") + "</div>" +
        '<label class="admin-search"><span class="sr-only">Buscar produto</span><input type="search" data-search="products" placeholder="Buscar produto ou código" value="' + esc(state.prodSearch) + '" autocomplete="off"></label>' +
        '<button class="btn btn-primary" type="button" data-action="prod-new">Novo produto</button>' +
      "</div>" +
      '<p class="admin-hint">Tudo aqui aparece no site na hora: nome, preço, fotos, esgotado, oculto e ordem. Pedidos já registrados mantêm o nome e o preço que tinham. Peça sem preço aparece como "Consultar".</p>' +
      "<div data-prod-new></div>" +
      "<div data-price-bulk></div>" +
      '<div data-list="products"></div>';
  }

  function renderProdCategory() {
    var cat = prodCategory();
    var bulk = bodyEl.querySelector("[data-price-bulk]");
    if (!cat || !bulk) return;
    bulk.innerHTML =
      '<form class="admin-bulk" data-form="price-bulk" novalidate>' +
        '<p class="admin-bulk-title"><b>' + esc(cat.label) + "</b><span data-prod-count></span></p>" +
        '<div class="admin-bulk-row">' +
          '<label class="admin-money"><span class="sr-only">Mesmo preço para todas as peças de ' + esc(cat.label) + '</span><em>R$</em><input name="price" inputmode="decimal" placeholder="Mesmo preço para todas" autocomplete="off"></label>' +
          '<button class="btn btn-ghost" type="submit" data-bulk-submit>Aplicar a todas</button>' +
          '<button class="admin-text-btn" type="button" data-action="bulk-cancel" hidden>Cancelar</button>' +
        "</div>" +
        '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
      "</form>";
    renderProdList();
  }

  async function reloadProductData() {
    var res = await Promise.all([svc.listProducts(), svc.listPrices()]);
    if (!res[0].ok) return res[0];
    if (!res[1].ok) return res[1];
    state.overlay = res[0].data;
    state.prices = res[1].data;
    state.prodLoaded = true;
    // o site atrás do painel passa a refletir o banco (e o painel lista dele)
    if (window.SG.catalog) await window.SG.catalog.refresh();
    if (window.SG.prices) await window.SG.prices.refresh();
    return { ok: true };
  }

  async function loadProducts() {
    var el = list("products");
    if (!el) return;
    var n = nextSeq("products");
    if (!state.prodLoaded) el.innerHTML = loading();
    var res = await reloadProductData();
    if (stale("products", n)) return;
    if (!res.ok) { el.innerHTML = errorState(res.message, "products"); return; }
    renderProdList();
  }

  function renderProdCount() {
    var counter = bodyEl.querySelector("[data-prod-count]");
    if (!counter || !state.prodLoaded) return;
    var all = prodList();
    var onSite = all.filter(function (p) { return !p.hidden; }).length;
    var unpriced = all.filter(function (p) { return !priceOf(p.id); }).length;
    counter.textContent = " · " + all.length + " peças · " + onSite + " no site" + (unpriced ? " · " + unpriced + " sem preço" : "");
  }

  function renderProdList() {
    var el = list("products");
    if (!el || !state.prodLoaded) return;
    renderProdCount();
    var q = state.prodSearch.trim().toLowerCase();
    var items = prodList().filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) !== -1 || p.id.indexOf(q) !== -1; });
    el.innerHTML = items.length ? '<div class="admin-prods">' + items.map(prodRowHtml).join("") + "</div>" : emptyState("Nenhum produto encontrado.");
  }

  function prodRowHtml(p) {
    var open = state.openProdId === p.id;
    var cents = priceOf(p.id);
    var tags = [];
    if (p.isCustom) tags.push('<span class="admin-tag admin-tag--accent">Novo</span>');
    if (p.hidden) tags.push('<span class="admin-tag">Oculto</span>');
    if (p.soldOut) tags.push('<span class="admin-tag admin-tag--warn">Esgotado</span>');
    if (!p.isCustom && p.hasOverride) tags.push('<span class="admin-tag">Editado</span>');
    return '<article class="admin-prod' + (p.hidden ? " is-hidden" : "") + (open ? " is-open" : "") + '" data-prod-id="' + esc(p.id) + '">' +
      '<form class="admin-price admin-prod-row" data-form="product" data-id="' + esc(p.id) + '" novalidate>' +
        '<img class="admin-price-thumb" src="' + esc(p.images[0] || "") + '" alt="" loading="lazy" width="56" height="56">' +
        '<div class="admin-price-info">' +
          '<label class="sr-only" for="pn-' + esc(p.id) + '">Nome de ' + esc(p.name) + "</label>" +
          '<input class="admin-prod-name" id="pn-' + esc(p.id) + '" name="name" value="' + esc(p.name) + '" maxlength="120" autocomplete="off">' +
          '<small>' + esc(p.id) + " " + tags.join("") + "</small>" +
          (cents && !p.soldOut ? "" : '<small class="admin-price-site">No site: ' + esc(cents && p.soldOut ? "Esgotado" : siteLabelWithoutPrice(p)) + "</small>") +
        "</div>" +
        '<label class="admin-money"><span class="sr-only">Preço de ' + esc(p.name) + '</span><em>R$</em><input name="price" inputmode="decimal" value="' + money.centsToInput(cents) + '" placeholder="Sem preço" autocomplete="off"></label>' +
        '<div class="admin-price-actions">' +
          '<button class="btn btn-ghost" type="submit">Salvar</button>' +
          '<button class="admin-text-btn" type="button" data-action="prod-toggle" data-id="' + esc(p.id) + '" aria-expanded="' + open + '" aria-controls="pd-' + esc(p.id) + '">' + (open ? "Fechar" : "Editar") + "</button>" +
        "</div>" +
        '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
      "</form>" +
      (open ? prodDetailHtml(p) : "") +
    "</article>";
  }

  // rascunho de fotos do produto aberto: {ref, url} já salvas, {file, url} novas
  function photoDraft(p) {
    if (!state.photoDraft[p.id]) {
      state.photoDraft[p.id] = (p.imageRefs || []).map(function (ref, i) { return { ref: ref, url: p.images[i] }; })
        .filter(function (ph) { return !!ph.url; });
    }
    return state.photoDraft[p.id];
  }

  function photosHtml(p) {
    return photoDraft(p).map(function (ph, i) {
      return '<figure class="admin-photo' + (i === 0 ? " is-cover" : "") + '">' +
        '<img src="' + esc(ph.url) + '" alt="Foto ' + (i + 1) + '">' +
        (i === 0
          ? "<figcaption>Capa</figcaption>"
          : '<button type="button" class="admin-photo-cover" data-action="photo-cover" data-id="' + esc(p.id) + '" data-index="' + i + '">Usar como capa</button>') +
        '<button type="button" class="admin-photo-remove" data-action="photo-remove" data-id="' + esc(p.id) + '" data-index="' + i + '" aria-label="Remover foto ' + (i + 1) + '">×</button>' +
      "</figure>";
    }).join("");
  }

  function prodDetailHtml(p) {
    var cats = window.SG_CATALOG || [];
    return '<form class="admin-prod-detail" id="pd-' + esc(p.id) + '" data-form="product-detail" data-id="' + esc(p.id) + '" novalidate>' +
      '<div class="admin-prod-grid">' +
        '<div class="admin-prod-photos"><h3>Fotos</h3>' +
          '<div class="admin-photo-grid" data-photo-grid="' + esc(p.id) + '">' + photosHtml(p) + "</div>" +
          '<label class="admin-photo-add"><input type="file" accept="image/jpeg,image/png,image/webp" multiple data-photo-input="' + esc(p.id) + '"><span>+ Adicionar fotos</span></label>' +
          "<small>JPG, PNG ou WEBP. A primeira é a capa no site. O tamanho é otimizado automaticamente.</small>" +
        "</div>" +
        '<div class="admin-prod-fields">' +
          '<label class="admin-field">Descrição<textarea name="description" rows="3" maxlength="600">' + esc(p.desc) + "</textarea></label>" +
          (p.isCustom
            ? '<label class="admin-field">Categoria<select name="category">' + cats.map(function (c) {
                return '<option value="' + c.id + '"' + (c.id === p.category ? " selected" : "") + ">" + esc(c.label) + "</option>";
              }).join("") + "</select></label>"
            : "") +
          '<label class="admin-check"><input type="checkbox" name="sold_out"' + (p.soldOut ? " checked" : "") + "> Esgotado (sem botão de compra)</label>" +
          '<label class="admin-check"><input type="checkbox" name="hidden"' + (p.hidden ? " checked" : "") + "> Oculto do site</label>" +
          '<div class="admin-prod-order"><span>Posição na categoria</span>' +
            '<button type="button" class="btn btn-ghost" data-action="prod-move" data-dir="-1" data-id="' + esc(p.id) + '">↑ Subir</button>' +
            '<button type="button" class="btn btn-ghost" data-action="prod-move" data-dir="1" data-id="' + esc(p.id) + '">↓ Descer</button>' +
          "</div>" +
        "</div>" +
      "</div>" +
      '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
      '<div class="admin-form-actions">' +
        (p.isCustom
          ? '<button class="admin-text-btn admin-text-btn--danger" type="button" data-action="prod-delete" data-id="' + esc(p.id) + '">Excluir produto</button>'
          : (p.hasOverride ? '<button class="admin-text-btn" type="button" data-action="prod-restore" data-id="' + esc(p.id) + '">Restaurar original</button>' : "")) +
        '<button class="btn btn-primary" type="submit">Salvar detalhes</button>' +
      "</div>" +
    "</form>";
  }

  function rerenderProd(id) {
    var el = list("products");
    var card = el && el.querySelector('[data-prod-id="' + id + '"]');
    var p = findProd(id);
    if (card && p) card.outerHTML = prodRowHtml(p);
    else renderProdList();
    renderProdCount();
  }

  function textProblem(value, label) {
    return UNSAFE_TEXT.test(value) ? "Não use < > \" ou ` em " + label + "." : null;
  }

  async function afterProductChange(message, focusId) {
    var res = await reloadProductData();
    if (destroyed) return;
    if (!res.ok) { toast(res.message.toUpperCase()); return; }
    renderProdList();
    if (message) toast(message);
    if (focusId) {
      var input = list("products").querySelector('[data-prod-id="' + focusId + '"] [name="price"]');
      if (input) input.focus();
    }
  }

  // linha: nome + preço
  async function saveProductRow(form) {
    var id = form.getAttribute("data-id");
    var p = findProd(id);
    if (!p) return;
    setFormError(form, "");
    var name = field(form, "name").value.trim().replace(/\s+/g, " ");
    if (!name) { setFormError(form, "O nome não pode ficar vazio."); return; }
    var bad = textProblem(name, "nome");
    if (bad) { setFormError(form, bad); return; }
    var raw = field(form, "price").value.trim();
    var cents = raw ? money.parseMoneyToCents(raw) : null;
    if (raw && cents === null) { setFormError(form, "Preço no formato 197,00."); return; }
    if (raw && cents <= 0) { setFormError(form, "O preço precisa ser maior que zero. Para tirar o preço, deixe vazio."); return; }

    var factory = window.SG.catalogFactory ? window.SG.catalogFactory(id) : null;
    var nameChanged = name !== p.name;
    var priceChanged = cents !== priceOf(id);
    if (!nameChanged && !priceChanged) { toast("NADA PARA SALVAR"); return; }

    setBusy(form, true);
    var results = [];
    if (nameChanged) {
      results.push(await svc.saveProducts([{ id: id, category: p.category, name: factory && name === factory.name ? null : name }]));
    }
    if (priceChanged) {
      results.push(cents ? await svc.setPrices([{ productId: id, priceCents: cents }]) : await svc.clearPrices([id]));
    }
    if (destroyed) return;
    setBusy(form, false);
    var failed = results.find(function (r) { return !r.ok; });
    if (failed) { setFormError(form, failed.message); return; }
    var nextId = (function () {
      var all = prodList();
      var i = all.findIndex(function (x) { return x.id === id; });
      return all[i + 1] ? all[i + 1].id : null;
    })();
    await afterProductChange(name.toUpperCase() + (cents ? " — " + brl(cents) : priceChanged ? " — SEM PREÇO" : "") , nextId);
  }

  // detalhe: descrição, fotos, esgotado, oculto, categoria (produto novo)
  async function saveProductDetail(form) {
    var id = form.getAttribute("data-id");
    var p = findProd(id);
    if (!p) return;
    setFormError(form, "");
    var description = field(form, "description").value.trim();
    var bad = textProblem(description, "descrição");
    if (bad) { setFormError(form, bad); return; }
    var draft = photoDraft(p);
    if (!draft.length) { setFormError(form, "Deixe pelo menos uma foto: sem foto o produto não aparece no site."); return; }
    if (draft.length > 8) { setFormError(form, "No máximo 8 fotos por produto."); return; }

    setBusy(form, true);
    var uploaded = [];
    for (var i = 0; i < draft.length; i++) {
      if (!draft[i].file) continue;
      var blob = await imageLib.optimizeImage(draft[i].file);
      if (blob.size > imageLib.MAX_IMAGE_BYTES) { setBusy(form, false); setFormError(form, "Uma das fotos passou de 8MB mesmo otimizada."); return; }
      var up = await svc.uploadProductImage(id, blob);
      if (destroyed) return;
      if (!up.ok) { setBusy(form, false); setFormError(form, up.message); await svc.removeProductImages(uploaded); return; }
      uploaded.push(up.data);
      draft[i] = { ref: up.data, url: draft[i].url };
    }
    var refs = draft.map(function (ph) { return ph.ref; });
    var factory = window.SG.catalogFactory ? window.SG.catalogFactory(id) : null;
    var isFactoryDefault = !!factory && refs.length === factory.images.length && refs.every(function (r, k) { return r === "base:" + k; });
    var row = {
      id: id,
      category: p.isCustom ? field(form, "category").value : p.category,
      description: factory && description === factory.desc ? null : (description || null),
      images: isFactoryDefault ? [] : refs,
      sold_out: field(form, "sold_out").checked,
      hidden: field(form, "hidden").checked,
    };
    var previous = (state.overlay[id] && state.overlay[id].images) || [];
    var res = await svc.saveProducts([row]);
    if (destroyed) return;
    setBusy(form, false);
    if (!res.ok) { setFormError(form, res.message); await svc.removeProductImages(uploaded); return; }
    // fotos do bucket que saíram da lista: apagar de verdade
    var dropped = previous.filter(function (ref) { return !/^base:/.test(ref) && refs.indexOf(ref) === -1; });
    if (dropped.length) await svc.removeProductImages(dropped);
    delete state.photoDraft[id];
    if (row.category !== p.category) state.prodCategory = row.category;
    await afterProductChange("PRODUTO SALVO — " + p.name.toUpperCase());
    if (row.category !== p.category) renderPanel();
  }

  async function moveProduct(id, dir) {
    var all = prodList();
    var i = all.findIndex(function (x) { return x.id === id; });
    var j = i + dir;
    if (i < 0 || j < 0 || j >= all.length) { toast(dir < 0 ? "JÁ É O PRIMEIRO" : "JÁ É O ÚLTIMO"); return; }
    var tmp = all[i]; all[i] = all[j]; all[j] = tmp;
    var res = await svc.saveProducts(all.map(function (p, k) { return { id: p.id, category: p.category, sort_order: (k + 1) * 10 }; }));
    if (destroyed) return;
    if (!res.ok) { toast(res.message.toUpperCase()); return; }
    await afterProductChange(dir < 0 ? "SUBIU UMA POSIÇÃO" : "DESCEU UMA POSIÇÃO");
  }

  async function restoreProduct(id) {
    var row = state.overlay[id];
    var res = await svc.deleteProduct(id);
    if (destroyed) return;
    if (!res.ok) { toast(res.message.toUpperCase()); return; }
    var files = ((row && row.images) || []).filter(function (ref) { return !/^base:/.test(ref); });
    if (files.length) await svc.removeProductImages(files);
    delete state.photoDraft[id];
    await afterProductChange("ORIGINAL RESTAURADO");
  }

  async function deleteProduct(id, btn) {
    // dois cliques: o primeiro pede confirmação no próprio botão
    if (btn.getAttribute("data-confirm") !== "1") {
      btn.setAttribute("data-confirm", "1");
      btn.textContent = "Confirmar: excluir de vez";
      return;
    }
    var row = state.overlay[id];
    btn.disabled = true;
    var res = await svc.deleteProduct(id);
    if (destroyed) return;
    if (!res.ok) { btn.disabled = false; toast(res.message.toUpperCase()); return; }
    await svc.clearPrices([id]);
    var files = ((row && row.images) || []).filter(function (ref) { return !/^base:/.test(ref); });
    if (files.length) await svc.removeProductImages(files);
    delete state.photoDraft[id];
    state.openProdId = null;
    await afterProductChange("PRODUTO EXCLUÍDO");
  }

  // ----- novo produto -----
  function newProductHtml() {
    var cats = window.SG_CATALOG || [];
    return '<form class="admin-editor" data-form="product-new" novalidate>' +
      "<h3>Novo produto</h3>" +
      '<div class="admin-form-grid">' +
        '<label class="admin-field">Categoria<select name="category">' + cats.map(function (c) {
          return '<option value="' + c.id + '"' + (c.id === state.prodCategory ? " selected" : "") + ">" + esc(c.label) + "</option>";
        }).join("") + "</select></label>" +
        '<label class="admin-field">Nome<input name="name" maxlength="120" autocomplete="off" placeholder="Ex.: Lupa Juliet Chrome"></label>' +
        '<label class="admin-field">Preço<span class="admin-money"><em>R$</em><input name="price" inputmode="decimal" placeholder="Sem preço (Consultar)" autocomplete="off"></span></label>' +
        '<label class="admin-field admin-field--wide">Descrição<textarea name="description" rows="2" maxlength="600" placeholder="Opcional"></textarea></label>' +
      "</div>" +
      '<div class="admin-photo-grid" data-new-photos>' + newPhotosHtml() + "</div>" +
      '<label class="admin-photo-add"><input type="file" accept="image/jpeg,image/png,image/webp" multiple data-photo-input="__new"><span>+ Fotos (a primeira é a capa)</span></label>' +
      '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
      '<div class="admin-form-actions"><button class="btn btn-ghost" type="button" data-action="prod-new-cancel">Cancelar</button><button class="btn btn-primary" type="submit">Criar produto</button></div>' +
    "</form>";
  }
  function newPhotosHtml() {
    return state.newPhotos.map(function (ph, i) {
      return '<figure class="admin-photo' + (i === 0 ? " is-cover" : "") + '"><img src="' + esc(ph.url) + '" alt="Foto ' + (i + 1) + '">' +
        (i === 0 ? "<figcaption>Capa</figcaption>" : "") +
        '<button type="button" class="admin-photo-remove" data-action="photo-remove" data-id="__new" data-index="' + i + '" aria-label="Remover foto ' + (i + 1) + '">×</button></figure>';
    }).join("");
  }
  function openNewProduct() {
    var box = bodyEl.querySelector("[data-prod-new]");
    if (!box) return;
    state.newPhotos.forEach(function (ph) { URL.revokeObjectURL(ph.url); });
    state.newPhotos = [];
    box.innerHTML = newProductHtml();
    box.querySelector('[name="name"]').focus();
  }

  async function createProduct(form) {
    setFormError(form, "");
    var category = field(form, "category").value;
    var name = field(form, "name").value.trim().replace(/\s+/g, " ");
    var description = field(form, "description").value.trim();
    var raw = field(form, "price").value.trim();
    var cents = raw ? money.parseMoneyToCents(raw) : null;
    if (!name) { setFormError(form, "Dê um nome ao produto."); return; }
    var bad = textProblem(name, "nome") || textProblem(description, "descrição");
    if (bad) { setFormError(form, bad); return; }
    if (raw && (cents === null || cents <= 0)) { setFormError(form, "Preço no formato 197,00 (ou deixe vazio)."); return; }
    if (!state.newPhotos.length) { setFormError(form, "Adicione pelo menos uma foto."); return; }
    if (state.newPhotos.length > 8) { setFormError(form, "No máximo 8 fotos por produto."); return; }

    var id = category + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    setBusy(form, true);
    var uploaded = [];
    for (var i = 0; i < state.newPhotos.length; i++) {
      var blob = await imageLib.optimizeImage(state.newPhotos[i].file);
      if (blob.size > imageLib.MAX_IMAGE_BYTES) { setBusy(form, false); setFormError(form, "Uma das fotos passou de 8MB mesmo otimizada."); await svc.removeProductImages(uploaded); return; }
      var up = await svc.uploadProductImage(id, blob);
      if (destroyed) return;
      if (!up.ok) { setBusy(form, false); setFormError(form, up.message); await svc.removeProductImages(uploaded); return; }
      uploaded.push(up.data);
    }
    var last = window.SG.catalogAll ? window.SG.catalogAll(category) : [];
    var sortOrder = last.length ? last[last.length - 1].order + 10 : 10;
    var res = await svc.createProduct({ id: id, category: category, name: name, description: description || null, images: uploaded, sort_order: sortOrder });
    if (destroyed) return;
    if (!res.ok) { setBusy(form, false); setFormError(form, res.message); await svc.removeProductImages(uploaded); return; }
    if (cents) await svc.setPrices([{ productId: id, priceCents: cents }]);
    if (destroyed) return;
    state.newPhotos.forEach(function (ph) { URL.revokeObjectURL(ph.url); });
    state.newPhotos = [];
    bodyEl.querySelector("[data-prod-new]").innerHTML = "";
    state.prodCategory = category;
    state.prodSearch = "";
    renderPanel();
    await afterProductChange("PRODUTO CRIADO — " + name.toUpperCase());
  }

  // fotos escolhidas no input (produto aberto ou formulário de novo)
  function addPhotos(input) {
    var id = input.getAttribute("data-photo-input");
    var files = Array.prototype.slice.call(input.files || []);
    input.value = "";
    var problems = files.map(function (f) { return imageLib.imageProblem(f); }).filter(Boolean);
    var ok = files.filter(function (f) { return !imageLib.imageProblem(f); });
    var form = input.closest("form");
    if (problems.length) setFormError(form, problems[0]);
    if (id === "__new") {
      ok.forEach(function (f) { state.newPhotos.push({ file: f, url: URL.createObjectURL(f) }); });
      bodyEl.querySelector("[data-new-photos]").innerHTML = newPhotosHtml();
      return;
    }
    var p = findProd(id);
    if (!p) return;
    var draft = photoDraft(p);
    ok.forEach(function (f) { draft.push({ file: f, url: URL.createObjectURL(f) }); });
    var grid = bodyEl.querySelector('[data-photo-grid="' + id + '"]');
    if (grid) grid.innerHTML = photosHtml(p);
  }

  function photoAction(action, id, index) {
    if (id === "__new") {
      var removed = state.newPhotos.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.url);
      bodyEl.querySelector("[data-new-photos]").innerHTML = newPhotosHtml();
      return;
    }
    var p = findProd(id);
    if (!p) return;
    var draft = photoDraft(p);
    if (action === "photo-remove") draft.splice(index, 1);
    else if (action === "photo-cover") draft.unshift(draft.splice(index, 1)[0]);
    var grid = bodyEl.querySelector('[data-photo-grid="' + id + '"]');
    if (grid) grid.innerHTML = photosHtml(p);
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
    var cat = prodCategory();
    if (!cat) return;
    var all = prodList();
    var cents = money.parseMoneyToCents(field(form, "price").value);
    if (cents === null || cents <= 0) { setFormError(form, "Informe um preço maior que zero, ex: 197,00."); return; }
    var btn = form.querySelector("[data-bulk-submit]");
    if (form.getAttribute("data-confirm") !== String(cents)) {
      form.setAttribute("data-confirm", String(cents));
      btn.textContent = "Confirmar: " + all.length + " peças por " + brl(cents);
      btn.classList.add("btn-primary");
      btn.classList.remove("btn-ghost");
      form.querySelector('[data-action="bulk-cancel"]').hidden = false;
      return;
    }
    setBusy(form, true);
    var res = await svc.setPrices(all.map(function (p) { return { productId: p.id, priceCents: cents }; }));
    if (destroyed) return;
    setBusy(form, false);
    if (!res.ok) { setFormError(form, res.message); return; }
    resetBulk(form);
    field(form, "price").value = "";
    await afterProductChange(cat.label.toUpperCase() + " — " + all.length + " PEÇAS POR " + brl(cents));
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
      '<table class="admin-table"><thead><tr><th scope="col">Cliente</th><th scope="col">Desde</th><th scope="col">Pedidos</th><th scope="col">Gasto</th><th scope="col">XP</th><th scope="col"><span class="sr-only">Marcas</span></th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody>' +
      rows.map(function (c) {
        var tags = [];
        if (c.is_admin) tags.push('<span class="admin-tag admin-tag--accent">Equipe</span>');
        if (c.newsletter) tags.push('<span class="admin-tag">Newsletter</span>');
        if (c.ranking_opt_in) tags.push('<span class="admin-tag">Ranking</span>');
        return '<tr data-cust-id="' + c.id + '">' +
          '<td data-label="Cliente"><span class="admin-cell"><b>' + esc(c.display_name || c.public_handle || "Sem nome") + "</b><small>" + esc(c.email) + "</small></span></td>" +
          '<td data-label="Desde"><span class="admin-cell">' + fmtDate(c.created_at) + "</span></td>" +
          '<td data-label="Pedidos"><span class="admin-cell">' + c.paid_order_count + " pagos <small>de " + c.order_count + "</small></span></td>" +
          '<td data-label="Gasto"><span class="admin-cell">' + brl(c.total_spent_cents) + "</span></td>" +
          '<td data-label="XP"><span class="admin-cell">' + c.total_xp + " <small>nível " + c.level + "</small></span></td>" +
          '<td data-label="Marcas" class="admin-table-tags"><span class="admin-cell">' + (tags.join("") || '<small>—</small>') + "</span></td>" +
          '<td data-label="Ações"><span class="admin-cell admin-cust-actions">' +
            '<button class="admin-text-btn" type="button" data-action="cust-orders" data-value="' + esc(c.email) + '">Pedidos</button>' +
            '<button class="admin-text-btn" type="button" data-action="cust-new-order" data-id="' + c.id + '">Novo pedido</button>' +
            '<button class="admin-text-btn" type="button" data-action="cust-xp" data-id="' + c.id + '">Ajustar XP</button>' +
          "</span></td>" +
        "</tr>";
      }).join("") +
      "</tbody></table>" +
      (state.customers.length > MAX_ROWS ? '<p class="admin-note">Mostrando ' + MAX_ROWS + " de " + state.customers.length + " — use a busca ou exporte o CSV.</p>" : "");
  }

  function openXpForm(btn, id) {
    var c = state.customers.find(function (x) { return x.id === id; });
    if (!c) return;
    var old = list("customers").querySelector(".admin-xp-row");
    if (old) old.remove();
    btn.closest("tr").insertAdjacentHTML("afterend",
      '<tr class="admin-xp-row"><td colspan="7">' +
        '<form class="admin-xp-form" data-form="xp" data-id="' + c.id + '" novalidate>' +
          "<p><b>" + esc(c.display_name || c.email) + "</b> tem " + c.total_xp + " XP (nível " + c.level + ")</p>" +
          '<div class="admin-form-row">' +
            '<label class="admin-field">XP (+ ou −)<input name="amount" type="number" step="1" placeholder="Ex.: 100 ou -50"></label>' +
            '<label class="admin-field admin-field--grow">Motivo<input name="note" maxlength="200" placeholder="Ex.: brinde do evento" autocomplete="off"></label>' +
          "</div>" +
          '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
          '<div class="admin-form-actions"><button class="btn btn-ghost" type="button" data-action="xp-cancel">Cancelar</button><button class="btn btn-primary" type="submit">Aplicar</button></div>' +
        "</form>" +
      "</td></tr>");
    list("customers").querySelector('.admin-xp-row [name="amount"]').focus();
  }

  async function adjustXp(form) {
    setFormError(form, "");
    var amount = Number(field(form, "amount").value);
    if (!Number.isInteger(amount) || amount === 0) { setFormError(form, "Informe um número inteiro de XP, positivo ou negativo."); return; }
    var cust = state.customers.find(function (x) { return x.id === form.getAttribute("data-id"); });
    if (cust && cust.total_xp + amount < 0) { setFormError(form, "O XP do cliente não pode ficar negativo (tem " + cust.total_xp + " XP)."); return; }
    setBusy(form, true);
    var res = await svc.adjustXp(form.getAttribute("data-id"), amount, field(form, "note").value.trim());
    if (destroyed) return;
    setBusy(form, false);
    if (!res.ok) { setFormError(form, res.message); return; }
    toast("XP AJUSTADO — TOTAL " + res.data.total_xp + " XP");
    loadCustomers();
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
      [["pending", "Pendentes"], ["approved", "Aprovadas"], ["featured", "Destaques"], ["rejected", "Rejeitadas"], ["all", "Todas"]].map(function (s) {
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
    if (!state.posts.length) {
      el.innerHTML = emptyState(state.postStatus === "pending" ? "Nenhuma foto esperando moderação."
        : state.postStatus === "featured" ? "Nenhum destaque. Em Aprovadas, toque em “Destacar na home” — o destaque abre o mural da página inicial."
        : "Nada por aqui.");
      return;
    }
    el.innerHTML = '<div class="admin-posts">' + state.posts.map(postHtml).join("") + "</div>";
  }

  function postRatio(p) {
    var r = p.image_width && p.image_height ? p.image_width / p.image_height : 0.8;
    return Math.min(1.6, Math.max(0.66, r)).toFixed(4);
  }

  function productLabel(id) {
    var prod = (window.SG_PRODUCTS || []).find(function (x) { return x.id === id; });
    return prod ? prod.name : id;
  }

  // foto grande por cima do painel (setas trocam, ESC/clique fecham)
  var zoomEl = null, zoomIndex = -1;
  function openPostZoom(id) {
    zoomIndex = state.posts.findIndex(function (p) { return p.id === id; });
    if (zoomIndex === -1) return;
    if (!zoomEl) {
      zoomEl = document.createElement("div");
      zoomEl.className = "admin-zoom";
      zoomEl.setAttribute("role", "dialog");
      zoomEl.setAttribute("aria-modal", "true");
      zoomEl.setAttribute("aria-label", "Foto em tamanho grande");
      zoomEl.addEventListener("click", function (e) {
        if (e.target.closest("[data-zoom-prev]")) stepPostZoom(-1);
        else if (e.target.closest("[data-zoom-next]")) stepPostZoom(1);
        else closePostZoom();
      });
      document.body.appendChild(zoomEl);
    }
    renderPostZoom();
  }
  function renderPostZoom() {
    var p = state.posts[zoomIndex];
    if (!p || !zoomEl) return;
    var author = p.author.display_name || (p.author.public_handle ? "@" + p.author.public_handle : "") || "Cliente";
    zoomEl.innerHTML = '<img src="' + esc(p.image_url) + '" alt="Foto enviada por ' + esc(author) + '">' +
      '<p class="admin-zoom-caption"><b>' + esc(author) + "</b>" + (p.caption ? " — " + esc(p.caption) : "") + " · " + (zoomIndex + 1) + " de " + state.posts.length + "</p>" +
      '<button class="admin-zoom-btn admin-zoom-close" type="button" aria-label="Fechar">×</button>' +
      (state.posts.length > 1 ? '<button class="admin-zoom-btn admin-zoom-prev" type="button" data-zoom-prev aria-label="Foto anterior">‹</button><button class="admin-zoom-btn admin-zoom-next" type="button" data-zoom-next aria-label="Próxima foto">›</button>' : "");
    zoomEl.querySelector(".admin-zoom-close").focus({ preventScroll: true });
  }
  function stepPostZoom(d) {
    if (!state.posts.length) return;
    zoomIndex = (zoomIndex + d + state.posts.length) % state.posts.length;
    renderPostZoom();
  }
  function closePostZoom() {
    if (!zoomEl) return;
    var id = state.posts[zoomIndex] && state.posts[zoomIndex].id;
    zoomEl.remove();
    zoomEl = null;
    var back = id && list("posts") && list("posts").querySelector('[data-post-id="' + id + '"] [data-action="post-zoom"]');
    if (back) back.focus({ preventScroll: true });
  }

  async function toggleFeatured(id, btn) {
    var post = state.posts.find(function (p) { return p.id === id; });
    if (!post) return;
    btn.disabled = true;
    var res = await svc.featurePost(id, !post.featured);
    if (destroyed) return;
    btn.disabled = false;
    if (!res.ok) { toast(res.message.toUpperCase()); return; }
    toast(post.featured ? "DESTAQUE REMOVIDO" : "FOTO EM DESTAQUE NA HOME");
    loadPosts();
  }

  function postHtml(p) {
    var author = p.author.display_name || (p.author.public_handle ? "@" + p.author.public_handle : "") || "Cliente";
    var rejecting = state.rejectingPostId === p.id;
    return '<article class="admin-post' + (p.featured ? " is-featured" : "") + '" data-post-id="' + p.id + '">' +
      (p.image_url
        ? '<button class="admin-post-media" type="button" data-action="post-zoom" data-id="' + p.id + '" style="aspect-ratio:' + postRatio(p) + '" aria-label="Ver foto de ' + esc(author) + ' em tamanho grande"><img src="' + esc(p.image_url) + '" alt="Foto enviada por ' + esc(author) + '" loading="lazy" decoding="async">' +
            (p.featured ? '<span class="admin-post-flag">★ Destaque na home</span>' : "") + "</button>"
        : '<div class="admin-post-media admin-post-media--empty">Imagem indisponível</div>') +
      '<div class="admin-post-body">' +
        '<div class="admin-post-head"><p><b>' + esc(author) + "</b><small>" + esc(p.author.email || "") + "</small></p>" +
          '<span class="admin-status admin-status--' + p.status + '">' + POST_STATUS[p.status] + "</span></div>" +
        (p.caption ? '<p class="admin-post-caption">' + esc(p.caption) + "</p>" : "") +
        '<p class="admin-post-meta">' + fmtDateTime(p.created_at) + (p.rating ? " · " + p.rating + "/5" : "") + (p.product_id ? " · Peça: " + esc(productLabel(p.product_id)) : "") +
          (p.status === "approved" ? " · ♥ " + (p.like_count || 0) + (p.like_count === 1 ? " curtida" : " curtidas") : "") + "</p>" +
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
              (p.status === "approved" ? '<button class="btn ' + (p.featured ? "btn-ghost" : "btn-primary") + '" type="button" data-action="post-feature" data-id="' + p.id + '" aria-pressed="' + (p.featured ? "true" : "false") + '">' + (p.featured ? "Tirar do destaque" : "Destacar na home") + "</button>" : "") +
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
          "<p>" + couponDiscount(c) + " off · " + c.uses_count + (c.max_uses ? " / " + c.max_uses : "") + " usos" + (c.per_customer_limit ? " · " + c.per_customer_limit + " por cliente" : "") + "</p>" +
          "<small>" + (c.valid_until ? (expired ? "Expirou " : "Até ") + fmtDate(c.valid_until) : "Sem data de fim") + "</small></div>" +
        '<div class="admin-card-side"><span class="admin-status admin-status--' + (c.active && !expired ? "on" : "off") + '">' + (c.active ? (expired ? "Expirado" : "Ativo") : "Inativo") + "</span>" +
          '<div class="admin-card-actions"><button class="admin-text-btn" type="button" data-action="coupon-edit" data-id="' + esc(c.code) + '">Editar</button>' +
          '<button class="admin-text-btn" type="button" data-action="coupon-toggle" data-id="' + esc(c.code) + '">' + (c.active ? "Desativar" : "Ativar") + "</button></div></div>" +
      "</li>";
    }).join("") + "</ul>";
  }

  function couponEditorHtml(c) {
    var isNew = !c;
    c = c || { code: "", discount_percent: 10, discount_cents: null, max_uses: null, per_customer_limit: null, valid_from: new Date().toISOString(), valid_until: null, active: true };
    var kind = c.discount_cents ? "cents" : "percent";
    return '<form class="admin-editor" data-form="coupon" data-new="' + isNew + '" novalidate>' +
      '<h3>' + (isNew ? "Novo cupom" : "Editar " + esc(c.code)) + "</h3>" +
      '<div class="admin-form-grid">' +
        '<label class="admin-field">Código<input name="code" value="' + esc(c.code) + '" maxlength="32" autocapitalize="characters" autocomplete="off" placeholder="RUA034"' + (isNew ? "" : " readonly") + "></label>" +
        '<label class="admin-field">Tipo<select name="kind"><option value="percent"' + (kind === "percent" ? " selected" : "") + '>% de desconto</option><option value="cents"' + (kind === "cents" ? " selected" : "") + ">Valor fixo (R$)</option></select></label>" +
        '<label class="admin-field">Desconto<input name="amount" inputmode="decimal" value="' + (kind === "percent" ? esc(c.discount_percent || "") : money.centsToInput(c.discount_cents)) + '" placeholder="10"></label>' +
        '<label class="admin-field">Limite de usos (total)<input name="max_uses" inputmode="numeric" value="' + esc(c.max_uses || "") + '" placeholder="Sem limite"></label>' +
        '<label class="admin-field">Limite por cliente<input name="per_customer_limit" inputmode="numeric" value="' + esc(c.per_customer_limit || "") + '" placeholder="Sem limite"></label>' +
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
    var perCustomer = field(form, "per_customer_limit").value.trim() ? Number(field(form, "per_customer_limit").value) : null;
    if (perCustomer !== null && (!Number.isInteger(perCustomer) || perCustomer < 1)) { setFormError(form, "Limite por cliente deve ser um número inteiro."); return; }
    var from = dateFromInput(field(form, "valid_from").value, false) || new Date().toISOString();
    var until = dateFromInput(field(form, "valid_until").value, true);
    if (until && until < from) { setFormError(form, "A data de fim vem antes do início."); return; }
    if (isNew && state.coupons.some(function (c) { return c.code === code; })) { setFormError(form, "Já existe um cupom com esse código."); return; }

    setBusy(form, true);
    var res = await svc.saveCoupon({ code: code, discount_percent: percent, discount_cents: cents, max_uses: maxUses, per_customer_limit: perCustomer, valid_from: from, valid_until: until, active: field(form, "active").checked }, isNew);
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
        '<label class="admin-field">Cupom entregue<input name="coupon_code" value="' + esc(r.coupon_code || "") + '" list="admin-coupon-codes" maxlength="32" autocomplete="off" placeholder="Opcional"><small>Cupom ligado a recompensa só vale para quem resgatou.</small></label>' +
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
      ({ orders: loadOrders, products: loadProducts, customers: loadCustomers, posts: loadPosts, promo: loadPromo, newsletter: loadNewsletter })[what]();
    }
    else if (action === "order-filter") { state.orderStatus = value; state.openOrderId = null; markChip(btn); loadOrders(); }
    else if (action === "order-toggle") {
      var previousOrder = state.openOrderId;
      state.openOrderId = previousOrder === id ? null : id;
      [previousOrder, id].forEach(function (oid) {
        if (!oid) return;
        var o = state.orders.find(function (x) { return x.id === oid; });
        var el = list("orders").querySelector('[data-order-id="' + oid + '"]');
        if (o && el) el.outerHTML = orderHtml(o);
      });
    }
    else if (action === "order-move") { saveOrder(btn.closest("form"), btn.getAttribute("data-status")); }
    else if (action === "order-new") { openNewOrder(null); }
    else if (action === "order-new-cancel") { bodyEl.querySelector("[data-order-new]").innerHTML = ""; }
    else if (action === "order-delete") { deleteOrder(id, btn); }
    else if (action === "item-add") {
      var itemForm = btn.closest("form");
      var newRow = addItemRow(itemForm);
      newRow.querySelector('[name="item_name"]').focus();
      recalcOrderForm(itemForm);
    }
    else if (action === "item-remove") {
      var removeForm = btn.closest("form");
      btn.closest("[data-item-row]").remove();
      recalcOrderForm(removeForm);
    }
    else if (action === "cust-orders") {
      state.orderStatus = "all";
      state.orderSearch = value || "";
      state.openOrderId = null;
      selectTab("pedidos");
    }
    else if (action === "cust-new-order") {
      var cust = state.customers.find(function (c) { return c.id === id; });
      state.newOrderPrefill = cust ? { name: cust.display_name || "", email: cust.email || "", account: cust.email || "" } : null;
      selectTab("pedidos");
    }
    else if (action === "cust-xp") { openXpForm(btn, id); }
    else if (action === "xp-cancel") { var xpRow = btn.closest(".admin-xp-row"); if (xpRow) xpRow.remove(); }
    else if (action === "export-customers") { exportCustomers(); }
    else if (action === "post-filter") { state.postStatus = value; state.rejectingPostId = null; markChip(btn); loadPosts(); }
    else if (action === "post-approve") { btn.disabled = true; moderate(id, "approved"); }
    else if (action === "post-feature") { toggleFeatured(id, btn); }
    else if (action === "post-zoom") { openPostZoom(id); }
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
    else if (action === "prod-cat") {
      state.prodCategory = value;
      state.prodSearch = "";
      state.openProdId = null;
      var prodSearch = bodyEl.querySelector('[data-search="products"]');
      if (prodSearch) prodSearch.value = "";
      markChip(btn);
      renderProdCategory();
    }
    else if (action === "prod-toggle") {
      var previous = state.openProdId;
      state.openProdId = previous === id ? null : id;
      delete state.photoDraft[id];
      if (previous && previous !== id) rerenderProd(previous);
      rerenderProd(id);
    }
    else if (action === "prod-new") { openNewProduct(); }
    else if (action === "prod-new-cancel") {
      state.newPhotos.forEach(function (ph) { URL.revokeObjectURL(ph.url); });
      state.newPhotos = [];
      bodyEl.querySelector("[data-prod-new]").innerHTML = "";
    }
    else if (action === "photo-remove" || action === "photo-cover") { photoAction(action, id, Number(btn.getAttribute("data-index"))); }
    else if (action === "prod-move") { btn.disabled = true; moveProduct(id, Number(btn.getAttribute("data-dir"))); }
    else if (action === "prod-restore") { btn.disabled = true; restoreProduct(id); }
    else if (action === "prod-delete") { deleteProduct(id, btn); }
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
    else if (kind === "xp") adjustXp(form);
    else if (kind === "reject") {
      var reason = field(form, "reason").value.trim();
      if (!reason) { setFormError(form, "Informe o motivo da rejeição."); field(form, "reason").focus(); return; }
      moderate(form.getAttribute("data-id"), "rejected", reason, form);
    }
    else if (kind === "coupon") saveCoupon(form);
    else if (kind === "reward") saveReward(form);
    else if (kind === "product") saveProductRow(form);
    else if (kind === "product-detail") saveProductDetail(form);
    else if (kind === "product-new") createProduct(form);
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
      if (which === "products") { state.prodSearch = search.value; renderProdList(); return; }
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        if (which === "orders") { state.orderSearch = search.value; loadOrders(); }
        else if (which === "customers") { state.customerSearch = search.value; loadCustomers(); }
      }, 300);
      return;
    }
    var orderForm = e.target.closest('[data-form="order"]');
    if (orderForm) {
      if (e.target.name === "item_name") onItemName(e.target);
      recalcOrderForm(orderForm);
    }
  }

  // escolha de fotos (produto aberto ou novo produto)
  function onChange(e) {
    if (e.target.matches && e.target.matches("[data-photo-input]")) addPhotos(e.target);
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
    if (zoomEl) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePostZoom(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stepPostZoom(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); stepPostZoom(1); }
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
  root.addEventListener("change", onChange);
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
    root.removeEventListener("change", onChange);
    state.newPhotos.forEach(function (ph) { URL.revokeObjectURL(ph.url); });
    if (zoomEl) { zoomEl.remove(); zoomEl = null; }
    robots.remove();
  };
}
