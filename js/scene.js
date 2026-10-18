import { QualityGovernor } from "../src/components/ranking-crystal/crystal-quality.ts";
/* Street Goose 034 — Three.js: atmosfera, não decoração aleatória.
   Hero: poeira óptica direcional. Orbit: anéis metálicos + luz.
   Perf-tiered, pausa fora da viewport, cleanup, fallback sempre visível por padrão. */
(function () {
  "use strict";

  // The capability probe in motion.js already created (and released) a test
  // context; a second throwaway context here only cost time and a GPU slot.
  function hasWebGL() {
    return !!window.WebGLRenderingContext && window.SG.perfTier !== "low";
  }

  var THREE_OK = typeof window.THREE !== "undefined" && hasWebGL();
  var reduced = window.SG.prefersReducedMotion();
  var tier = window.SG.perfTier;

  function hexToRgbFloat(hex) {
    var v = parseInt(hex.replace("#", ""), 16);
    return { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 };
  }

  function makeRenderLoop(canvas, setup) {
    var visible = false;
    var running = false;
    var ctx = null;
    // IntersectionObserver mede geometria, não pintura — um overlay
    // position:fixed (categoria, busca, carrinho...) cobre a tela sem tirar
    // o canvas do viewport geométrico, então sem esse flag explícito a cena
    // continuaria rendendo escondida atrás, competindo por GPU com o vídeo
    // em scrub da categoria
    var overlayOpen = document.body.classList.contains("category-page-open") || document.body.classList.contains("sg-entry-popup-open");

    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.05 }) : null;
    if (io) io.observe(canvas); else visible = true;

    document.addEventListener("visibilitychange", function () {
      sync();
    });
    window.addEventListener("sg:overlay", function (e) {
      overlayOpen = !!(e.detail && e.detail.open);
      sync();
    });

    // Set only when the renderer can't be created: the static fallback stays.
    var retired = false;
    // A device that can't hold the frame rate gets a lower resolution (down
    // to 55 %), never a scene that stops. "Slow" is under ~25 fps, so the
    // 30 fps cap of iOS Low Power Mode doesn't blur anything.
    var governor = new QualityGovernor({ downMs: 40, upMs: 24, ignoreMs: 400 });
    var lastFrame = 0;

    function sync() {
      var shouldRun = visible && !document.hidden && !overlayOpen && !retired;
      if (shouldRun && !running) start();
      if (!shouldRun && running) stop();
    }

    function ensureCtx() {
      if (ctx || retired) return;
      // A renderer that can't be created (no WebGL, context limit) must
      // never break the page: the static fallback simply stays.
      try { ctx = setup(); } catch (e) { ctx = null; retired = true; }
    }

    function start() {
      ensureCtx();
      if (!ctx) return;
      running = true;
      governor.reset(); lastFrame = 0;
      ctx.raf = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (ctx && ctx.raf) cancelAnimationFrame(ctx.raf);
    }
    function loop(t) {
      if (!running || !ctx) return;
      // The section fades the canvas out while its video plays: an invisible
      // canvas is not drawn, so the GPU stays free for the video decoder.
      if (canvas.style.opacity !== "0") {
        if (lastFrame && governor.sample(t - lastFrame) && ctx.setScale) ctx.setScale(governor.scale);
        lastFrame = t;
        ctx.tick(t);
      } else lastFrame = 0;
      ctx.raf = requestAnimationFrame(loop);
    }

    // Build the renderer (shader compile included) ahead of time while the
    // section is still about a screen away, but only when the page is truly
    // at rest: no scroll for 400 ms, then 300 ms of smooth frames (>= 40 fps)
    // with still no scroll. During a fast scroll, or on a device that is
    // already struggling, it waits; if the visitor never pauses, the
    // renderer is built on first sight exactly as before.
    if ("IntersectionObserver" in window) {
      var warmIo = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        warmIo.disconnect();
        var quietTimer = 0, scrolledAt = 0, done = false;
        var onScroll = function () {
          scrolledAt = performance.now();
          clearTimeout(quietTimer);
          quietTimer = setTimeout(checkSmooth, 400);
        };
        var checkSmooth = function () {
          if (done || ctx || retired) return finish();
          var start = performance.now(), frames = 0;
          requestAnimationFrame(function count(now) {
            if (scrolledAt > start) return; // scrolling again: onScroll re-arms
            frames++;
            if (now - start < 300) { requestAnimationFrame(count); return; }
            if (frames >= 12 && !document.hidden) { finish(); ensureCtx(); }
            else quietTimer = setTimeout(checkSmooth, 400);
          });
        };
        var finish = function () {
          done = true;
          clearTimeout(quietTimer);
          window.removeEventListener("scroll", onScroll);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      }, { rootMargin: "120% 0px 120% 0px" });
      warmIo.observe(canvas);
    }

    // Mobile browsers fire resize while the address bar slides during a
    // scroll; reallocating the WebGL buffer on each one stalls frames. Wait
    // for the bar to settle, and only resize when the box really changed.
    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { if (ctx && ctx.resize) ctx.resize(); }, 150);
    }, { passive: true });

    // start check immediately for browsers without IO (visible=true)
    sync();
  }

  /* ---------------- HERO: optical dust ---------------- */
  function setupHeroScene() {
    var canvas = document.querySelector("[data-hero-canvas]");
    var heroEl = document.querySelector("[data-hero]");
    // tier "low" só reduz densidade de partícula (ver COUNT abaixo) — nunca
    // decide se a cena existe. Isso já foi um "sem Three.js no celular"
    // disfarçado de heurística de performance (narrow viewport + poucos
    // núcleos/memória reportados, que é praticamente todo telefone real)
    if (!canvas || !heroEl || !THREE_OK) return;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, powerPreference: "low-power" });
    var basePixelRatio = Math.min(window.devicePixelRatio || 1, window.innerWidth > 900 ? 1.5 : 1.25);
    renderer.setPixelRatio(basePixelRatio);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 50);
    camera.position.z = 10;

    var COUNT = tier === "high" ? 260 : 140;
    var positions = new Float32Array(COUNT * 3);
    var speeds = new Float32Array(COUNT);
    for (var i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      speeds[i] = 0.15 + Math.random() * 0.35;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    var accentHex = getComputedStyle(heroEl).getPropertyValue("--accent").trim() || "#ff5a00";
    var col = hexToRgbFloat(accentHex);
    var mat = new THREE.PointsMaterial({
      size: 0.045, transparent: true, opacity: 0.55, depthWrite: false,
      color: new THREE.Color(col.r, col.g, col.b), blending: THREE.AdditiveBlending
    });
    var points = new THREE.Points(geo, mat);
    scene.add(points);

    var sizedW = 0, sizedH = 0;
    function resize() {
      var w = heroEl.clientWidth, h = heroEl.clientHeight;
      if (!w || !h || (w === sizedW && h === sizedH)) return;
      sizedW = w; sizedH = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();

    // acompanha a cor de campanha ativa (accent) sem recriar a cena
    var accentObserver = new MutationObserver(function () {
      var hex = getComputedStyle(heroEl).getPropertyValue("--accent").trim();
      if (!hex) return;
      var c = hexToRgbFloat(hex);
      mat.color.setRGB(c.r, c.g, c.b);
    });
    accentObserver.observe(heroEl, { attributes: true, attributeFilter: ["style"] });

    var pos = geo.attributes.position;
    return {
      resize: resize,
      setScale: function (scale) { renderer.setPixelRatio(basePixelRatio * scale); sizedW = 0; resize(); },
      tick: function (t) {
        for (var i = 0; i < COUNT; i++) {
          var idx = i * 3;
          pos.array[idx] -= speeds[i] * 0.01;
          if (pos.array[idx] < -8) pos.array[idx] = 8;
        }
        pos.needsUpdate = true;
        renderer.render(scene, camera);
      }
    };
  }

  /* ---------------- SCROLL FILM: planeta óptico (anéis + poeira) ---------------- */
  function setupFilmScene() {
    var canvas = document.querySelector("[data-film-canvas]");
    var wrap = document.querySelector("[data-scroll-film] .scroll-film-sticky");
    if (!canvas || !wrap || !THREE_OK) return;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    var basePixelRatio = Math.min(window.devicePixelRatio || 1, window.innerWidth > 900 ? 1.75 : 1.25);
    renderer.setPixelRatio(basePixelRatio);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    camera.position.set(0, 0, 8);

    var group = new THREE.Group();
    scene.add(group);

    var ringCount = tier === "high" ? 4 : 2;
    var ringColors = [0xc7cbd1, 0x4fc3f7, 0xc7cbd1, 0x9fe8ff];
    var rings = [];
    for (var i = 0; i < ringCount; i++) {
      var radius = 2.3 + i * 0.55;
      var mat = new THREE.MeshStandardMaterial({ color: ringColors[i % ringColors.length], metalness: 0.9, roughness: 0.22, emissive: 0x110700, emissiveIntensity: i === 1 ? 0.5 : 0.1 });
      var ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.02 + (i === 1 ? 0.012 : 0), 14, 100), mat);
      ring.rotation.x = Math.PI / 2.3 + i * 0.35;
      ring.rotation.y = i * 0.5;
      group.add(ring);
      rings.push(ring);
    }

    var pCount = tier === "high" ? 160 : 70;
    var positions = new Float32Array(pCount * 3);
    for (var j = 0; j < pCount; j++) {
      var a = Math.random() * Math.PI * 2, r = 2.6 + Math.random() * 2.6;
      positions[j * 3] = Math.cos(a) * r;
      positions[j * 3 + 1] = (Math.random() - 0.5) * 3;
      positions[j * 3 + 2] = Math.sin(a) * r;
    }
    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    var pMat = new THREE.PointsMaterial({ size: 0.035, color: 0x8fd8ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    var points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    var key = new THREE.PointLight(0x4fc3f7, 7, 14);
    key.position.set(3, 2, 4);
    scene.add(key);
    var fill = new THREE.PointLight(0xcfefff, 2.2, 14);
    fill.position.set(-3, -1, 3);
    scene.add(fill);
    scene.add(new THREE.AmbientLight(0x141a1e, 1));

    var sizedW = 0, sizedH = 0;
    function resize() {
      var w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h || (w === sizedW && h === sizedH)) return;
      sizedW = w; sizedH = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    renderer.compile(scene, camera);

    var mouseX = 0, mouseY = 0;
    wrap.addEventListener("pointermove", function (e) {
      var r = wrap.getBoundingClientRect();
      mouseX = (e.clientX - r.left) / r.width - 0.5;
      mouseY = (e.clientY - r.top) / r.height - 0.5;
    });

    return {
      resize: resize,
      setScale: function (scale) { renderer.setPixelRatio(basePixelRatio * scale); sizedW = 0; resize(); },
      tick: function (t) {
        var s = t * 0.00009;
        group.rotation.y = s + mouseX * 0.35;
        group.rotation.x = 0.15 + mouseY * 0.2;
        points.rotation.y = -s * 0.6;
        renderer.render(scene, camera);
      }
    };
  }

  makeRenderLoop(document.querySelector("[data-hero-canvas]") || document.createElement("canvas"), setupHeroScene);
  makeRenderLoop(document.querySelector("[data-film-canvas]") || document.createElement("canvas"), setupFilmScene);
})();

export {};
