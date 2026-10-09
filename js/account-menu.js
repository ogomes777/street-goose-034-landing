/* Street Goose 034 — painel de conta.
   Um único componente (window.SG.accountPanel) usado em dois lugares com a
   mesma marcação e estética: o dropdown do header no desktop e o menu
   lateral no mobile (js/mobile-account.js). Cabeçalho com identidade +
   cartão de nível (XP real do backend), itens com ícone/descrição e selo
   de admin quando is_admin(). Só um menu do topo abre por vez: avisa via
   "sg:menu-open" e fecha quando outro abre. */
(function () {
  "use strict";

  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }
  function esc(v) { return window.SG.esc ? window.SG.esc(v) : String(v == null ? "" : v); }

  var ICONS = {
    account: '<path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM4 21c1.5-4.2 5-6 8-6s6.5 1.8 8 6"/>',
    orders: '<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    favorites: '<path d="M12 20.5s-7.5-4.6-10-9.4C.4 7.6 2 4 5.6 4 8 4 10 5.4 12 8c2-2.6 4-4 6.4-4C22 4 23.6 7.6 22 11.1 19.5 15.9 12 20.5 12 20.5z"/>',
    level: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    rewards: '<path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7"/><path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z"/>',
    admin: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    signout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || "acct-ico") + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + "</svg>";
  }

  var ITEMS = [
    { href: "/conta", icon: "account", label: "nav.account.myAccount", hint: "nav.account.hint.myAccount" },
    { href: "/conta/pedidos", icon: "orders", label: "nav.account.orders", hint: "nav.account.hint.orders" },
    { href: "/favoritos", icon: "favorites", label: "nav.account.favorites", hint: "nav.account.hint.favorites", count: "favorites" },
    { href: "/ranking", icon: "level", label: "nav.account.level", hint: "nav.account.hint.level" },
    { href: "/recompensas", icon: "rewards", label: "nav.account.rewards", hint: "nav.account.hint.rewards" }
  ];

  function itemHtml(item, i, extraClass, badge) {
    var count = item.count === "favorites" && window.SG.wishlist ? window.SG.wishlist.count() : 0;
    return (
      '<a class="acct-item' + (extraClass || "") + '" role="menuitem" href="' + item.href + '" style="--i:' + i + '"' + (item.attr || "") + ">" +
        '<span class="acct-ico-tile">' + icon(item.icon) + "</span>" +
        '<span class="acct-item-text"><span class="acct-item-label">' + esc(t(item.label)) + (badge || "") + "</span>" +
        '<span class="acct-item-hint">' + esc(t(item.hint)) + "</span></span>" +
        (count ? '<span class="acct-count">' + count + "</span>" : "") +
        icon("chevron", "acct-chevron") +
      "</a>"
    );
  }

  function identity(session) {
    var user = session && session.user;
    var meta = (user && user.user_metadata) || {};
    var name = meta.name || meta.full_name || (user && user.email) || t("nav.account.member");
    var avatar = typeof meta.avatar_url === "string" && /^https:\/\//.test(meta.avatar_url) ? meta.avatar_url : null;
    return { name: name, email: (user && user.email) || "", initial: name.charAt(0).toUpperCase(), avatar: avatar };
  }

  function panelHtml(session) {
    var id = identity(session);
    return (
      '<div class="acct-head">' +
        '<span class="acct-avatar">' + (id.avatar ? '<img src="' + esc(id.avatar) + '" alt="" referrerpolicy="no-referrer">' : esc(id.initial)) + "</span>" +
        '<span class="acct-id"><span class="acct-name">' + esc(id.name) + "</span>" +
        (id.email && id.email !== id.name ? '<span class="acct-email">' + esc(id.email) + "</span>" : '<span class="acct-email">' + esc(t("nav.account.member")) + "</span>") +
        "</span>" +
      "</div>" +
      '<a class="acct-level is-loading" href="/ranking" data-acct-level role="menuitem">' +
        '<span class="acct-level-row"><span class="acct-level-name">' + esc(t("common.loading")) + '</span><span class="acct-level-xp"></span></span>' +
        '<span class="acct-xp-track"><span class="acct-xp-fill"></span></span>' +
        '<span class="acct-level-note"></span>' +
      "</a>" +
      '<div class="acct-list" data-acct-list>' + ITEMS.map(function (it, i) { return itemHtml(it, i); }).join("") + "</div>" +
      '<div class="acct-foot">' +
        '<button class="acct-signout" type="button" role="menuitem" data-account-signout>' + icon("signout") + "<span>" + esc(t("nav.account.signOut")) + "</span></button>" +
        '<span class="acct-mark">STREET GOOSE <b>034</b></span>' +
      "</div>"
    );
  }

  // nível/XP reais (RewardsService lê xp_totals + levels); sem dado, o cartão some
  function hydrateLevel(root, alive) {
    var card = root.querySelector("[data-acct-level]");
    if (!card) return;
    import("../src/services/RewardsService.ts")
      .then(function (m) { return m.RewardsService.getMyXpStatus(); })
      .catch(function () { return null; })
      .then(function (xp) {
        if (!alive() || !card.isConnected) return;
        if (!xp) { card.remove(); return; }
        card.classList.remove("is-loading");
        card.querySelector(".acct-level-name").textContent = t("account.level") + " " + xp.level.levelNumber + " · " + xp.level.name;
        card.querySelector(".acct-level-xp").textContent = xp.totalXp + " XP";
        card.querySelector(".acct-level-note").textContent = xp.nextLevel
          ? xp.xpToNext + " " + t("nav.account.xpTo") + " " + xp.nextLevel.name
          : t("nav.account.maxLevel");
        requestAnimationFrame(function () {
          card.querySelector(".acct-xp-fill").style.width = Math.max(4, Math.min(100, xp.progressPct)) + "%";
        });
      });
  }

  // "Painel da loja" só aparece para quem o banco diz que é admin (is_admin(),
  // migration 0100). Esconder o link é conveniência — quem protege é o RLS.
  function hydrateAdmin(root, alive) {
    import("../src/services/AdminService.ts")
      .then(function (m) { return m.AdminService.isAdmin(); })
      .catch(function () { return false; })
      .then(function (isAdmin) {
        var list = root.querySelector("[data-acct-list]");
        if (!isAdmin || !alive() || !list || root.querySelector("[data-account-admin]")) return;
        list.insertAdjacentHTML("beforeend", itemHtml(
          { href: "/admin", icon: "admin", label: "nav.account.admin", hint: "nav.account.hint.admin", attr: " data-account-admin" },
          ITEMS.length, " acct-item--admin", '<span class="acct-badge">ADMIN</span>'
        ));
      });
  }

  async function signOut() {
    var mod = await import("../src/services/AuthService.ts");
    await mod.AuthService.signOut();
    if (window.SG.toast) window.SG.toast("SESSÃO ENCERRADA");
  }

  // API compartilhada: preenche `root` com o painel completo da sessão.
  // `alive()` diz se o container ainda está visível (evita escrever em
  // painel já fechado quando o XP/admin chega depois).
  window.SG.accountPanel = {
    fill: function (root, session, alive) {
      alive = alive || function () { return true; };
      root.innerHTML = panelHtml(session);
      hydrateLevel(root, alive);
      hydrateAdmin(root, alive);
    },
    signOut: signOut
  };

  /* ---------------- dropdown do header (desktop) ---------------- */
  var wrap = document.querySelector("[data-account-menu-wrap]");
  var btn = document.querySelector("[data-open-account]");
  var dropdown = document.querySelector("[data-account-dropdown]");
  if (!wrap || !btn || !dropdown) return;

  var session = null;
  var open = false;
  function isOpen() { return open; }
  function paint() { window.SG.accountPanel.fill(dropdown, session, isOpen); }

  function focusables() {
    return Array.prototype.slice.call(dropdown.querySelectorAll('[role="menuitem"]'));
  }

  function setOpen(v) {
    if (v === open) return;
    open = v;
    dropdown.hidden = !v;
    btn.setAttribute("aria-expanded", String(v));
    if (v) {
      document.dispatchEvent(new CustomEvent("sg:menu-open", { detail: "account" }));
      paint();
      (window.SG.auth ? window.SG.auth.getSession() : Promise.resolve(null)).then(function (s) {
        if (!open || !s) return;
        var before = session && session.user && session.user.id;
        session = s;
        if (before !== s.user.id) paint();
      });
    }
  }

  btn.addEventListener("click", function (e) {
    if (!btn.hasAttribute("data-signed-in")) return; // deslogado: auth-modal.js já tratou o clique
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  });

  dropdown.addEventListener("click", async function (e) {
    if (e.target.closest("[data-account-signout]")) {
      await signOut();
      session = null;
      setOpen(false);
      return;
    }
    if (e.target.closest("a[href]")) setOpen(false);
  });

  // setas navegam pelos itens (padrão de menu acessível)
  dropdown.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    var items = focusables();
    if (!items.length) return;
    e.preventDefault();
    var idx = items.indexOf(document.activeElement);
    if (e.key === "Home") idx = 0;
    else if (e.key === "End") idx = items.length - 1;
    else idx = (idx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[idx].focus();
  });
  btn.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" && btn.hasAttribute("data-signed-in")) {
      e.preventDefault();
      setOpen(true);
      var first = focusables()[0];
      if (first) first.focus();
    }
  });

  document.addEventListener("sg:menu-open", function (e) {
    if (open && e.detail !== "account") setOpen(false);
  });
  document.addEventListener("click", function (e) {
    if (open && !wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (open && e.key === "Escape") { setOpen(false); btn.focus(); }
  });
  document.addEventListener("sg:lang-change", function () { if (open) paint(); });
})();

export {};
