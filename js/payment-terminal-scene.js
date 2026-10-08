/* Street Goose 034 — SG Optical Payment Core: núcleo mecânico + três órbitas
   de profundidade + geometria macro wireframe, tudo Three.js real via
   webgl-director (canvas/renderer/RAF compartilhados). Os cards de método de
   pagamento continuam sendo os elementos HTML que payment-terminal.js já
   construiu (texto acessível de verdade) — aqui só calculamos a posição X/Y
   de cada um a partir de um anchor Object3D projetado pra tela, com escala e
   opacidade caindo conforme a profundidade. Nada de card de costas: eles são
   HTML plano, então sempre encaram a câmera por definição. */
(function () {
  "use strict";

  var THREE = window.THREE;
  var director = window.SGDirector;
  var data = window.SG.paymentTerminal;
  if (!THREE || !director || !director.isAvailable || !data) return;

  var section = data.section;
  var mount = data.orbit;
  var chips = data.chips;
  var reducedMotion = window.SG.prefersReducedMotion();
  if (reducedMotion || !chips.length) return;

  var scene = new THREE.Scene();
  var FOV_Y = 45;
  var camera = new THREE.PerspectiveCamera(FOV_Y, 1, 0.1, 100);
  // raio que precisa caber em quadro sempre: núcleo + órbita mais externa
  // (raio 3.55) + folga — a asa/lente macro fica de fora de propósito
  // (sangra pela borda), não entra nessa conta. Recalculado a cada resize
  // a partir da proporção REAL do container (não escala CSS em cima de uma
  // composição pensada só pro desktop)
  var CONTENT_RADIUS = 4.15;
  var halfTanY = Math.tan((FOV_Y * Math.PI / 180) / 2);
  function computeCameraZ(aspect) {
    var zForHeight = CONTENT_RADIUS / halfTanY;
    var zForWidth = CONTENT_RADIUS / (halfTanY * Math.max(aspect, 0.001));
    return Math.max(zForHeight, zForWidth, 6);
  }
  var baseCameraZ = 9.2;
  camera.position.set(0, 0, baseCameraZ);

  scene.add(new THREE.AmbientLight(0x50575e, 0.9));
  var keyLight = new THREE.DirectionalLight(0xffffff, 0.55);
  keyLight.position.set(3, 4, 6);
  scene.add(keyLight);

  /* ---------------- SG Optical Payment Core ---------------- */
  var coreGroup = new THREE.Group();
  scene.add(coreGroup);

  var bodyGeo = new THREE.IcosahedronGeometry(0.85, 1);
  var bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2c2f, metalness: 0.88, roughness: 0.28 });
  var coreBody = new THREE.Mesh(bodyGeo, bodyMat);
  coreGroup.add(coreBody);

  var coreEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), new THREE.LineBasicMaterial({ color: 0x9fb2bc, transparent: true, opacity: 0.55 }));
  coreEdges.scale.setScalar(1.01);
  coreGroup.add(coreEdges);

  var lensGeo = new THREE.SphereGeometry(1.28, 24, 18);
  var lensMat = new THREE.MeshStandardMaterial({ color: 0x18242e, transparent: true, opacity: 0.28, metalness: 0.15, roughness: 0.08, side: THREE.DoubleSide });
  var coreLens = new THREE.Mesh(lensGeo, lensMat);
  coreLens.scale.set(1, 1, 0.55);
  coreGroup.add(coreLens);

  var lensEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(1.3, 10, 8)), new THREE.LineBasicMaterial({ color: 0x4d9dff, transparent: true, opacity: 0.22 }));
  lensEdges.scale.set(1, 1, 0.55);
  coreGroup.add(lensEdges);

  var coreLight = new THREE.PointLight(0xff6a1a, 2.4, 7);
  coreGroup.add(coreLight);
  var rimLight = new THREE.PointLight(0x2fb2ff, 1.1, 6);
  rimLight.position.set(0.9, 0.6, 1.2);
  coreGroup.add(rimLight);
  var glowMat = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.14 });
  var glowSphere = new THREE.Mesh(new THREE.SphereGeometry(1.55, 16, 12), glowMat);
  coreGroup.add(glowSphere);

  /* ---------------- Três órbitas ---------------- */
  var ORBIT_DEFS = [
    { z: 2.5, radius: 2.55, speed: 0.075, dir: 1, phase: 0, tint: 0x9fb2bc, opacity: 0.4 },
    { z: 0, radius: 3.05, speed: 0.05, dir: -1, phase: 1.05, tint: 0x6d7d85, opacity: 0.3 },
    { z: -2.6, radius: 3.55, speed: 0.03, dir: 1, phase: 2.1, tint: 0x4a555c, opacity: 0.22 }
  ];
  var rings = [];
  var anchors = [];
  data.methods.forEach(function (m, i) {
    var def = ORBIT_DEFS[i % 3];
    var ring = rings[i % 3];
    if (!ring) {
      ring = new THREE.Group();
      ring.position.z = def.z;
      ring.rotation.x = 0.18;
      var pathPts = [];
      for (var a = 0; a <= 64; a++) {
        var t = (a / 64) * Math.PI * 2;
        pathPts.push(new THREE.Vector3(Math.cos(t) * def.radius, 0, Math.sin(t) * def.radius * 0.4));
      }
      var pathGeo = new THREE.BufferGeometry().setFromPoints(pathPts);
      var pathLine = new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ color: def.tint, transparent: true, opacity: def.opacity }));
      ring.add(pathLine);
      ring.userData.speed = def.speed * def.dir;
      scene.add(ring);
      rings[i % 3] = ring;
    }
    var phaseOffset = def.phase + (anchors.filter(function (an) { return an.userData.ringIndex === i % 3; }).length) * Math.PI;
    var anchor = new THREE.Object3D();
    anchor.userData.ringIndex = i % 3;
    anchor.userData.angle = phaseOffset;
    anchor.userData.radius = def.radius;
    anchor.position.set(Math.cos(phaseOffset) * def.radius, 0, Math.sin(phaseOffset) * def.radius * 0.4);
    ring.add(anchor);
    anchors.push(anchor);
  });

  /* ---------------- Geometria macro (asa/lente gigante, cortada na borda) ---------------- */
  var macroGroup = new THREE.Group();
  macroGroup.position.set(6.6, 0.4, -5.5);
  scene.add(macroGroup);
  var wingPts = [
    new THREE.Vector3(-2.2, -3.4, 0), new THREE.Vector3(-0.6, -1.2, 1.4),
    new THREE.Vector3(0.4, 1.6, 0.4), new THREE.Vector3(2.6, 3.6, -1.2),
    new THREE.Vector3(4.6, 4.4, -2.6)
  ];
  var wingCurve = new THREE.CatmullRomCurve3(wingPts);
  var wingTube = new THREE.Mesh(new THREE.TubeGeometry(wingCurve, 64, 0.05, 8, false), new THREE.MeshStandardMaterial({ color: 0x707880, metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.55 }));
  macroGroup.add(wingTube);
  [3.4, 4.3, 5.2].forEach(function (r, i) {
    var pts = [];
    for (var a = 0; a <= 80; a++) {
      var t = (a / 80) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r * 0.92, 0));
    }
    var ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x5b6870, transparent: true, opacity: 0.16 - i * 0.03 }));
    macroGroup.add(ring);
  });

  /* ---------------- Partículas orbitais ---------------- */
  var isDesktop = window.innerWidth > 900;
  var particleCount = window.SG.perfTier === "high" ? (isDesktop ? 90 : 46) : (isDesktop ? 55 : 30);
  var pPositions = new Float32Array(particleCount * 3);
  var pSeeds = [];
  for (var p = 0; p < particleCount; p++) {
    var rad = 1.8 + Math.random() * 2.4;
    var ang = Math.random() * Math.PI * 2;
    var height = (Math.random() - 0.5) * 2.2;
    pPositions[p * 3] = Math.cos(ang) * rad;
    pPositions[p * 3 + 1] = height;
    pPositions[p * 3 + 2] = Math.sin(ang) * rad * 0.5;
    pSeeds.push({ rad: rad, ang: ang, height: height, speed: 0.06 + Math.random() * 0.1 });
  }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
  var pMat = new THREE.PointsMaterial({ color: 0xffb37a, size: 0.045, transparent: true, opacity: 0.55, sizeAttenuation: true });
  var particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  /* ---------------- Estado de scroll/cursor ---------------- */
  var scrollProgress = 0;
  var pointerNX = 0, pointerNY = 0;
  var isPointerFine = window.SG.perfTier !== "low" && matchMedia("(hover:hover) and (pointer:fine)").matches;
  var camXTo, camYTo, coreRotTo;
  if (window.SG.hasGSAP) {
    camXTo = window.gsap.quickTo(camera.position, "x", { duration: 0.9, ease: "power3.out" });
    camYTo = window.gsap.quickTo(camera.position, "y", { duration: 0.9, ease: "power3.out" });
  }

  if (isPointerFine) {
    section.addEventListener("pointermove", function (e) {
      var r = section.getBoundingClientRect();
      pointerNX = (e.clientX - r.left) / r.width - 0.5;
      pointerNY = (e.clientY - r.top) / r.height - 0.5;
      if (camXTo) camXTo(pointerNX * 1.1);
      if (camYTo) camYTo(-pointerNY * 0.7);
    });
    section.addEventListener("pointerleave", function () {
      if (camXTo) camXTo(0);
      if (camYTo) camYTo(0);
    });
  }

  if (window.SG.hasGSAP && window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: section, start: "top bottom", end: "bottom top", scrub: 0.6,
      onUpdate: function (self) { scrollProgress = self.progress; }
    });
  }

  /* ---------------- Sincroniza cards HTML com os anchors 3D ---------------- */
  // Três órbitas independentes podem, em certas fases, alinhar duas âncoras
  // na mesma região da tela mesmo com raios de mundo diferentes (perspectiva
  // encolhe a órbita mais distante o bastante pra coincidir com a mais
  // próxima). Em vez de tentar coreografar isso analiticamente, calculamos
  // as 6 posições primeiro e aplicamos um empurrão par-a-par se duas ficarem
  // mais perto do que a largura de um card — garante nunca sobrepor.
  var v = new THREE.Vector3();
  var slots = anchors.map(function () { return { x: 0, y: 0, scale: 1, opacity: 1 }; });
  var MIN_DIST = 150;
  function syncCards() {
    var w = mount.clientWidth, h = mount.clientHeight;
    if (!w || !h) return;
    for (var i = 0; i < chips.length && i < anchors.length; i++) {
      anchors[i].getWorldPosition(v);
      var viewSpace = v.clone().applyMatrix4(camera.matrixWorldInverse);
      var dist = -viewSpace.z;
      v.project(camera);
      var depthT = THREE.MathUtils.clamp((dist - 6) / (13 - 6), 0, 1); // perto=0, longe=1
      slots[i].x = (v.x * 0.5 + 0.5) * w;
      slots[i].y = (1 - (v.y * 0.5 + 0.5)) * h;
      slots[i].scale = THREE.MathUtils.lerp(1.08, 0.72, depthT);
      slots[i].opacity = THREE.MathUtils.lerp(1, 0.5, depthT);
      slots[i].depthT = depthT;
    }
    for (var pass = 0; pass < 3; pass++) {
      for (var a = 0; a < slots.length; a++) {
        for (var b = a + 1; b < slots.length; b++) {
          var dx = slots[b].x - slots[a].x, dy = slots[b].y - slots[a].y;
          var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
          if (d < MIN_DIST) {
            var push = (MIN_DIST - d) / 2;
            var ux = dx / d, uy = dy / d;
            // quem está mais perto da câmera (depthT menor) cede menos espaço
            var wA = slots[a].depthT < slots[b].depthT ? 0.35 : 0.65;
            slots[a].x -= ux * push * wA; slots[a].y -= uy * push * wA;
            slots[b].x += ux * push * (1 - wA); slots[b].y += uy * push * (1 - wA);
          }
        }
      }
    }
    for (var i2 = 0; i2 < chips.length && i2 < anchors.length; i2++) {
      var s = slots[i2];
      chips[i2].style.transform = "translate3d(" + s.x + "px," + s.y + "px,0) translate(-50%,-50%) scale(" + s.scale.toFixed(3) + ")";
      chips[i2].style.opacity = s.opacity.toFixed(2);
      chips[i2].style.zIndex = String(Math.round((1 - s.depthT) * 100));
    }
  }

  /* ---------------- Entrada ---------------- */
  var entranceDone = false;
  function playEntrance() {
    if (entranceDone) return;
    entranceDone = true;
    mount.classList.add("is-synced");
    if (!window.SG.hasGSAP) { syncCards(); return; }
    var gsap = window.gsap;
    gsap.set(macroGroup.scale, { x: 0.4, y: 0.4, z: 0.4 });
    gsap.set(macroGroup.position, { x: macroGroup.position.x + 2 });
    rings.forEach(function (r) { gsap.set(r.scale, { x: 0.001, y: 0.001, z: 0.001 }); });
    gsap.set(coreGroup.scale, { x: 0.001, y: 0.001, z: 0.001 });
    gsap.set(chips, { opacity: 0, scale: 0.6 });

    var tl = gsap.timeline();
    tl.to(macroGroup.scale, { x: 1, y: 1, z: 1, duration: 1.6, ease: "power3.out" }, 0)
      .to(macroGroup.position, { x: macroGroup.position.x - 2, duration: 1.6, ease: "power3.out" }, 0)
      .to(rings.map(function (r) { return r.scale; }), { x: 1, y: 1, z: 1, duration: 1, ease: "back.out(1.5)", stagger: 0.12 }, 0.3)
      .to(coreGroup.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: "back.out(1.8)" }, 0.55)
      .to(chips, { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.6)", stagger: 0.08 }, 0.8);
  }

  var entranceIo = new IntersectionObserver(function (entries) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    playEntrance();
    entranceIo.disconnect();
  }, { threshold: 0.15 });
  entranceIo.observe(section);

  /* ---------------- Registro no director ---------------- */
  var clockT = 0;
  director.registerScene("payment-terminal", {
    scene: scene,
    camera: camera,
    onResize: function (w, h) {
      baseCameraZ = computeCameraZ(w / h);
      syncCards();
    },
    onFrame: function (dt) {
      clockT += dt;
      coreGroup.rotation.y += dt * 0.15 + scrollProgress * 0.006;
      coreGroup.rotation.x = Math.sin(clockT * 0.4) * 0.08;
      coreLight.intensity = 2.1 + Math.sin(clockT * 2.1) * 0.5;
      glowMat.opacity = 0.1 + Math.sin(clockT * 2.1) * 0.04;
      rings.forEach(function (r) {
        r.rotation.y += r.userData.speed * dt + scrollProgress * 0.008 * (r.userData.speed > 0 ? 1 : -1);
      });
      var pos = pGeo.attributes.position.array;
      for (var pi = 0; pi < particleCount; pi++) {
        var s = pSeeds[pi];
        s.ang += s.speed * dt;
        pos[pi * 3] = Math.cos(s.ang) * s.rad;
        pos[pi * 3 + 2] = Math.sin(s.ang) * s.rad * 0.5;
      }
      pGeo.attributes.position.needsUpdate = true;
      camera.position.z = baseCameraZ - scrollProgress * 1.7;
      camera.lookAt(0, 0, 0);
      if (entranceDone) syncCards();
    },
    dispose: function () {
      [bodyGeo, lensGeo, pGeo].forEach(function (g) { g.dispose(); });
      scene.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) { if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); }); else obj.material.dispose(); }
      });
    }
  });

  var sectionIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      director.reportVisibility("payment-terminal", entry.intersectionRatio, mount);
    });
  }, { threshold: [0, 0.04, 0.08, 0.15, 0.3, 0.5, 0.7, 0.9, 1] });
  sectionIo.observe(section);
})();

export {};
