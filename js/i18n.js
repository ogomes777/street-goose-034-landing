/* Street Goose 034 — i18n (PT-BR / EN / ES).
   Dicionário central único; troca instantânea via re-render de texto (não
   recarrega a página, não perde a posição de scroll). Nomes próprios, marca
   e nomes de produto NUNCA são traduzidos — só ficam de fora do dicionário. */
(function () {
  "use strict";

  var STORAGE_KEY = "sgLang";
  var SUPPORTED = ["pt-BR", "en", "es"];
  var FALLBACK = "pt-BR";

  var DICT = {
    "nav.colecao": { "pt-BR": "Coleção", en: "Collection", es: "Colección" },
    "nav.performance": { "pt-BR": "Performance", en: "Performance", es: "Rendimiento" },
    "nav.archive": { "pt-BR": "Archive", en: "Archive", es: "Archivo" },
    "nav.cultura": { "pt-BR": "Cultura", en: "Culture", es: "Cultura" },
    "nav.manifesto": { "pt-BR": "Manifesto", en: "Manifesto", es: "Manifiesto" },
    "nav.account.signedOut": { "pt-BR": "Entrar", en: "Sign in", es: "Entrar" },
    "nav.account.myAccount": { "pt-BR": "Minha conta", en: "My account", es: "Mi cuenta" },
    "nav.account.orders": { "pt-BR": "Meus pedidos", en: "My orders", es: "Mis pedidos" },
    "nav.account.favorites": { "pt-BR": "Favoritos", en: "Favorites", es: "Favoritos" },
    "nav.account.level": { "pt-BR": "Meu nível", en: "My level", es: "Mi nivel" },
    "nav.account.rewards": { "pt-BR": "Cupons e recompensas", en: "Coupons & rewards", es: "Cupones y recompensas" },
    "nav.account.settings": { "pt-BR": "Configurações", en: "Settings", es: "Configuración" },
    "nav.account.signOut": { "pt-BR": "Sair", en: "Sign out", es: "Salir" },
    "nav.account.hint.myAccount": { "pt-BR": "Dados e preferências", en: "Profile and preferences", es: "Datos y preferencias" },
    "nav.account.hint.orders": { "pt-BR": "Acompanhe suas compras", en: "Track your purchases", es: "Sigue tus compras" },
    "nav.account.hint.favorites": { "pt-BR": "Peças que você salvou", en: "Pieces you saved", es: "Piezas que guardaste" },
    "nav.account.hint.level": { "pt-BR": "XP e ranking", en: "XP and ranking", es: "XP y ranking" },
    "nav.account.hint.rewards": { "pt-BR": "Benefícios do seu nível", en: "Perks for your level", es: "Beneficios de tu nivel" },
    "nav.account.admin": { "pt-BR": "Painel da loja", en: "Store panel", es: "Panel de la tienda" },
    "nav.account.hint.admin": { "pt-BR": "Pedidos, produtos e clientes", en: "Orders, products and customers", es: "Pedidos, productos y clientes" },
    "nav.account.member": { "pt-BR": "Membro Street Goose", en: "Street Goose member", es: "Miembro Street Goose" },
    "nav.account.xpTo": { "pt-BR": "XP para", en: "XP to", es: "XP para" },
    "nav.account.maxLevel": { "pt-BR": "Nível máximo alcançado", en: "Top level reached", es: "Nivel máximo alcanzado" },
    "theme.systemShort": { "pt-BR": "Automático", en: "Auto", es: "Automático" },
    "prefs.title": { "pt-BR": "Preferências", en: "Preferences", es: "Preferencias" },
    "prefs.sub": { "pt-BR": "Tema e idioma da Street Goose", en: "Street Goose theme and language", es: "Tema e idioma de Street Goose" },
    "prefs.note": { "pt-BR": "Salvo neste dispositivo", en: "Saved on this device", es: "Guardado en este dispositivo" },
    "nav.search": { "pt-BR": "Buscar", en: "Search", es: "Buscar" },
    "nav.bag": { "pt-BR": "Sacola", en: "Bag", es: "Bolsa" },

    "auth.title.signIn": { "pt-BR": "Entrar na Street Goose", en: "Sign in to Street Goose", es: "Entrar a Street Goose" },
    "auth.title.signUp": { "pt-BR": "Criar conta", en: "Create account", es: "Crear cuenta" },
    "auth.appleContinue": { "pt-BR": "Continuar com Apple", en: "Continue with Apple", es: "Continuar con Apple" },
    "auth.googleContinue": { "pt-BR": "Continuar com Google", en: "Continue with Google", es: "Continuar con Google" },
    "auth.orEmail": { "pt-BR": "ou com e-mail", en: "or with email", es: "o con correo" },
    "auth.name": { "pt-BR": "Nome", en: "Name", es: "Nombre" },
    "auth.email": { "pt-BR": "E-mail", en: "Email", es: "Correo" },
    "auth.password": { "pt-BR": "Senha", en: "Password", es: "Contraseña" },
    "auth.confirmPassword": { "pt-BR": "Confirmar senha", en: "Confirm password", es: "Confirmar contraseña" },
    "auth.terms": { "pt-BR": "Li e aceito os termos e a política de privacidade", en: "I accept the terms and privacy policy", es: "Acepto los términos y la política de privacidad" },
    "auth.submitSignIn": { "pt-BR": "Entrar", en: "Sign in", es: "Entrar" },
    "auth.submitSignUp": { "pt-BR": "Criar conta", en: "Create account", es: "Crear cuenta" },
    "auth.switchToSignUp": { "pt-BR": "Ainda não tem conta? Criar agora", en: "No account yet? Create one", es: "¿Aún no tienes cuenta? Crear ahora" },
    "auth.switchToSignIn": { "pt-BR": "Já tem conta? Entrar", en: "Already have an account? Sign in", es: "¿Ya tienes cuenta? Entrar" },
    "auth.forgotPassword": { "pt-BR": "Esqueci minha senha", en: "Forgot password", es: "Olvidé mi contraseña" },
    "auth.notConfigured": { "pt-BR": "Login ainda não configurado neste ambiente — falta credencial do provedor.", en: "Sign-in not configured in this environment yet — provider credential missing.", es: "Inicio de sesión aún no configurado — falta credencial del proveedor." },

    "theme.label": { "pt-BR": "Tema", en: "Theme", es: "Tema" },
    "theme.dark": { "pt-BR": "Escuro", en: "Dark", es: "Oscuro" },
    "theme.light": { "pt-BR": "Claro", en: "Light", es: "Claro" },
    "theme.system": { "pt-BR": "Usar preferência do dispositivo", en: "Use device preference", es: "Usar preferencia del dispositivo" },
    "lang.label": { "pt-BR": "Idioma", en: "Language", es: "Idioma" },

    "search.placeholder": { "pt-BR": "Buscar produto, categoria...", en: "Search product, category...", es: "Buscar producto, categoría..." },
    "search.empty": { "pt-BR": "Nada encontrado por aqui.", en: "Nothing found here.", es: "No se encontró nada." },
    "search.recent": { "pt-BR": "Buscas recentes", en: "Recent searches", es: "Búsquedas recientes" },
    "search.clear": { "pt-BR": "Limpar", en: "Clear", es: "Limpiar" },

    "favorites.title": { "pt-BR": "Favoritos", en: "Favorites", es: "Favoritos" },
    "favorites.empty.title": { "pt-BR": "Nenhum favorito ainda.", en: "No favorites yet.", es: "Sin favoritos aún." },
    "favorites.empty.body": { "pt-BR": "Toque no coração de uma peça pra guardar aqui.", en: "Tap the heart on a piece to save it here.", es: "Toca el corazón de una pieza para guardarla aquí." },
    "favorites.moveToCart": { "pt-BR": "Mover para a sacola", en: "Move to bag", es: "Mover a la bolsa" },
    "favorites.remove": { "pt-BR": "Remover", en: "Remove", es: "Eliminar" },

    "cart.title": { "pt-BR": "Sacola", en: "Bag", es: "Bolsa" },
    "cart.empty.title": { "pt-BR": "Sua sacola está vazia.", en: "Your bag is empty.", es: "Tu bolsa está vacía." },
    "cart.subtotal": { "pt-BR": "Subtotal", en: "Subtotal", es: "Subtotal" },
    "cart.checkout": { "pt-BR": "Finalizar compra", en: "Checkout", es: "Finalizar compra" },
    "cart.continueShopping": { "pt-BR": "Continuar comprando", en: "Continue shopping", es: "Seguir comprando" },

    "checkout.step.identification": { "pt-BR": "Identificação", en: "Identification", es: "Identificación" },
    "checkout.step.address": { "pt-BR": "Endereço", en: "Address", es: "Dirección" },
    "checkout.step.payment": { "pt-BR": "Pagamento", en: "Payment", es: "Pago" },
    "checkout.step.review": { "pt-BR": "Revisão", en: "Review", es: "Revisión" },
    "checkout.step.confirmation": { "pt-BR": "Confirmação", en: "Confirmation", es: "Confirmación" },
    "checkout.next": { "pt-BR": "Continuar", en: "Continue", es: "Continuar" },
    "checkout.back": { "pt-BR": "Voltar", en: "Back", es: "Atrás" },
    "checkout.payment.whatsapp": { "pt-BR": "WhatsApp (atendimento direto)", en: "WhatsApp (direct handoff)", es: "WhatsApp (atención directa)" },
    "checkout.payment.pix": { "pt-BR": "Pix", en: "Pix", es: "Pix" },
    "checkout.payment.card": { "pt-BR": "Cartão de crédito", en: "Credit card", es: "Tarjeta de crédito" },
    "checkout.payment.debit": { "pt-BR": "Cartão de débito", en: "Debit card", es: "Tarjeta de débito" },
    "checkout.payment.boleto": { "pt-BR": "Boleto", en: "Boleto", es: "Boleto" },
    "checkout.payment.applePay": { "pt-BR": "Apple Pay", en: "Apple Pay", es: "Apple Pay" },
    "checkout.payment.googlePay": { "pt-BR": "Google Pay", en: "Google Pay", es: "Google Pay" },
    "checkout.payment.unavailable": { "pt-BR": "indisponível — aguardando configuração", en: "unavailable — pending configuration", es: "no disponible — pendiente de configuración" },
    "checkout.payment.available": { "pt-BR": "disponível", en: "available", es: "disponible" },

    "paymentTerminal.kicker": { "pt-BR": "SG PAYMENT TERMINAL", en: "SG PAYMENT TERMINAL", es: "SG PAYMENT TERMINAL" },
    "paymentTerminal.title": { "pt-BR": "Paga do seu jeito.", en: "Pay your way.", es: "Paga a tu manera." },
    "paymentTerminal.subtitle": { "pt-BR": "Métodos reais, sem letra miúda. O que ainda não está ligado aparece como está — nunca como se já funcionasse.", en: "Real methods, no fine print. Anything not wired up yet shows as-is — never as if it already worked.", es: "Métodos reales, sin letra chica. Lo que aún no está conectado aparece como está — nunca como si ya funcionara." },
    "paymentTerminal.soon": { "pt-BR": "Em breve direto no site: Pix, cartão, boleto, Apple Pay e Google Pay. Por enquanto, o pagamento é combinado com a gente pelo WhatsApp.", en: "Coming soon right here: Pix, cards, boleto, Apple Pay and Google Pay. For now, payment is arranged with us on WhatsApp.", es: "Muy pronto aquí mismo: Pix, tarjeta, boleto, Apple Pay y Google Pay. Por ahora, el pago se coordina con nosotros por WhatsApp." },
    "paymentTerminal.whatsappTitle": { "pt-BR": "Prefere combinar direto?", en: "Prefer to sort it out directly?", es: "¿Prefieres resolverlo directo?" },
    "paymentTerminal.whatsappCopy": { "pt-BR": "WhatsApp é atendimento humano, não um meio de pagamento — a gente confirma disponibilidade e fecha o pedido com você por lá.", en: "WhatsApp is human support, not a payment method — we confirm availability and close the order with you there.", es: "WhatsApp es atención humana, no un medio de pago — confirmamos disponibilidad y cerramos el pedido contigo por ahí." },
    "paymentTerminal.whatsappCta": { "pt-BR": "Falar no WhatsApp →", en: "Chat on WhatsApp →", es: "Hablar por WhatsApp →" },
    "paymentTerminal.whatsappMessage": { "pt-BR": "Oi! Quero entender as formas de pagamento da Street Goose 034.", en: "Hi! I'd like to understand Street Goose 034's payment options.", es: "¡Hola! Quiero entender las formas de pago de Street Goose 034." },

    "account.title": { "pt-BR": "Minha conta", en: "My account", es: "Mi cuenta" },
    "account.orders.empty": { "pt-BR": "Nenhum pedido ainda.", en: "No orders yet.", es: "Aún no hay pedidos." },
    "account.level": { "pt-BR": "Nível", en: "Level", es: "Nivel" },
    "account.xpToNext": { "pt-BR": "XP para o próximo nível", en: "XP to next level", es: "XP para el próximo nivel" },

    "ranking.title": { "pt-BR": "Ranking Street Goose", en: "Street Goose Ranking", es: "Ranking Street Goose" },
    "ranking.empty": { "pt-BR": "O ranking ainda não tem participantes.", en: "The ranking has no participants yet.", es: "El ranking aún no tiene participantes." },
    "ranking.yourPosition": { "pt-BR": "Sua posição", en: "Your position", es: "Tu posición" },

    "rewards.title": { "pt-BR": "Recompensas", en: "Rewards", es: "Recompensas" },
    "rewards.locked": { "pt-BR": "Bloqueada", en: "Locked", es: "Bloqueada" },
    "rewards.redeem": { "pt-BR": "Resgatar", en: "Redeem", es: "Canjear" },
    "rewards.copyCoupon": { "pt-BR": "Copiar cupom", en: "Copy coupon", es: "Copiar cupón" },

    "community.title": { "pt-BR": "Comunidade Street Goose", en: "Street Goose Community", es: "Comunidad Street Goose" },
    "community.publish": { "pt-BR": "Publicar meu visual", en: "Post my look", es: "Publicar mi look" },
    "community.pending": { "pt-BR": "Em moderação", en: "In moderation", es: "En moderación" },
    "community.empty": { "pt-BR": "Ainda não há publicações por aqui.", en: "No posts here yet.", es: "Aún no hay publicaciones aquí." },

    "common.close": { "pt-BR": "Fechar", en: "Close", es: "Cerrar" },
    "common.loading": { "pt-BR": "Carregando…", en: "Loading…", es: "Cargando…" },
    "common.error": { "pt-BR": "Algo deu errado. Tente de novo.", en: "Something went wrong. Try again.", es: "Algo salió mal. Inténtalo de nuevo." },
    "common.consultAvailability": { "pt-BR": "Consultar disponibilidade", en: "Check availability", es: "Consultar disponibilidad" }
  };

  function normalize(lang) { return SUPPORTED.indexOf(lang) !== -1 ? lang : FALLBACK; }

  function detectDefault() {
    var nav = (navigator.language || FALLBACK).toLowerCase();
    if (nav.indexOf("pt") === 0) return "pt-BR";
    if (nav.indexOf("es") === 0) return "es";
    if (nav.indexOf("en") === 0) return "en";
    return FALLBACK;
  }

  function current() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    return saved ? normalize(saved) : detectDefault();
  }

  function t(key) {
    var entry = DICT[key];
    if (!entry) return key;
    var lang = current();
    return entry[lang] || entry[FALLBACK] || key;
  }

  function applyToDom() {
    var lang = current();
    document.documentElement.setAttribute("lang", lang);
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
    });
  }

  function set(lang) {
    var normalized = normalize(lang);
    try { localStorage.setItem(STORAGE_KEY, normalized); } catch (e) {}
    applyToDom();
    document.dispatchEvent(new CustomEvent("sg:lang-change", { detail: { lang: normalized } }));
  }

  applyToDom();

  window.SG.i18n = { t: t, get: current, set: set, supported: SUPPORTED.slice() };
})();

export {};
