/* Street Goose 034 — /ranking. Só quem ativou "aparecer no ranking" em
   Minha conta (opt-in); nada inventado. Logado: mostra sua posição ou o
   atalho para entrar no ranking. */
export function mountRankingPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }
  var esc = window.SG.esc;

  root.innerHTML =
    '<div class="ranking-galaxy" data-ranking-galaxy aria-hidden="true"><canvas data-ranking-galaxy-canvas></canvas><span class="ranking-galaxy-orbit ranking-galaxy-orbit--one"></span><span class="ranking-galaxy-orbit ranking-galaxy-orbit--two"></span><span class="ranking-galaxy-star ranking-galaxy-star--one"></span><span class="ranking-galaxy-star ranking-galaxy-star--two"></span><span class="ranking-galaxy-star ranking-galaxy-star--three"></span></div>' +
    '<div class="app-page-head ranking-page-head"><div><p class="ranking-kicker">STREET GOOSE / CONSTELAÇÃO 034</p><h1>' + t("ranking.title") + '</h1></div>' +
    '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    '<div class="app-page-body ranking-page-body" data-ranking-body><div class="app-page-loading">' + t("common.loading") + "</div></div>";

  var bodyEl = root.querySelector("[data-ranking-body]");
  var destroyed = false;
  var stopGalaxy = null;
  if (!window.SG.prefersReducedMotion()) {
    import("three").then(function (THREE) {
      if (destroyed) return;
      var canvas = root.querySelector("[data-ranking-galaxy-canvas]");
      if (!canvas) return;
      var renderer;
      try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); }
      catch (_error) { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 0, 15);
      var group = new THREE.Group();
      scene.add(group);
      var count = 1500;
      var positions = new Float32Array(count * 3);
      var colors = new Float32Array(count * 3);
      var palette = [new THREE.Color("#fff1db"), new THREE.Color("#c7a4ff"), new THREE.Color("#ff9b63")];
      for (var i = 0; i < count; i++) {
        var radius = 5 + Math.random() * 19;
        var theta = Math.random() * Math.PI * 2;
        var phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
        var color = palette[Math.floor(Math.random() * palette.length)];
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
      }
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      var stars = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.88 }));
      scene.add(stars);
      var planet = new THREE.Mesh(new THREE.SphereGeometry(2.1, 48, 40), new THREE.MeshBasicMaterial({ color: 0x7d5bc1, wireframe: true, transparent: true, opacity: 0.2 }));
      planet.position.set(4.5, 0.8, -1.5);
      group.add(planet);
      var halo = new THREE.Mesh(new THREE.SphereGeometry(2.35, 32, 24), new THREE.MeshBasicMaterial({ color: 0xff8953, wireframe: true, transparent: true, opacity: 0.08 }));
      halo.position.copy(planet.position);
      group.add(halo);
      var frame = 0;
      function resize() {
        var rect = root.getBoundingClientRect();
        var width = Math.max(1, rect.width), height = Math.max(1, rect.height);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      var observer = new ResizeObserver(resize);
      observer.observe(root);
      resize();
      function animate() {
        if (destroyed) return;
        if (!document.hidden) {
          group.rotation.y += 0.0009;
          group.rotation.z = Math.sin(performance.now() * 0.00012) * 0.035;
          stars.rotation.y -= 0.00012;
          renderer.render(scene, camera);
        }
        frame = requestAnimationFrame(animate);
      }
      animate();
      stopGalaxy = function () {
        cancelAnimationFrame(frame); observer.disconnect(); geometry.dispose();
        stars.material.dispose(); planet.geometry.dispose(); planet.material.dispose();
        halo.geometry.dispose(); halo.material.dispose(); renderer.dispose();
      };
    }).catch(function () {});
  }

  function meHtml(me) {
    if (!me) return '<div class="ranking-me"><p>Entre na sua conta para ver sua posição.</p><button class="btn btn-ghost" type="button" data-ranking-login>Entrar</button></div>';
    if (!me.optedIn) {
      return '<div class="ranking-me"><p>Você tem <b>' + me.totalXp + " XP</b> (nível " + me.level + "), mas ainda não aparece no ranking.</p>" +
        '<a class="btn btn-primary" href="/conta">Entrar no ranking</a></div>';
    }
    return '<div class="ranking-me is-in"><p>' + t("ranking.yourPosition") + ": <b>Nº " + me.position + "</b> de " + me.participants +
      " · " + me.totalXp + " XP · nível " + me.level + (me.handle ? " · @" + esc(me.handle) : "") + "</p></div>";
  }

  function shopCtaHtml() {
    return '<aside class="ranking-shop-cta"><div><p class="ranking-kicker">SUA PRÓXIMA CONQUISTA COMEÇA AQUI</p><h3>Seu estilo também<br>pode virar XP.</h3><p>Ganhe 1 XP por real em pedidos pagos. Escolha sua próxima peça e suba no ranking.</p></div><a class="ranking-shop-button" href="/categoria/lupas">Explorar coleção <span aria-hidden="true">↗</span></a></aside>';
  }

  async function render() {
    var mod = await import("../src/services/RewardsService.ts");
    var svc = mod.RewardsService;
    if (!svc.isConfigured()) {
      bodyEl.innerHTML = '<div class="ranking-empty"><span class="ranking-empty-orb" aria-hidden="true">✦</span><p class="ranking-kicker">A PRÓXIMA ESTRELA PODE SER VOCÊ</p><h2>' + t("ranking.empty") + '</h2><p>O universo 034 está esperando pelas primeiras conquistas.</p></div>' + shopCtaHtml();
      return;
    }
    var session = window.SG.auth ? await window.SG.auth.getSession() : null;
    var results = await Promise.all([svc.getRanking(20), session ? svc.getMyRanking() : Promise.resolve(null)]);
    if (destroyed) return;
    var rows = results[0];
    var me = results[1];
    var rules = '<p class="ranking-rules">XP vem de pedido pago (1 XP por R$1, mínimo 50) e de foto aprovada na comunidade (+30). Reembolso devolve o XP.</p>';
    if (!rows.length) {
      bodyEl.innerHTML = '<div class="ranking-empty"><span class="ranking-empty-orb" aria-hidden="true">✦</span><p class="ranking-kicker">A PRÓXIMA ESTRELA PODE SER VOCÊ</p><h2>' + t("ranking.empty") + '</h2><p>Seja o primeiro: ative o ranking em Minha conta.</p></div>' + meHtml(me) + shopCtaHtml() + rules;
      return;
    }
    bodyEl.innerHTML = '<div class="ranking-lead"><p class="ranking-kicker">OS NOMES QUE ESTÃO DEIXANDO SUA MARCA</p><h2>Estrelas em<br><em>ascensão.</em></h2><p>Cada conquista deixa um rastro. Estas são as pessoas no topo do universo 034.</p></div>' + meHtml(me) + '<ol class="ranking-list">' + rows.map(function (r, i) {
      return '<li class="ranking-row ranking-row--' + (i + 1) + '"><span class="ranking-pos"><small>POS.</small>' + String(i + 1).padStart(2, "0") + '</span><span class="ranking-handle">' + esc(r.handle) + '</span><span class="ranking-level">nível ' + r.level + '</span><span class="ranking-xp">' + r.totalXp + " <small>XP</small></span></li>";
    }).join("") + '</ol>' + shopCtaHtml() + rules;
  }

  bodyEl.addEventListener("click", function (e) {
    if (e.target.closest("[data-ranking-login]") && window.SG.auth) window.SG.auth.open();
  });
  var unsubscribe = null;
  import("../src/services/AuthService.ts").then(function (m) {
    if (destroyed) return;
    var first = true;
    unsubscribe = m.AuthService.onAuthStateChange(function () {
      if (first) { first = false; return; }
      setTimeout(function () { if (!destroyed) render(); }, 0);
    });
  });

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeydown);
  render();
  return function destroy() {
    destroyed = true;
    if (stopGalaxy) stopGalaxy();
    if (unsubscribe) unsubscribe();
    document.removeEventListener("keydown", onKeydown);
  };
}
