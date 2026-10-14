/* Street Goose 034 — modal manager único
   Uma fonte de verdade para abrir/fechar popup e quick view.
   Nunca reseta scroll, nunca reabre sozinho depois de fechado. */
(function () {
  "use strict";
  window.SG = window.SG || {};

  var popupEl = document.querySelector("[data-popup]");
  var qvEl = document.querySelector("[data-quickview]");
  var cartEl = document.querySelector("[data-cart]");
  var favoritesEl = document.querySelector("[data-favorites]");
  var checkoutEl = document.querySelector("[data-checkout]");
  var reviewEl = document.querySelector("[data-review-modal]");
  var zoomEl = document.querySelector("[data-zoom]");
  var scrollY = 0;
  var openEl = null;
  var lastFocused = null;
  // zoom é um overlay empilhado sobre o quick view (não substitui o modal
  // aberto) — fica de fora do openEl/lockScroll para não fechar o quick view
  // por baixo dele.
  var zoomOpen = false;
  var film = popupEl && popupEl.querySelector('[data-drop-film]');
  var timeline;
  var ambient;
  var rig;
  var motion = {crouch:0,arm:0,lean:0,flight:0,productOpacity:0,impact:0};
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var connection = navigator.connection;
  var lite = !!(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType))) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  function stopAmbient() {
    if(ambient){ambient.kill();ambient=null;}
    if(film) film._dropAmbient=null;
  }
  function startAmbient(floatDelay,headlineDelay) {
    stopAmbient();
    if(reducedMotion.matches||!window.gsap)return;
    var gsap=window.gsap,q=function(s){return film.querySelector(s);};
    ambient=gsap.timeline();film._dropAmbient=ambient;
    // Independent cycles retain their phase through the cinematic handoff.
    ambient.to(q('.sg-drop-portal > span'),{rotation:'+=360',duration:lite?12:8,ease:'none',repeat:-1},0)
      .to(q('.sg-drop-portal > i'),{rotation:'-=360',duration:13,ease:'none',repeat:-1},0)
      .to(q('.sg-drop-portal > b'),{rotation:'+=360',duration:28,ease:'none',repeat:-1},0)
      .to(q('.sg-drop-starfield'),{rotation:'-=360',duration:45,ease:'none',repeat:-1},0)
      .to(q('.sg-drop-product'),{y:lite?-5:-8,x:2,rotation:-1.4,rotationY:4,duration:2.8,ease:'sine.inOut',repeat:-1,yoyo:true},floatDelay)
      .to(q('.sg-drop-product-orbit i'),{rotation:360,duration:6,ease:'none',repeat:-1},0)
      .to(q('.sg-drop-product-aura'),{opacity:.4,scale:1.12,duration:3.2,ease:'sine.inOut',repeat:-1,yoyo:true},floatDelay)
      .to(q('.sg-drop-copy-atmosphere span'),{xPercent:35,yPercent:30,opacity:1,duration:7,ease:'sine.inOut',repeat:-1,yoyo:true},0);
    var lens=gsap.timeline({repeat:-1,repeatDelay:3.6});
    lens.fromTo(q('.sg-drop-optical i'),{xPercent:0,opacity:0},{xPercent:600,opacity:.55,duration:2,ease:'sine.inOut'})
      .to(q('.sg-drop-optical i'),{opacity:0,duration:.35},1.65);
    ambient.add(lens,floatDelay);
    var word=q('em.sg-drop-word'),shine=gsap.timeline({repeat:-1,repeatDelay:4});
    shine.set(word,{'--light':.8,'--shine':'145%'})
      .to(word,{'--shine':'-45%',duration:1.7,ease:'sine.inOut'})
      .to(word,{color:'#f0cf9f',duration:1.7},.3)
      .to(word,{color:'#c6ceda',duration:1.7},2)
      .to(word,{color:'#ff9b42','--light':0,duration:2},3.7);
    ambient.add(shine,headlineDelay);
    film.querySelectorAll('.sg-drop-particles i,.sg-drop-copy-atmosphere i').forEach(function(spark,index){
      var drift=gsap.timeline({repeat:-1,repeatDelay:.6+index%3*.4});
      drift.fromTo(spark,{opacity:0,y:22,x:0,scale:.35},{opacity:.8,y:-12,x:5,scale:1,duration:1.4,ease:'sine.out'})
        .to(spark,{opacity:0,y:-65-index%4*10,x:index%2?14:-12,scale:.4,duration:2.6,ease:'sine.in'});
      ambient.add(drift,index*.19);
    });
    if(document.hidden)ambient.pause();
  }
  function settleFilm(allowAmbient) {
    if(!film)return;
    if(timeline){timeline.kill();timeline=null;}
    stopAmbient();film.classList.remove('is-playing');film.classList.add('is-settled');
    film.querySelectorAll('.sg-drop-goose,.sg-drop-body,.sg-drop-arm,.sg-drop-lupa,.sg-drop-product,.sg-drop-product-aura,.sg-drop-product-orbit i,.sg-drop-portal,.sg-drop-portal > span,.sg-drop-portal > i,.sg-drop-portal > b,.sg-drop-starfield,.sg-drop-haze,.sg-drop-floor,.sg-drop-trail,.sg-drop-particles i,.sg-drop-energy,.sg-drop-optical i,.sg-drop-word,.sg-drop-copy-atmosphere span,.sg-drop-copy-atmosphere i,.sg-drop-description,.sg-drop-prices,.sg-drop-terms,.sg-drop-cta').forEach(function(el){
      ['transform','opacity','will-change','color','--shine','--light'].forEach(function(p){el.style.removeProperty(p);});
      if(el._gsap)el._gsap.uncache=1;
    });
    film._dropTimeline=null;film.dataset.phase=allowAmbient?'floating':'idle';
    motion={crouch:0,arm:0,lean:0,flight:1,productOpacity:1,impact:0};
    if(rig)rig.render(motion);
    if(allowAmbient===true)startAmbient(0,2);
  }
  function startFilm() {
    if(!film)return;
    settleFilm(false);film.classList.toggle('is-lite',!!lite);
    if(reducedMotion.matches||!window.gsap)return;
    film.classList.remove('is-settled');film.classList.add('is-playing');
    var gsap=window.gsap,q=function(s){return film.querySelector(s);};
    var goose=q('.sg-drop-goose'),arm=q('.sg-drop-arm'),lupa=q('.sg-drop-lupa');
    var portal=q('.sg-drop-portal'),scene=q('.sg-drop-scene'),word=film.querySelectorAll('.sg-drop-word'),h=scene.clientHeight;
    motion={crouch:.2,arm:0,lean:-.08,flight:0,productOpacity:0,impact:0,jumpY:-h*.20,jumpScale:.24,turn:-12,visible:0};
    var launch=null,lastPose='',launchScale=.14;
    var geometry={left:goose.offsetLeft,top:goose.offsetTop,width:goose.offsetWidth,height:goose.offsetHeight,cx:lupa.offsetLeft+lupa.offsetWidth/2,cy:lupa.offsetTop+lupa.offsetHeight/2};
    function handPosition(){
      var p=rig?rig.hand(motion):{x:.16,y:.44+.125*motion.crouch};
      var dx=(p.x-.5)*geometry.width*motion.jumpScale,dy=(p.y-.9)*geometry.height*motion.jumpScale,a=motion.turn*Math.PI/180;
      return{x:geometry.left+geometry.width*.5+dx*Math.cos(a)-dy*Math.sin(a)-geometry.cx,
        y:geometry.top+geometry.height*.9+dx*Math.sin(a)+dy*Math.cos(a)+motion.jumpY-geometry.cy};
    }
    function renderMotion(){
      var pose=[motion.crouch.toFixed(4),motion.arm.toFixed(4),motion.lean.toFixed(4),rig&&rig.ready()].join(',');
      // The mesh redraws only when joints change; whole-body movement is composited.
      if(pose!==lastPose){
        if(rig&&rig.ready()){rig.render(motion);arm.style.removeProperty('transform');}
        else{gsap.set(arm,{rotation:motion.arm*180/Math.PI,y:geometry.height*.125*motion.crouch});gsap.set(q('.sg-drop-body'),{y:geometry.height*.10*motion.crouch,scaleY:1-.10*motion.crouch,transformOrigin:'50% 100%'});}
        lastPose=pose;
      }
      goose.style.transform='translate3d(0,'+motion.jumpY.toFixed(3)+'px,0) rotate('+motion.turn.toFixed(3)+'deg) scale('+motion.jumpScale.toFixed(4)+')';
      goose.style.opacity=motion.visible.toFixed(3);
      var point=handPosition(),t=motion.flight,x=point.x,y=point.y;
      if(t>0){
        if(!launch){launch=point;launchScale=.14*motion.jumpScale;}
        var u=1-t;
        x=u*u*u*launch.x+3*u*u*t*(launch.x-geometry.width*.13)+3*u*t*t*geometry.width*.1;
        y=u*u*u*launch.y+3*u*u*t*(launch.y-h*.1)+3*u*t*t*(-h*.14);
      }
      var scale=(t>0?launchScale+(1-launchScale)*t:.14*motion.jumpScale)+motion.impact*.035;
      var rotation=-32*(1-t)+Math.sin(t*Math.PI)*30;
      lupa.style.transform='translate3d('+x.toFixed(3)+'px,'+y.toFixed(3)+'px,0) rotate('+rotation.toFixed(3)+'deg) rotateY('+(-24*(1-t)).toFixed(3)+'deg) scale('+scale.toFixed(4)+')';
      lupa.style.opacity=motion.productOpacity.toFixed(3);
      film.dataset.crouch=motion.crouch.toFixed(3);film.dataset.throw=motion.flight.toFixed(3);film.dataset.jump=motion.jumpY.toFixed(3);
    }
    gsap.set([goose,lupa,portal],{willChange:'transform,opacity'});startAmbient(3.8,6);
    timeline=gsap.timeline({onUpdate:renderMotion,onComplete:function(){
      // No reset/cut at the handoff: rotation, floating and lighting continue.
      timeline=null;film._dropTimeline=null;film.classList.remove('is-playing');film.classList.add('is-settled');film.dataset.phase='floating';
      [goose,lupa,portal].forEach(function(el){el.style.removeProperty('will-change');});
      [goose,lupa].forEach(function(el){el.style.removeProperty('transform');el.style.removeProperty('opacity');});
    },defaults:{ease:'power2.inOut'}});
    film._dropTimeline=timeline;film.dataset.motionEngine='gsap';film.dataset.choreography='portal-jump-airborne-throw';film.dataset.phase='emerging';
    timeline.fromTo(portal,{opacity:0,scaleX:.025,scaleY:.55},{opacity:1,scaleX:1,scaleY:1.13,duration:1.1,ease:'power3.out'},0)
      .to(motion,{visible:1,jumpScale:.56,jumpY:-h*.12,turn:-7,duration:.75,ease:'power2.out'},.38)
      .to(motion,{productOpacity:1,duration:.35},.65)
      .to(motion,{crouch:1,lean:-.12,duration:.55},.65)
      .to(motion,{arm:1.12,duration:.7},.62)
      .to(motion,{crouch:0,lean:.10,duration:.58,ease:'power2.out'},1.2)
      .to(motion,{jumpScale:1.06,jumpY:-h*(scene.clientWidth<420?.10:.14),turn:4,duration:.72,ease:'power2.out'},1.2)
      .to(motion,{arm:-.27,duration:.56,ease:'power2.inOut'},1.55)
      .call(function(){launch=handPosition();launchScale=.14*motion.jumpScale;film.dataset.phase='throwing';},[],1.86)
      .to(motion,{flight:1,duration:1.65,ease:'power2.inOut'},1.86)
      .to(motion,{jumpY:0,jumpScale:1,turn:0,duration:.86,ease:'power2.in'},1.95)
      .to(motion,{crouch:.58,lean:.035,duration:.24,ease:'sine.out'},2.65)
      .to(motion,{crouch:0,lean:0,arm:0,duration:.68,ease:'sine.inOut'},2.89)
      .to(motion,{impact:1,duration:.18,ease:'sine.out'},3.51)
      .to(motion,{impact:0,duration:.7,ease:'sine.inOut'},3.69)
      .fromTo(q('.sg-drop-haze'),{opacity:0,scale:.5},{opacity:.9,scale:1.2,duration:1.5},.2)
      .to(q('.sg-drop-haze'),{opacity:.6,scale:1,duration:1.8},2.8)
      .fromTo(q('.sg-drop-floor'),{opacity:0,scale:.5},{opacity:1,scale:1,duration:1.5},.4)
      .fromTo(q('.sg-drop-energy'),{opacity:0,scale:.5},{opacity:.9,scale:.9,duration:.45},1.2)
      .to(q('.sg-drop-energy'),{opacity:0,scale:1.5,duration:1},1.65)
      .fromTo(q('.sg-drop-trail'),{opacity:0,scaleX:.1},{opacity:.85,scaleX:1,duration:.35},1.88)
      .to(q('.sg-drop-trail'),{opacity:0,duration:.65},2.23)
      .fromTo(word,{yPercent:112,opacity:0},{yPercent:0,opacity:1,duration:1.05,stagger:.2,ease:'power3.out'},.65)
      .fromTo(film.querySelectorAll('.sg-drop-description,.sg-drop-prices,.sg-drop-terms,.sg-drop-cta'),{y:14,opacity:0},{y:0,opacity:1,duration:.8,stagger:.1,ease:'power2.out'},1.25)
      .set(word,{'--light':1,'--shine':'145%'},2.1)
      .to(word,{'--shine':'-45%',duration:1.5,stagger:.15,ease:'sine.inOut'},2.1)
      .to(word,{'--light':0,duration:.6},3.75)
      .to(q('em.sg-drop-word'),{color:'#f0d1a0',duration:.7},2.1)
      .to(q('em.sg-drop-word'),{color:'#d4dce8',duration:.7},2.8)
      .to(q('em.sg-drop-word'),{color:'#ff9b42',duration:1.3},3.5);
    renderMotion();if(document.hidden)timeline.pause();
  }

  if (film) {
    if (window.SGDropRig) rig = window.SGDropRig(film.querySelector('[data-drop-pose]'), lite);
    if (rig) window.addEventListener('resize', function(){if(popupEl.classList.contains('is-open')) settleFilm(true);rig.resize();}, {passive:true});
    var sparks = film.querySelector('[data-drop-particles]');
    for (var s = 0; s < (lite ? 6 : 14); s++) {
      var spark = document.createElement('i');
      spark.style.cssText = 'left:' + (12 + (s * 37 % 78)) + '%;top:' + (30 + (s * 13 % 56)) + '%';
      sparks.append(spark);
    }
    film.querySelector('[data-drop-skip]').addEventListener('click', function(){settleFilm(true);});
    film.querySelector('.sg-drop-lupa img').addEventListener('error', function () { film.querySelector('.sg-drop-lupa').hidden = true; });
    document.addEventListener('visibilitychange', function () {
      if (timeline) { if (document.hidden) timeline.pause(); else timeline.resume(); }
      if (ambient) { if (document.hidden) ambient.pause(); else ambient.resume(); }
    });
    reducedMotion.addEventListener('change', function () { if (reducedMotion.matches) settleFilm(); });
  }

  function lockScroll() {
    scrollY = window.scrollY || window.pageYOffset;
    document.body.style.position = "fixed";
    document.body.style.top = "-" + scrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }
  function unlockScroll() {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
  }

  function trapFocus(e) {
    var scope = zoomOpen ? zoomEl : openEl;
    if (!scope || e.key !== "Tab") return;
    var focusables = Array.from(scope.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')).filter(function (control) {
      return !control.disabled && control.getClientRects().length;
    });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open(el) {
    if (!el) return;
    if (openEl === el) return;
    if (openEl) close(openEl, { silent: true });
    if (el === popupEl) {
      markPopupSeen();
      window.SG.entryPopupSettled = false;
      startFilm();
      document.body.classList.add('sg-entry-popup-open');
    }
    lastFocused = document.activeElement;
    lockScroll();
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    openEl = el;
    if (el === popupEl) window.dispatchEvent(new CustomEvent('sg:overlay', { detail: { open: true } }));
    var closeBtn = el.querySelector(".popup-close");
    closeBtn && closeBtn.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function close(el, opts) {
    opts = opts || {};
    if (!el.classList.contains("is-open")) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    if (openEl === el) {
      openEl = null;
      unlockScroll();
      document.removeEventListener("keydown", onKeydown);
      if (!opts.silent && lastFocused && lastFocused.focus) lastFocused.focus();
    }
    if (el === popupEl) {
      settleFilm();
      document.body.classList.remove('sg-entry-popup-open');
      if (!document.body.classList.contains('category-page-open')) window.dispatchEvent(new CustomEvent('sg:overlay', { detail: { open: false } }));
      window.SG.entryPopupSettled = true;
      document.dispatchEvent(new CustomEvent("sg:entry-popup-settled"));
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      if (zoomOpen) { closeZoom(); return; }
      if (openEl) close(openEl);
    }
    trapFocus(e);
  }

  function openZoom(src, alt) {
    if (!zoomEl) return;
    var img = zoomEl.querySelector("[data-zoom-img]");
    if (img) { img.src = src; img.alt = alt || ""; }
    zoomEl.classList.add("is-open");
    zoomEl.setAttribute("aria-hidden", "false");
    zoomOpen = true;
    var closeBtn = zoomEl.querySelector(".popup-close");
    closeBtn && closeBtn.focus();
  }

  function closeZoom() {
    if (!zoomEl || !zoomOpen) return;
    zoomEl.classList.remove("is-open");
    zoomEl.setAttribute("aria-hidden", "true");
    zoomOpen = false;
  }

  // CTAs de fechar que também são links âncora (#colecao) precisam navegar de
  // verdade — preventDefault bloquearia o smooth-scroll nativo do href.
  function isNavigationLink(el) {
    // Preserve category links too: the router (or native navigation when it
    // has not loaded yet) must receive the click after closing the modal.
    return el.tagName === "A" && !!el.getAttribute("href");
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-open-popup]")) { e.preventDefault(); open(popupEl); }
    var closePopupTrigger = e.target.closest("[data-close-popup]");
    if (closePopupTrigger) { if (!isNavigationLink(closePopupTrigger)) e.preventDefault(); close(popupEl); }
    var closeQvTrigger = e.target.closest("[data-close-quickview]");
    if (closeQvTrigger) { if (!isNavigationLink(closeQvTrigger)) e.preventDefault(); close(qvEl); }
    if (cartEl && e.target.closest("[data-open-cart]")) { e.preventDefault(); open(cartEl); }
    var closeCartTrigger = cartEl && e.target.closest("[data-close-cart]");
    if (closeCartTrigger) { if (!isNavigationLink(closeCartTrigger)) e.preventDefault(); close(cartEl); }
    if (favoritesEl && e.target.closest("[data-open-favorites]")) { e.preventDefault(); open(favoritesEl); }
    var closeFavTrigger = favoritesEl && e.target.closest("[data-close-favorites]");
    if (closeFavTrigger) { if (!isNavigationLink(closeFavTrigger)) e.preventDefault(); close(favoritesEl); }
    if (checkoutEl && e.target.closest("[data-close-checkout]")) { e.preventDefault(); close(checkoutEl); }
    if (reviewEl && e.target.closest("[data-open-review-modal]")) { e.preventDefault(); open(reviewEl); }
    if (reviewEl && e.target.closest("[data-close-review]")) { e.preventDefault(); close(reviewEl); }
    if (zoomEl && e.target.closest("[data-close-zoom]")) { e.preventDefault(); closeZoom(); }
  });

  if (cartEl) {
    window.SG.openCart = function () { open(cartEl); };
    window.SG.closeCart = function () { close(cartEl); };
  }
  if (favoritesEl) {
    window.SG.openFavorites = function () { open(favoritesEl); };
    window.SG.closeFavorites = function () { close(favoritesEl); };
  }
  if (checkoutEl) {
    window.SG.openCheckout = function () { open(checkoutEl); };
    window.SG.closeCheckout = function () { close(checkoutEl); };
  }
  if (reviewEl) {
    window.SG.openReviewModal = function () { open(reviewEl); };
    window.SG.closeReviewModal = function () { close(reviewEl); };
  }
  if (zoomEl) {
    window.SG.openZoomWith = openZoom;
  }

  // Quick view content fill + open (chamado por products.js)
  window.SG.openQuickView = function (product) {
    if (!qvEl) return;
    var fav = window.SG.wishlist && window.SG.wishlist.isFavorite(product.id);
    var artEl = qvEl.querySelector("[data-qv-art]");
    artEl.innerHTML =
      '<img src="' + window.SG.esc(product.images[0]) + '" alt="' + window.SG.esc(product.name) + '" data-open-zoom data-qv-main style="cursor:zoom-in">' +
      (product.images.length > 1
        ? '<div class="qv-thumbs">' + product.images.map(function (src, i) {
            return '<button type="button" class="qv-thumb' + (i === 0 ? " is-active" : "") + '" data-qv-thumb="' + i + '" aria-label="Foto ' + (i + 1) + " de " + product.images.length + '"' + (i === 0 ? ' aria-current="true"' : "") + '><img src="' + window.SG.esc(src) + '" alt=""></button>';
          }).join("") + "</div>"
        : "");
    artEl.querySelectorAll("[data-qv-thumb]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var src = product.images[+btn.getAttribute("data-qv-thumb")];
        artEl.querySelector("[data-qv-main]").setAttribute("src", src);
        zoomEl && zoomEl.setAttribute("data-zoom-src", src);
        artEl.querySelectorAll("[data-qv-thumb]").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
          if (b === btn) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
        });
      });
    });
    qvEl.querySelector("[data-qv-tag]").textContent = product.tag;
    qvEl.querySelector("[data-qv-name]").textContent = product.name;
    qvEl.querySelector("[data-qv-desc]").textContent = product.desc;
    var qvPrice = qvEl.querySelector("[data-qv-price]");
    qvPrice.textContent = product.priceLabel;
    qvPrice.setAttribute("data-price-for", product.id);
    qvEl.querySelector("[data-qv-frame]").textContent = product.frameColor;
    qvEl.querySelector("[data-qv-lens]").textContent = product.lensColor;
    qvEl.querySelector("[data-qv-material]").textContent = product.material || "—";
    qvEl.querySelector("[data-qv-sku]").textContent = product.sku;
    // Armação/Lente só fazem sentido para óculos; linha sem dado real ("—")
    // some em vez de exibir campo vazio (perfume com "Armação: Perfumes")
    var isEyewear = !product.category || product.category === "lupa";
    [["[data-qv-frame]", isEyewear], ["[data-qv-lens]", isEyewear && product.lensColor !== "—"], ["[data-qv-material]", !!product.material && product.material !== "—"]]
      .forEach(function (row) {
        var li = qvEl.querySelector(row[0]);
        if (li && li.parentElement) li.parentElement.hidden = !row[1];
      });
    var addBtn = qvEl.querySelector("[data-qv-add]");
    var buyBtn = qvEl.querySelector("[data-qv-buy]");
    var favBtn = qvEl.querySelector("[data-qv-fav]");
    if (addBtn) addBtn.setAttribute("data-add-to-cart", product.id);
    if (buyBtn) buyBtn.setAttribute("data-buy-now", product.id);
    var waBtn = qvEl.querySelector("[data-qv-wa]");
    var consult = !!product.consultWhatsApp;
    // esgotada (painel): some sacola/comprar/WhatsApp, fica só o favorito
    if (addBtn) addBtn.hidden = consult || !!product.soldOut;
    if (buyBtn) buyBtn.hidden = consult || !!product.soldOut;
    if (waBtn) {
      waBtn.hidden = !consult;
      if (consult) waBtn.setAttribute("href", window.SG.waProductLink(product));
    }
    if (favBtn) {
      favBtn.setAttribute("data-favorite-toggle", product.id);
      favBtn.classList.toggle("is-active", !!fav);
      favBtn.setAttribute("aria-pressed", fav ? "true" : "false");
    }
    zoomEl && zoomEl.setAttribute("data-zoom-src", product.images[0]);
    qvEl.style.setProperty("--accent", product.campaignAccent || "#ff5a00");
    open(qvEl);
  };

  // clique na imagem do quick view abre o zoom com a mesma peça
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-open-zoom]");
    if (!trigger || !window.SG.openZoomWith) return;
    window.SG.openZoomWith(trigger.getAttribute("src"), trigger.getAttribute("alt"));
  });

  // Drop popup — dispara no máximo uma vez por sessão, depois de tempo OU scroll,
  // nunca no primeiro frame, e nunca de novo depois de fechado (por qualquer via).
  var SEEN_KEY = "sgPopupSeen";
  var triggered = false;
  try { triggered = sessionStorage.getItem(SEEN_KEY) === "1"; } catch (_) { /* privacy mode */ }
  window.SG.entryPopupSettled = triggered || !popupEl;
  if (window.SG.entryPopupSettled) document.dispatchEvent(new CustomEvent("sg:entry-popup-settled"));
  var timeTrigger;
  var introReady = !document.querySelector("[data-intro-loader]") || !!(window.SG && window.SG.introComplete);
  function markPopupSeen() {
    if (triggered) return;
    triggered = true;
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (_) { /* in-memory guard remains */ }
    window.removeEventListener("scroll", onScrollTrigger);
    clearTimeout(timeTrigger);
  }
  function maybeTrigger() {
    if (!introReady || triggered || !popupEl) return;
    if (openEl || document.querySelector('dialog[open]') || document.hidden) {
      timeTrigger = setTimeout(maybeTrigger, 500);
      return;
    }
    open(popupEl); // open() já chama markPopupSeen() para el===popupEl
  }
  function onScrollTrigger() {
    var pct = (window.scrollY || window.pageYOffset) / (document.documentElement.scrollHeight - window.innerHeight);
    if (pct >= 0.32) maybeTrigger();
  }
  if (!triggered) {
    // Se o usuário pulou a intro antes deste módulo carregar, o evento já
    // aconteceu. Nesse caso respeita a mesma espera curta do fluxo normal,
    // sem voltar ao atraso inicial de 9s. A automação mantém o atraso longo.
    timeTrigger = setTimeout(maybeTrigger, introReady ? 350 : 9000);
    window.addEventListener("scroll", onScrollTrigger, { passive: true });
    document.addEventListener("sg:intro-complete", function () {
      introReady = true;
      clearTimeout(timeTrigger);
      timeTrigger = setTimeout(maybeTrigger, 350);
    }, { once: true });
  }
})();

