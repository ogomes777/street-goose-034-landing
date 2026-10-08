/* Street Goose 034 — túnel óptico do capítulo "A rua muda. O olhar também.":
   aros elípticos concêntricos recuando em Z, poeira atmosférica instanciada
   como pontos, alguns aros cromados de verdade (metalness) pra pegar luz, e
   uma luz que percorre o túnel. Câmera faz dolly pra dentro do túnel durante
   o scroll da seção. O produto (PNG 2D, final-act-motion.js) fica sempre em
   HTML por cima — essa cena é só o cenário atrás dele. */
(function () {
  "use strict";

  var THREE = window.THREE;
  var director = window.SGDirector;
  var section = document.querySelector("[data-final-act]");
  var mount = document.querySelector("[data-final-act-canvas]");
  if (!THREE || !director || !director.isAvailable || !section || !mount || !window.SG) return;

  var reducedMotion = window.SG.prefersReducedMotion();
  if (reducedMotion) return;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 5);

  scene.add(new THREE.AmbientLight(0x2a3540, 1.1));

  var RING_COUNT = window.SG.perfTier === "high" ? 18 : 12;
  var TUNNEL_DEPTH = 38;
  var rings = [];
  var tunnel = new THREE.Group();
  scene.add(tunnel);

  for (var i = 0; i < RING_COUNT; i++) {
    var t = i / (RING_COUNT - 1);
    var z = -t * TUNNEL_DEPTH;
    var rx = 3.2 + Math.sin(t * 3.1) * 0.35;
    var ry = rx * 0.86;
    var isChrome = i % 5 === 0;
    var pts = [];
    for (var a = 0; a <= 72; a++) {
      var ang = (a / 72) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(ang) * rx, Math.sin(ang) * ry, 0));
    }
    var ring;
    if (isChrome) {
      var curve = new THREE.CatmullRomCurve3(pts, true);
      var geo = new THREE.TubeGeometry(curve, 96, 0.028, 8, true);
      var mat = new THREE.MeshStandardMaterial({ color: 0x9fb7c2, metalness: 0.85, roughness: 0.22, emissive: 0x0a1218, emissiveIntensity: 0.4 });
      ring = new THREE.Mesh(geo, mat);
    } else {
      var lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      var lerpBlue = new THREE.Color(0x0b2140).lerp(new THREE.Color(0x1f4d7a), Math.sin(t * 5) * 0.5 + 0.5);
      var lineMat = new THREE.LineBasicMaterial({ color: lerpBlue, transparent: true, opacity: 0.5 - t * 0.28 });
      ring = new THREE.LineLoop(lineGeo, lineMat);
    }
    ring.position.z = z;
    ring.userData.baseZ = z;
    ring.userData.t = t;
    tunnel.add(ring);
    rings.push(ring);
  }

  // linhas de topologia conectando os aros em alguns pontos (sensação de
  // "trilho" percorrendo o túnel, como as hastes de um óculos gigante)
  var railAngles = [0.3, 1.9, 3.4, 5.1];
  railAngles.forEach(function (ang) {
    var pts = rings.map(function (r) {
      var rx = 3.2 + Math.sin(r.userData.t * 3.1) * 0.35, ry = rx * 0.86;
      return new THREE.Vector3(Math.cos(ang) * rx, Math.sin(ang) * ry, r.userData.baseZ);
    });
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var mat = new THREE.LineBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.14 });
    tunnel.add(new THREE.Line(geo, mat));
  });

  var travelLight = new THREE.PointLight(0xff8a3d, 3, 9);
  travelLight.position.set(0, 0, -2);
  tunnel.add(travelLight);
  var blueFill = new THREE.PointLight(0x2f7dd9, 1.4, 14);
  blueFill.position.set(0, 0, -8);
  tunnel.add(blueFill);

  var particleCount = window.SG.perfTier === "high" ? 260 : 140;
  var pPos = new Float32Array(particleCount * 3);
  for (var p = 0; p < particleCount; p++) {
    var rad = Math.random() * 2.6;
    var ang2 = Math.random() * Math.PI * 2;
    pPos[p * 3] = Math.cos(ang2) * rad;
    pPos[p * 3 + 1] = Math.sin(ang2) * rad * 0.86;
    pPos[p * 3 + 2] = -Math.random() * TUNNEL_DEPTH;
  }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  var pMat = new THREE.PointsMaterial({ color: 0xbcd8ff, size: 0.03, transparent: true, opacity: 0.5, sizeAttenuation: true });
  var particles = new THREE.Points(pGeo, pMat);
  tunnel.add(particles);

  var scrollProgress = 0;
  if (window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: section, start: "top bottom", end: "bottom top", scrub: 0.7,
      onUpdate: function (self) { scrollProgress = self.progress; }
    });
  }

  var isPointerFine = window.SG.perfTier !== "low" && matchMedia("(hover:hover) and (pointer:fine)").matches;
  var pointerRotTo, pointerRotYTo;
  if (window.SG.hasGSAP) {
    pointerRotTo = window.gsap.quickTo(camera.rotation, "x", { duration: 1, ease: "power3.out" });
    pointerRotYTo = window.gsap.quickTo(camera.rotation, "y", { duration: 1, ease: "power3.out" });
  }
  if (isPointerFine) {
    section.addEventListener("pointermove", function (e) {
      var r = section.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      if (pointerRotYTo) pointerRotYTo(nx * 0.06);
      if (pointerRotTo) pointerRotTo(-ny * 0.045);
    });
    section.addEventListener("pointerleave", function () {
      if (pointerRotYTo) pointerRotYTo(0);
      if (pointerRotTo) pointerRotTo(0);
    });
  }

  var entranceDone = false;
  function playEntrance() {
    if (entranceDone || !window.SG.hasGSAP) return;
    entranceDone = true;
    var gsap = window.gsap;
    rings.forEach(function (r) { gsap.set(r.scale, { x: 0.15, y: 0.15, z: 0.15 }); });
    gsap.to(rings.map(function (r) { return r.scale; }), {
      x: 1, y: 1, z: 1, duration: 1.3, ease: "power3.out",
      stagger: { each: 0.045, from: "start" }
    });
    gsap.fromTo(particles.material, { opacity: 0 }, { opacity: 0.5, duration: 1.8, ease: "power2.out", delay: 0.3 });
  }
  var entranceIo = new IntersectionObserver(function (entries) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    playEntrance();
    entranceIo.disconnect();
  }, { threshold: 0.15 });
  entranceIo.observe(section);

  var clockT = 0;
  director.registerScene("final-act", {
    scene: scene,
    camera: camera,
    onFrame: function (dt) {
      clockT += dt;
      camera.position.z = 5 - scrollProgress * 16;
      var lightZ = ((clockT * 2.4) % (TUNNEL_DEPTH + 8)) - 4;
      travelLight.position.z = -lightZ;
      blueFill.position.z = camera.position.z - 9;
      tunnel.rotation.z = Math.sin(clockT * 0.12) * 0.02;
    },
    dispose: function () {
      scene.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) { if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); }); else obj.material.dispose(); }
      });
    }
  });

  // reporta a fração visível pro director decidir quem fica com o canvas —
  // três seções (final-act/payment-terminal/newsletter) competem pelo mesmo
  // canvas, e "isIntersecting" sozinho (booleano) deixava a ordem de disparo
  // dos observers decidir quem ganhava, o que podia deixar a seção errada
  // (ou nenhuma) com o canvas numa rolagem rápida
  var sectionIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      director.reportVisibility("final-act", entry.intersectionRatio, mount);
    });
  }, { threshold: [0, 0.04, 0.08, 0.15, 0.3, 0.5, 0.7, 0.9, 1] });
  sectionIo.observe(section);
})();

export {};
