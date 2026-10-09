/* Street Goose 034 — números e gráficos do painel (/admin).
   - countUp: número que conta até o valor novo (e brilha quando muda).
   - sparkSvg: mini-gráfico dos cartões do topo (decorativo: o número é o
     conteúdo, aria-hidden).
   - flowChart: entradas (para cima, azul) e saídas (para baixo, vermelho)
     num eixo só — polaridade, não duas escalas. Barras finas com ponta
     arredondada, 2px de folga na linha do zero, dica ao passar o mouse /
     setas do teclado. Paleta validada no fundo escuro do painel
     (dataviz validate_palette: #3987e5 / #e66767 em #101010, tudo PASS).
   Tudo respeita prefers-reduced-motion. */

var REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function reducedMotion() { return REDUCED; }

function brl(cents) { return window.SG.formatPrice(Math.round(Number(cents) || 0)); }

/** R$ 1,2 mil · R$ 3,4 mi — para eixo e rótulos curtos */
export function brlCompact(cents) {
  var v = Math.abs(Number(cents) || 0) / 100;
  var sign = cents < 0 ? "−" : "";
  if (v >= 1e6) return sign + "R$ " + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(".", ",").replace(",0", "") + " mi";
  if (v >= 1e3) return sign + "R$ " + (v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(".", ",").replace(",0", "") + " mil";
  return sign + "R$ " + Math.round(v);
}

/** conta do valor atual até o novo; marca .is-updated quando muda depois do 1º */
export function countUp(el, to, format) {
  if (!el) return;
  var fmt = format || brl;
  var from = typeof el.__v === "number" ? el.__v : null;
  el.__v = to;
  if (from === to) { el.textContent = fmt(to); return; }
  if (from !== null) {
    el.classList.remove("is-updated");
    void el.offsetWidth;
    el.classList.add("is-updated");
  }
  if (REDUCED) { el.textContent = fmt(to); return; }
  var start = from === null ? 0 : from;
  var dur = from === null ? 1100 : 750;
  var t0 = performance.now();
  cancelAnimationFrame(el.__raf);
  clearTimeout(el.__end);
  function step(now) {
    var t = Math.min(1, (now - t0) / dur);
    var e = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(Math.round(start + (to - start) * e));
    if (t < 1) el.__raf = requestAnimationFrame(step);
  }
  el.__raf = requestAnimationFrame(step);
  // aba em segundo plano não roda rAF: garante o valor final
  el.__end = setTimeout(function () { cancelAnimationFrame(el.__raf); el.textContent = fmt(to); }, dur + 120);
}

var uid = 0;
/** mini-gráfico de área (valores >= 0 ou acumulado) */
export function sparkSvg(values, color) {
  var n = values.length;
  if (!n) return "";
  var w = 120, h = 36, pad = 2;
  var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
  if (max === min) { max = min + 1; }
  var pts = values.map(function (v, i) {
    var x = n === 1 ? w / 2 : (i / (n - 1)) * w;
    var y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
    return [x, y];
  });
  var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
  var area = line + " L" + w + " " + h + " L0 " + h + " Z";
  var id = "sgspark" + (++uid);
  return '<svg class="admin-spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".32"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
    '<path class="admin-spark-area" d="' + area + '" fill="url(#' + id + ')"/>' +
    '<path class="admin-spark-line" d="' + line + '" pathLength="1" fill="none" stroke="' + color + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
  "</svg>";
}

function niceStep(max) {
  if (max <= 0) return 1;
  var raw = max / 3;
  var mag = Math.pow(10, Math.floor(Math.log10(raw)));
  var norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
}

function barPath(x, yBase, w, h, up) {
  if (h <= 0) return "";
  var r = Math.min(4, w / 2, h);
  if (up) {
    var top = yBase - h;
    return "M" + x + " " + yBase + " V" + (top + r) + " Q" + x + " " + top + " " + (x + r) + " " + top +
      " H" + (x + w - r) + " Q" + (x + w) + " " + top + " " + (x + w) + " " + (top + r) + " V" + yBase + " Z";
  }
  var bottom = yBase + h;
  return "M" + x + " " + yBase + " V" + (bottom - r) + " Q" + x + " " + bottom + " " + (x + r) + " " + bottom +
    " H" + (x + w - r) + " Q" + (x + w) + " " + bottom + " " + (x + w) + " " + (bottom - r) + " V" + yBase + " Z";
}

/* series: [{d, in, out}] · labelOf(point) → texto do eixo/dica
   Monta o SVG no container e liga dica + teclado. Devolve destroy(). */
export function flowChart(container, series, labelOf, longLabelOf) {
  var width = Math.max(280, Math.floor(container.clientWidth || 600));
  var height = width < 520 ? 220 : 270;
  var m = { l: 58, r: 10, t: 14, b: 30 };
  var pw = width - m.l - m.r, ph = height - m.t - m.b;
  var maxIn = 0, maxOut = 0;
  series.forEach(function (p) { maxIn = Math.max(maxIn, p.in); maxOut = Math.max(maxOut, p.out); });
  if (!maxIn && !maxOut) {
    container.innerHTML = '<div class="fin-chart-empty">Sem movimento no período.</div>';
    return function () {};
  }
  var stepIn = niceStep(maxIn), stepOut = niceStep(maxOut);
  var topIn = maxIn ? Math.ceil(maxIn / stepIn) * stepIn : 0;
  var botOut = maxOut ? Math.ceil(maxOut / stepOut) * stepOut : 0;
  if (!topIn) topIn = botOut * 0.25;
  if (!botOut) botOut = topIn * 0.25;
  var total = topIn + botOut;
  var y0 = m.t + ph * (topIn / total);
  function yIn(v) { return y0 - (v / total) * ph; }
  function yOut(v) { return y0 + (v / total) * ph; }

  var n = series.length;
  var band = pw / n;
  var bw = Math.max(2, Math.min(26, band * 0.62));
  var grid = "", axis = "";
  for (var v = stepIn; v <= topIn + 1; v += stepIn) {
    grid += '<line x1="' + m.l + '" x2="' + (width - m.r) + '" y1="' + yIn(v).toFixed(1) + '" y2="' + yIn(v).toFixed(1) + '"/>';
    axis += '<text x="' + (m.l - 8) + '" y="' + (yIn(v) + 4).toFixed(1) + '">' + brlCompact(v) + "</text>";
  }
  for (var o = stepOut; o <= botOut + 1; o += stepOut) {
    grid += '<line x1="' + m.l + '" x2="' + (width - m.r) + '" y1="' + yOut(o).toFixed(1) + '" y2="' + yOut(o).toFixed(1) + '"/>';
    axis += '<text x="' + (m.l - 8) + '" y="' + (yOut(o) + 4).toFixed(1) + '">−' + brlCompact(o).replace("R$ ", "R$ ") + "</text>";
  }
  var bars = "", hits = "", xlab = "";
  var every = Math.max(1, Math.ceil(n / (width < 520 ? 4 : 7)));
  series.forEach(function (p, i) {
    var x = m.l + band * i + (band - bw) / 2;
    var delay = Math.min(i * 14, 520);
    if (p.in > 0) bars += '<path class="fin-bar fin-bar--in" style="animation-delay:' + delay + 'ms" d="' + barPath(x, y0 - 1, bw, Math.max(1.5, y0 - 1 - yIn(p.in)), true) + '"/>';
    if (p.out > 0) bars += '<path class="fin-bar fin-bar--out" style="animation-delay:' + delay + 'ms" d="' + barPath(x, y0 + 1, bw, Math.max(1.5, yOut(p.out) - y0 - 1), false) + '"/>';
    hits += '<rect class="fin-hit" data-i="' + i + '" x="' + (m.l + band * i) + '" y="' + m.t + '" width="' + band + '" height="' + ph + '"/>';
    if (i % every === 0 || i === n - 1 && n <= 12) {
      xlab += '<text x="' + (m.l + band * i + band / 2).toFixed(1) + '" y="' + (height - 8) + '">' + window.SG.esc(labelOf(p)) + "</text>";
    }
  });
  var sumIn = series.reduce(function (s, p) { return s + p.in; }, 0);
  var sumOut = series.reduce(function (s, p) { return s + p.out; }, 0);
  container.innerHTML =
    '<div class="fin-chart-wrap" tabindex="0" role="img" aria-label="Entradas ' + brl(sumIn) + " e saídas " + brl(sumOut) + ' no período. Use as setas para ver cada período.">' +
      '<svg class="fin-svg" viewBox="0 0 ' + width + " " + height + '" width="' + width + '" height="' + height + '" aria-hidden="true" focusable="false">' +
        '<g class="fin-grid">' + grid + "</g>" +
        '<rect class="fin-band" data-band x="0" y="' + m.t + '" width="' + band + '" height="' + ph + '" opacity="0"/>' +
        '<g class="fin-bars">' + bars + "</g>" +
        '<line class="fin-zero" x1="' + m.l + '" x2="' + (width - m.r) + '" y1="' + y0.toFixed(1) + '" y2="' + y0.toFixed(1) + '"/>' +
        '<g class="fin-axis fin-axis--y">' + axis + "</g>" +
        '<g class="fin-axis fin-axis--x">' + xlab + "</g>" +
        '<g class="fin-hits">' + hits + "</g>" +
      "</svg>" +
      '<div class="fin-tip" data-tip hidden></div>' +
    "</div>";

  var wrap = container.querySelector(".fin-chart-wrap");
  var tip = container.querySelector("[data-tip]");
  var bandEl = container.querySelector("[data-band]");
  var active = -1;
  function show(i) {
    if (i < 0 || i >= n) return;
    active = i;
    var p = series[i];
    var net = p.in - p.out;
    tip.innerHTML = "<b>" + window.SG.esc(longLabelOf(p)) + "</b>" +
      '<span><i class="fin-dot fin-dot--in"></i>Entradas<em>' + brl(p.in) + "</em></span>" +
      '<span><i class="fin-dot fin-dot--out"></i>Saídas<em>' + brl(p.out) + "</em></span>" +
      '<span class="fin-tip-net">Resultado<em>' + (net < 0 ? "−" : "") + brl(Math.abs(net)) + "</em></span>";
    tip.hidden = false;
    var cx = (m.l + band * i + band / 2) / width * wrap.clientWidth;
    var tw = tip.offsetWidth;
    tip.style.left = Math.max(4, Math.min(wrap.clientWidth - tw - 4, cx - tw / 2)) + "px";
    bandEl.setAttribute("x", String(m.l + band * i));
    bandEl.setAttribute("opacity", "1");
  }
  function hide() { tip.hidden = true; bandEl.setAttribute("opacity", "0"); }
  function onMove(e) {
    var r = e.target.closest && e.target.closest(".fin-hit");
    if (r) show(Number(r.getAttribute("data-i")));
  }
  function onKey(e) {
    if (e.key === "ArrowRight") { e.preventDefault(); show(active < 0 ? 0 : Math.min(n - 1, active + 1)); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); show(active < 0 ? n - 1 : Math.max(0, active - 1)); }
    else if (e.key === "Escape" && !tip.hidden) { e.stopPropagation(); hide(); }
  }
  wrap.addEventListener("pointermove", onMove);
  wrap.addEventListener("pointerdown", onMove);
  wrap.addEventListener("pointerleave", hide);
  wrap.addEventListener("keydown", onKey);
  wrap.addEventListener("blur", hide);
  return function destroy() {
    wrap.removeEventListener("pointermove", onMove);
    wrap.removeEventListener("pointerdown", onMove);
    wrap.removeEventListener("pointerleave", hide);
    wrap.removeEventListener("keydown", onKey);
    wrap.removeEventListener("blur", hide);
  };
}

/** barras horizontais de uma série só (categorias), valor ao lado em texto */
export function categoryBarsHtml(rows, kind, labelOf) {
  if (!rows.length) return '<p class="fin-muted">Nada no período.</p>';
  var max = Math.max.apply(null, rows.map(function (r) { return r.cents; })) || 1;
  return '<ul class="fin-cats fin-cats--' + kind + '">' + rows.map(function (r, i) {
    var pct = Math.max(2, (r.cents / max) * 100);
    return '<li style="--i:' + i + '"><span class="fin-cat-name">' + window.SG.esc(labelOf(r.category)) + "<small>" + r.count + (r.count === 1 ? " lançamento" : " lançamentos") + "</small></span>" +
      '<span class="fin-cat-bar" aria-hidden="true"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
      '<b class="fin-cat-value">' + brl(r.cents) + "</b></li>";
  }).join("") + "</ul>";
}
