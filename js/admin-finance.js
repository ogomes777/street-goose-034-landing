/* Street Goose 034 — /admin → Financeiro (migration 0106).
   Saldo em caixa, entradas, saídas e resultado do período (com comparação
   ao período anterior), vendas e ticket médio, a receber, gráfico de
   entradas × saídas, categorias, peças que mais venderam e o livro-caixa.
   Venda/estorno entram sozinhos pelo pedido; aqui o lojista lança o resto
   (mercadoria, frete, embalagem, marketing, taxas, retirada, aporte…). */
import { countUp, flowChart, categoryBarsHtml } from "./admin-viz.js";

var CATEGORY = {
  venda: "Venda", estorno: "Estorno", ajuste: "Ajuste de pedido",
  aporte: "Aporte", outra_entrada: "Outra entrada",
  mercadoria: "Mercadoria", frete: "Frete", embalagem: "Embalagem", marketing: "Marketing",
  taxas: "Taxas e tarifas", retirada: "Retirada", outra_saida: "Outra saída",
};
var MANUAL = { in: ["aporte", "outra_entrada"], out: ["mercadoria", "frete", "embalagem", "marketing", "taxas", "retirada", "outra_saida"] };
var PERIODS = [["today", "Hoje"], ["7d", "7 dias"], ["30d", "30 dias"], ["month", "Este mês"], ["12m", "12 meses"], ["all", "Tudo"]];
var MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
var ICON_IN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';
var ICON_OUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 7L7 17M15 17H7V9"/></svg>';

function catLabel(c) { return CATEGORY[c] || c; }

function rangeOf(period) {
  var now = new Date();
  var day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var from = null, bucket = "day";
  if (period === "today") from = day;
  else if (period === "7d") from = new Date(day.getTime() - 6 * 864e5);
  else if (period === "30d") from = new Date(day.getTime() - 29 * 864e5);
  else if (period === "month") from = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (period === "12m") { from = new Date(now.getFullYear(), now.getMonth() - 11, 1); bucket = "month"; }
  else bucket = "month";
  return { from: from ? from.toISOString() : null, to: null, bucket: bucket };
}

function dateInputOf(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function todayInput() { return dateInputOf(new Date()); }

export function mountFinance(panel, ctx) {
  var esc = ctx.esc, brl = ctx.brl;
  var state = { period: "30d", kind: "all", search: "", summary: null, items: [], editing: null, confirmDelete: null };
  var destroyed = false;
  var seq = 0, listSeq = 0;
  var chartDestroy = null;
  var resizeObs = null;
  var searchTimer = null;

  panel.innerHTML =
    '<div class="fin">' +
      '<div class="admin-toolbar fin-toolbar">' +
        '<div class="admin-chips" role="group" aria-label="Período">' +
          PERIODS.map(function (p) { return '<button class="admin-chip' + (p[0] === state.period ? " is-active" : "") + '" type="button" data-fin-period="' + p[0] + '" aria-pressed="' + (p[0] === state.period) + '">' + p[1] + "</button>"; }).join("") +
        "</div>" +
        '<button class="btn btn-primary fin-new" type="button" data-fin-new><span aria-hidden="true">+</span> Lançar movimento</button>' +
      "</div>" +
      '<div data-fin-editor></div>' +
      '<div class="fin-cards" data-fin-cards aria-live="polite">' + skeletonCards() + "</div>" +
      '<div class="fin-grid">' +
        '<section class="fin-card fin-card--chart"><header class="fin-card-head"><div><p class="admin-eyebrow">FLUXO DE CAIXA</p><h3>Entradas e saídas</h3></div>' +
          '<div class="fin-legend" data-fin-legend></div></header><div class="fin-chart" data-fin-chart><div class="fin-skel fin-skel--chart"></div></div></section>' +
        '<section class="fin-card"><header class="fin-card-head"><div><p class="admin-eyebrow">PARA ONDE VAI</p><h3>Saídas por categoria</h3></div></header><div data-fin-cats-out><div class="fin-skel"></div></div>' +
          '<header class="fin-card-head fin-card-head--sub"><div><p class="admin-eyebrow">DE ONDE VEM</p><h3>Entradas por categoria</h3></div></header><div data-fin-cats-in><div class="fin-skel"></div></div></section>' +
      "</div>" +
      '<section class="fin-card fin-card--top"><header class="fin-card-head"><div><p class="admin-eyebrow">VENDAS DO PERÍODO</p><h3>Peças que mais venderam</h3></div></header><div data-fin-top><div class="fin-skel"></div></div></section>' +
      '<section class="fin-card fin-card--ledger"><header class="fin-card-head"><div><p class="admin-eyebrow">LIVRO-CAIXA</p><h3>Movimentações</h3></div>' +
        '<div class="fin-ledger-tools"><div class="admin-chips admin-chips--small" role="group" aria-label="Tipo">' +
          [["all", "Tudo"], ["in", "Entradas"], ["out", "Saídas"]].map(function (k) { return '<button class="admin-chip' + (k[0] === state.kind ? " is-active" : "") + '" type="button" data-fin-kind="' + k[0] + '" aria-pressed="' + (k[0] === state.kind) + '">' + k[1] + "</button>"; }).join("") +
        '</div><label class="admin-search fin-search"><span class="sr-only">Buscar movimentação</span><input type="search" data-fin-search placeholder="Buscar (ex.: frete, #A1B2)" autocomplete="off"></label></div></header>' +
        '<div data-fin-list><div class="fin-skel"></div><div class="fin-skel"></div></div></section>' +
    "</div>";

  function q(sel) { return panel.querySelector(sel); }

  function skeletonCards() {
    var s = "";
    for (var i = 0; i < 7; i++) s += '<div class="fin-stat is-skeleton' + (i === 0 ? " fin-stat--hero" : "") + '"></div>';
    return s;
  }

  // ---------- resumo ----------
  function deltaHtml(cur, prev, upIsGood) {
    if (!prev && !cur) return '<span class="fin-delta">sem movimento no período anterior</span>';
    if (!prev) return '<span class="fin-delta">novo no período</span>';
    var pct = Math.round(((cur - prev) / prev) * 100);
    if (pct === 0) return '<span class="fin-delta">igual ao período anterior</span>';
    var up = pct > 0;
    var good = up === upIsGood;
    return '<span class="fin-delta ' + (good ? "is-good" : "is-bad") + '"><i aria-hidden="true">' + (up ? "▲" : "▼") + "</i>" + Math.abs(pct) + "% vs período anterior</span>";
  }

  function stat(key, label, sub, extraClass) {
    return '<article class="fin-stat' + (extraClass ? " " + extraClass : "") + '" data-fin-stat="' + key + '">' +
      '<p class="fin-stat-label">' + label + "</p>" +
      '<b class="fin-stat-value" data-fin-value="' + key + '">—</b>' +
      '<p class="fin-stat-sub" data-fin-sub="' + key + '">' + (sub || "") + "</p></article>";
  }

  function renderCards(s) {
    var box = q("[data-fin-cards]");
    if (!box.querySelector("[data-fin-stat]")) {
      box.innerHTML =
        stat("balance", "Saldo em caixa", "", "fin-stat--hero") +
        stat("in", "Entradas", "", "fin-stat--in") +
        stat("out", "Saídas", "", "fin-stat--out") +
        stat("net", "Resultado do período", "") +
        stat("sales", "Vendas", "") +
        stat("receivable", "A receber", "") +
        stat("refunds", "Reembolsos", "");
    }
    var net = s.in_cents - s.out_cents;
    countUp(box.querySelector('[data-fin-value="balance"]'), s.balance_cents, signedBrl);
    countUp(box.querySelector('[data-fin-value="in"]'), s.in_cents, brl);
    countUp(box.querySelector('[data-fin-value="out"]'), s.out_cents, brl);
    countUp(box.querySelector('[data-fin-value="net"]'), net, signedBrl);
    countUp(box.querySelector('[data-fin-value="sales"]'), s.sales_count, function (v) { return String(v); });
    countUp(box.querySelector('[data-fin-value="receivable"]'), s.receivable_cents, brl);
    countUp(box.querySelector('[data-fin-value="refunds"]'), s.refunds_cents, brl);
    box.querySelector('[data-fin-stat="balance"]').classList.toggle("is-negative", s.balance_cents < 0);
    box.querySelector('[data-fin-stat="net"]').classList.toggle("is-negative", net < 0);
    sub("balance", "Tudo que entrou menos tudo que saiu, desde o início");
    q('[data-fin-sub="in"]').innerHTML = deltaHtml(s.in_cents, s.prev_in_cents, true);
    q('[data-fin-sub="out"]').innerHTML = deltaHtml(s.out_cents, s.prev_out_cents, false);
    sub("net", net >= 0 ? "Sobrou no período" : "Saiu mais do que entrou");
    sub("sales", s.sales_count ? "Ticket médio " + brl(s.avg_ticket_cents) + " · " + brl(s.sales_cents) + " líquidos" : "Nenhuma venda paga no período");
    sub("receivable", s.receivable_count ? s.receivable_count + (s.receivable_count === 1 ? " pedido aguardando pagamento" : " pedidos aguardando pagamento") : "Nenhum pedido aguardando");
    sub("refunds", "Estornos de pedidos no período");
  }
  function sub(key, text) { var el = q('[data-fin-sub="' + key + '"]'); if (el) el.textContent = text; }
  function signedBrl(v) { return (v < 0 ? "−" : "") + brl(Math.abs(v)); }

  function pointLabel(p) {
    var d = new Date(p.d);
    if (state.summary && state.summary.bucket === "month") return MONTHS[d.getUTCMonth()] + (state.period === "all" ? "/" + String(d.getUTCFullYear()).slice(2) : "");
    return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0");
  }
  function pointLong(p) {
    var d = new Date(p.d);
    var txt = state.summary && state.summary.bucket === "month"
      ? MONTHS[d.getUTCMonth()] + " de " + d.getUTCFullYear()
      : d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }).replace(/\./g, "");
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  function renderChart(s) {
    var box = q("[data-fin-chart]");
    if (chartDestroy) chartDestroy();
    // a série vem em UTC (date_trunc no servidor); rótulos lidos em UTC
    chartDestroy = flowChart(box, s.series, pointLabel, pointLong);
    q("[data-fin-legend]").innerHTML =
      '<span><i class="fin-dot fin-dot--in"></i>Entradas <b>' + brl(s.in_cents) + "</b></span>" +
      '<span><i class="fin-dot fin-dot--out"></i>Saídas <b>' + brl(s.out_cents) + "</b></span>";
  }

  function renderCategories(s) {
    var ins = s.by_category.filter(function (c) { return c.kind === "in"; });
    var outs = s.by_category.filter(function (c) { return c.kind === "out"; });
    q("[data-fin-cats-out]").innerHTML = categoryBarsHtml(outs, "out", catLabel);
    q("[data-fin-cats-in]").innerHTML = categoryBarsHtml(ins, "in", catLabel);
  }

  function renderTop(s) {
    var box = q("[data-fin-top]");
    if (!s.top_products.length) { box.innerHTML = '<p class="fin-muted">Nenhuma venda paga no período.</p>'; return; }
    var max = s.top_products[0].cents || 1;
    box.innerHTML = '<ol class="fin-top">' + s.top_products.map(function (t, i) {
      var p = (window.SG_PRODUCTS || []).find(function (x) { return x.id === t.product_id; });
      var thumb = p && p.images && p.images[0] ? ((window.SG.thumbFor && window.SG.thumbFor(p.images[0])) || p.images[0]) : null;
      return '<li style="--i:' + i + '"><span class="fin-top-rank">' + (i + 1) + "</span>" +
        '<span class="fin-top-thumb" aria-hidden="true">' + (thumb ? '<img src="' + esc(thumb) + '" alt="" loading="lazy" decoding="async">' : "") + "</span>" +
        '<span class="fin-top-name"><b>' + esc(p ? p.name : t.name) + "</b><small>" + t.qty + (t.qty === 1 ? " unidade" : " unidades") + "</small>" +
          '<span class="fin-top-bar" aria-hidden="true"><i style="width:' + Math.max(3, (t.cents / max) * 100).toFixed(1) + '%"></i></span></span>' +
        '<b class="fin-top-value">' + brl(t.cents) + "</b></li>";
    }).join("") + "</ol>";
  }

  async function loadSummary() {
    var n = ++seq;
    var r = rangeOf(state.period);
    var res = await ctx.svc.financeSummary(r.from, r.to, r.bucket);
    if (destroyed || n !== seq) return;
    if (!res.ok) { q("[data-fin-cards]").innerHTML = '<div class="admin-state admin-state--error"><p>' + esc(res.message) + "</p></div>"; return; }
    state.summary = res.data;
    renderCards(res.data);
    renderChart(res.data);
    renderCategories(res.data);
    renderTop(res.data);
  }

  // ---------- livro-caixa ----------
  function rowHtml(e) {
    var isIn = e.kind === "in";
    var when = new Date(e.occurred_at);
    var meta = [catLabel(e.category), when.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " + when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })];
    if (e.source === "order") meta.push("automático");
    var confirming = state.confirmDelete === e.id;
    return '<li class="fin-row fin-row--' + e.kind + '" data-fin-row="' + e.id + '">' +
      '<span class="fin-row-icon" aria-hidden="true">' + (isIn ? ICON_IN : ICON_OUT) + "</span>" +
      '<span class="fin-row-main"><b>' + esc(e.description || catLabel(e.category)) + "</b><small>" + esc(meta.join(" · ")) + "</small></span>" +
      '<b class="fin-row-amount"><span class="sr-only">' + (isIn ? "Entrada" : "Saída") + " </span>" + (isIn ? "+ " : "− ") + brl(e.amount_cents) + "</b>" +
      '<span class="fin-row-actions">' +
        (e.source === "order" && e.order_id
          ? '<button class="admin-text-btn" type="button" data-fin-order="' + e.order_id + '">Ver pedido</button>'
          : confirming
            ? '<span class="fin-confirm">Excluir?</span><button class="admin-text-btn fin-danger" type="button" data-fin-delete-yes="' + e.id + '">Sim</button><button class="admin-text-btn" type="button" data-fin-delete-no>Não</button>'
            : '<button class="admin-text-btn" type="button" data-fin-edit="' + e.id + '">Editar</button><button class="admin-text-btn fin-danger" type="button" data-fin-delete="' + e.id + '">Excluir</button>') +
      "</span></li>";
  }

  function renderList() {
    var box = q("[data-fin-list]");
    if (!state.items.length) {
      box.innerHTML = '<div class="fin-empty"><p>' + (state.search || state.kind !== "all" ? "Nada com esse filtro no período." : "Nenhuma movimentação no período.") + "</p>" +
        '<p class="fin-muted">Vendas pagas entram aqui sozinhas. Despesas e aportes você lança em “Lançar movimento”.</p></div>';
      return;
    }
    box.innerHTML = '<ol class="fin-rows">' + state.items.map(rowHtml).join("") + "</ol>" +
      (state.total > state.items.length ? '<p class="admin-note">Mostrando ' + state.items.length + " de " + state.total + " — refine o período ou a busca.</p>" : "");
  }

  async function loadList() {
    var n = ++listSeq;
    var r = rangeOf(state.period);
    var res = await ctx.svc.listFinance({ from: r.from, to: r.to, kind: state.kind === "all" ? null : state.kind, search: state.search, limit: 200 });
    if (destroyed || n !== listSeq) return;
    if (!res.ok) { q("[data-fin-list]").innerHTML = '<div class="admin-state admin-state--error"><p>' + esc(res.message) + "</p></div>"; return; }
    state.items = res.data.items;
    state.total = res.data.total;
    renderList();
  }

  // ---------- lançar / editar ----------
  function editorHtml(entry) {
    var kind = entry ? entry.kind : "out";
    var cat = entry ? entry.category : MANUAL[kind][0];
    var date = entry ? dateInputOf(new Date(entry.occurred_at)) : todayInput();
    return '<form class="fin-form" data-fin-form novalidate>' +
      '<header class="fin-form-head"><div><p class="admin-eyebrow">' + (entry ? "EDITAR LANÇAMENTO" : "NOVO LANÇAMENTO") + "</p><h3>" + (entry ? "Editar movimento" : "Lançar movimento") + "</h3></div>" +
        '<div class="fin-kind" role="radiogroup" aria-label="Tipo">' +
          '<button type="button" role="radio" class="fin-kind-btn fin-kind-btn--out" data-fin-set-kind="out" aria-checked="' + (kind === "out") + '">' + ICON_OUT + "Saída</button>" +
          '<button type="button" role="radio" class="fin-kind-btn fin-kind-btn--in" data-fin-set-kind="in" aria-checked="' + (kind === "in") + '">' + ICON_IN + "Entrada</button>" +
        "</div></header>" +
      '<input type="hidden" name="kind" value="' + kind + '"><input type="hidden" name="category" value="' + cat + '">' +
      '<div class="fin-form-grid">' +
        '<label class="admin-field fin-amount">Valor<span class="fin-amount-input"><i>R$</i><input name="amount" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + (entry ? ctx.money.centsToInput(entry.amount_cents) : "") + '" required></span></label>' +
        '<label class="admin-field">Data<input type="date" name="date" value="' + date + '" max="' + todayInput() + '"></label>' +
        '<div class="admin-field admin-field--wide"><span>Categoria</span><div class="admin-chips" data-fin-cats role="radiogroup" aria-label="Categoria">' + catChips(kind, cat) + "</div></div>" +
        '<label class="admin-field admin-field--wide">Descrição<input name="description" maxlength="200" autocomplete="off" placeholder="Ex.: lote de 20 lupas, frete dos Correios, anúncio do Instagram" value="' + esc(entry && entry.description ? entry.description : "") + '"></label>' +
      "</div>" +
      '<p class="admin-form-error" data-form-error role="alert" hidden></p>' +
      '<div class="admin-form-actions"><button class="btn btn-ghost" type="button" data-fin-cancel>Cancelar</button><button class="btn btn-primary" type="submit">' + (entry ? "Salvar" : "Lançar") + "</button></div>" +
    "</form>";
  }
  function catChips(kind, current) {
    return MANUAL[kind].map(function (c) {
      return '<button class="admin-chip' + (c === current ? " is-active" : "") + '" type="button" role="radio" aria-checked="' + (c === current) + '" data-fin-cat="' + c + '">' + esc(CATEGORY[c]) + "</button>";
    }).join("");
  }
  function openEditor(entry) {
    state.editing = entry ? entry.id : "new";
    var box = q("[data-fin-editor]");
    box.innerHTML = editorHtml(entry);
    var input = box.querySelector('[name="amount"]');
    input.focus({ preventScroll: true });
    box.scrollIntoView({ block: "nearest", behavior: ctx.reduced ? "auto" : "smooth" });
  }
  function closeEditor() {
    state.editing = null;
    q("[data-fin-editor]").innerHTML = "";
    var btn = q("[data-fin-new]");
    if (btn) btn.focus({ preventScroll: true });
  }
  function formError(form, msg) { var el = form.querySelector("[data-form-error]"); el.textContent = msg; el.hidden = !msg; }

  async function submitForm(form) {
    var amount = ctx.money.parseMoneyToCents(form.querySelector('[name="amount"]').value.trim());
    if (!amount || amount <= 0) { formError(form, "Informe um valor maior que zero."); form.querySelector('[name="amount"]').focus(); return; }
    var dateVal = form.querySelector('[name="date"]').value || todayInput();
    var parts = dateVal.split("-").map(Number);
    var when = dateVal === todayInput() ? new Date() : new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    var entry = {
      kind: form.querySelector('[name="kind"]').value,
      category: form.querySelector('[name="category"]').value,
      amount_cents: amount,
      description: form.querySelector('[name="description"]').value.trim(),
      occurred_at: when.toISOString(),
    };
    formError(form, "");
    var submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    var res = await ctx.svc.saveFinanceEntry(state.editing === "new" ? null : state.editing, entry);
    if (destroyed) return;
    submit.disabled = false;
    if (!res.ok) { formError(form, res.message); return; }
    ctx.toast(state.editing === "new" ? (entry.kind === "in" ? "ENTRADA LANÇADA" : "SAÍDA LANÇADA") : "LANÇAMENTO ATUALIZADO");
    closeEditor();
    refresh();
    ctx.onChange();
  }

  async function removeEntry(id, btn) {
    btn.disabled = true;
    var res = await ctx.svc.deleteFinanceEntry(id);
    if (destroyed) return;
    state.confirmDelete = null;
    if (!res.ok) { ctx.toast(res.message.toUpperCase()); renderList(); return; }
    ctx.toast("LANÇAMENTO EXCLUÍDO");
    refresh();
    ctx.onChange();
  }

  // ---------- eventos ----------
  function onClick(e) {
    var t = e.target;
    var per = t.closest("[data-fin-period]");
    if (per) {
      state.period = per.getAttribute("data-fin-period");
      panel.querySelectorAll("[data-fin-period]").forEach(function (b) { var on = b === per; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on)); });
      refresh();
      return;
    }
    var kind = t.closest("[data-fin-kind]");
    if (kind) {
      state.kind = kind.getAttribute("data-fin-kind");
      panel.querySelectorAll("[data-fin-kind]").forEach(function (b) { var on = b === kind; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on)); });
      loadList();
      return;
    }
    if (t.closest("[data-fin-new]")) { openEditor(null); return; }
    if (t.closest("[data-fin-cancel]")) { closeEditor(); return; }
    var setKind = t.closest("[data-fin-set-kind]");
    if (setKind) {
      var form = setKind.closest("form");
      var k = setKind.getAttribute("data-fin-set-kind");
      form.querySelector('[name="kind"]').value = k;
      form.querySelector('[name="category"]').value = MANUAL[k][0];
      form.querySelectorAll("[data-fin-set-kind]").forEach(function (b) { b.setAttribute("aria-checked", String(b === setKind)); });
      form.querySelector("[data-fin-cats]").innerHTML = catChips(k, MANUAL[k][0]);
      return;
    }
    var cat = t.closest("[data-fin-cat]");
    if (cat) {
      var f = cat.closest("form");
      f.querySelector('[name="category"]').value = cat.getAttribute("data-fin-cat");
      f.querySelectorAll("[data-fin-cat]").forEach(function (b) { var on = b === cat; b.classList.toggle("is-active", on); b.setAttribute("aria-checked", String(on)); });
      return;
    }
    var edit = t.closest("[data-fin-edit]");
    if (edit) { openEditor(state.items.find(function (x) { return x.id === edit.getAttribute("data-fin-edit"); })); return; }
    var del = t.closest("[data-fin-delete]");
    if (del) { state.confirmDelete = del.getAttribute("data-fin-delete"); renderList(); var yes = q("[data-fin-delete-yes]"); if (yes) yes.focus(); return; }
    if (t.closest("[data-fin-delete-no]")) { state.confirmDelete = null; renderList(); return; }
    var yes2 = t.closest("[data-fin-delete-yes]");
    if (yes2) { removeEntry(yes2.getAttribute("data-fin-delete-yes"), yes2); return; }
    var ord = t.closest("[data-fin-order]");
    if (ord) { ctx.openOrder(ord.getAttribute("data-fin-order")); }
  }
  function onSubmit(e) {
    var form = e.target.closest("[data-fin-form]");
    if (!form) return;
    e.preventDefault();
    submitForm(form);
  }
  function onInput(e) {
    if (!e.target.matches("[data-fin-search]")) return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { state.search = e.target.value; loadList(); }, 280);
  }
  // o painel pega o ESC antes de todo mundo (captura); pergunta aqui primeiro
  function handleEscape(e) {
    if (state.editing) { closeEditor(); return true; }
    var chart = e.target.closest && e.target.closest(".fin-chart-wrap");
    if (chart) { chart.blur(); return true; }
    return false;
  }
  panel.addEventListener("click", onClick);
  panel.addEventListener("submit", onSubmit);
  panel.addEventListener("input", onInput);

  // gráfico acompanha a largura (desktop ↔ celular, painel lateral aberto)
  if ("ResizeObserver" in window) {
    var lastW = 0;
    resizeObs = new ResizeObserver(function (entries) {
      var w = Math.round(entries[0].contentRect.width);
      if (!state.summary || Math.abs(w - lastW) < 24) return;
      lastW = w;
      renderChart(state.summary);
    });
    resizeObs.observe(q("[data-fin-chart]"));
  }

  function refresh() { loadSummary(); loadList(); }
  refresh();

  return {
    /** atualização ao vivo (painel faz a cada ~20s): não mexe no formulário aberto */
    refresh: refresh,
    handleEscape: handleEscape,
    destroy: function () {
      destroyed = true;
      clearTimeout(searchTimer);
      if (chartDestroy) chartDestroy();
      if (resizeObs) resizeObs.disconnect();
      panel.removeEventListener("click", onClick);
      panel.removeEventListener("submit", onSubmit);
      panel.removeEventListener("input", onInput);
    },
  };
}
