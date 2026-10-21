/* Street Goose 034 — "SG Optical Signal": óculos procedural completo pra
   seção da newsletter. Aros extrudados de verdade (Shape com furo interno +
   ExtrudeGeometry, não linhas soltas), ponte e hastes em TubeGeometry sobre
   CatmullRomCurve3, lentes translúcidas, corpo cromado/grafite com overlay
   wireframe (EdgesGeometry), luz laranja pulsando dentro da lente, reflexo
   azul externo e partículas que convergem pras bordas na entrada. Uma lente
   fica cortada pela borda da seção (overflow:hidden em .newsletter) pra dar
   sensação de escala macro. Formulário continua em HTML, acima do canvas. */
(function () {
  "use strict";

  var THREE = window.THREE;
  var director = window.SGDirector;
  var section = document.querySelector(".newsletter");
  var mount = document.querySelector("[data-newsletter-canvas]");
  if (!THREE || !director || !director.isAvailable || !section || !mount || !window.SG) return;

  var reducedMotion = window.SG.prefersReducedMotion();
  if (reducedMotion) return;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  var baseCameraZ = 9;
  camera.position.set(0, 0, baseCameraZ);

  scene.add(new THREE.AmbientLight(0x3c4650, 1.05));
  scene.add(new THREE.HemisphereLight(0xe5f0ff, 0x262024, 0.38));
  var key = new THREE.DirectionalLight(0xffffff, 0.5);
  key.position.set(2, 3, 5);
  scene.add(key);

  // Camera reveal independent of the scene director and scroll camera.
  // All meshes remain in the SAME shared WebGL renderer.
  var revealRoot = new THREE.Group();
  scene.add(revealRoot);
  var rig = new THREE.Group();
  revealRoot.add(rig);
  var entranceCameraBias = 1.3;

  function lensShape(rx, ry) {
    var shape = new THREE.Shape();
    var seg = 48;
    for (var i = 0; i <= seg; i++) {
      var ang = (i / seg) * Math.PI * 2;
      var x = Math.cos(ang) * rx, y = Math.sin(ang) * ry * (1 - 0.12 * Math.max(0, Math.sin(ang)));
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    return shape;
  }
  function rimGeometry(rx, ry, thickness, depth) {
    var outer = lensShape(rx, ry);
    outer.holes.push(lensShape(rx - thickness, ry - thickness));
    return new THREE.ExtrudeGeometry(outer, { depth: depth, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 2, curveSegments: 40 });
  }

  var RX = 1.05, RY = 0.86, THICK = 0.12, DEPTH = 0.16;
  var chromeMat = new THREE.MeshStandardMaterial({ color: 0x383a3e, metalness: 0.88, roughness: 0.23 });
  var lensMat = new THREE.MeshStandardMaterial({ color: 0x233441, transparent: true, opacity: 0.39, metalness: 0.18, roughness: 0.07, side: THREE.DoubleSide });
  var edgeMat = new THREE.LineBasicMaterial({ color: 0x9fb7c2, transparent: true, opacity: 0.55 });

  function buildEye(mirror) {
    var group = new THREE.Group();
    var rimGeo = rimGeometry(RX, RY, THICK, DEPTH);
    var rim = new THREE.Mesh(rimGeo, chromeMat);
    rim.position.z = -DEPTH / 2;
    group.add(rim);
    var edges = new THREE.LineSegments(new THREE.EdgesGeometry(rimGeo, 30), edgeMat);
    edges.position.copy(rim.position);
    group.add(edges);
    var lensGeo = new THREE.ShapeGeometry(lensShape(RX - THICK - 0.015, RY - THICK - 0.015), 40);
    var lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.z = 0.01;
    group.add(lens);
    group.userData.lens = lens;
    group.userData.rim = rim;
    group.position.x = mirror ? -(RX + 0.18) : (RX + 0.18);
    return group;
  }
  var eyeL = buildEye(true);
  var eyeR = buildEye(false);
  rig.add(eyeL, eyeR);

  var bridgeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-(RX * 0.32), -0.06, 0), new THREE.Vector3(0, 0.1, 0.05), new THREE.Vector3(RX * 0.32, -0.06, 0)
  ]);
  var bridge = new THREE.Mesh(new THREE.TubeGeometry(bridgeCurve, 20, 0.05, 8, false), chromeMat);
  rig.add(bridge);

  function buildTemple(mirror) {
    var sign = mirror ? -1 : 1;
    var originX = sign * (RX * 2 + 0.18);
    var pivot = new THREE.Group();
    pivot.position.set(originX, 0, 0);
    var curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(sign * 0.35, -0.03, -0.9),
      new THREE.Vector3(sign * 0.55, -0.12, -2.1), new THREE.Vector3(sign * 0.6, -0.2, -3.2)
    ]);
    var temple = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.038, 8, false), chromeMat);
    pivot.add(temple);
    var hinge = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), chromeMat);
    pivot.add(hinge);
    pivot.userData.foldAngle = sign * -1.15;
    return pivot;
  }
  var templeL = buildTemple(true), templeR = buildTemple(false);
  rig.add(templeL, templeR);

  var coreLight = new THREE.PointLight(0xff6a1a, 2, 5);
  coreLight.position.set(0, 0, 0.4);
  rig.add(coreLight);
  var blueRim = new THREE.PointLight(0x2f8fe0, 1.1, 6);
  blueRim.position.set(RX + 1, 0.6, 1.6);
  rig.add(blueRim);

  /* ---------------- Partículas convergindo pras bordas ---------------- */
  var count = window.SG.perfTier === "high" ? 142 : window.SG.perfTier === "low" ? 44 : 88;
  var targets = [];
  [eyeL, eyeR].forEach(function (eye) {
    for (var i = 0; i < count / 2; i++) {
      var ang = Math.random() * Math.PI * 2;
      var r = RX * (0.94 + Math.random() * 0.16);
      targets.push(new THREE.Vector3(eye.position.x + Math.cos(ang) * r, Math.sin(ang) * RY * (0.94 + Math.random() * 0.16), (Math.random() - 0.5) * 0.3));
    }
  });
  var starts = targets.map(function (t) {
    return new THREE.Vector3(t.x + (Math.random() - 0.5) * 7, t.y + (Math.random() - 0.5) * 7, t.z - Math.random() * 6);
  });
  var pPos = new Float32Array(count * 3);
  for (var pi = 0; pi < count; pi++) { pPos[pi * 3] = starts[pi].x; pPos[pi * 3 + 1] = starts[pi].y; pPos[pi * 3 + 2] = starts[pi].z; }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  var pMat = new THREE.PointsMaterial({ color: 0xffcf9e, size: 0.035, transparent: true, opacity: 0, sizeAttenuation: true });
  var particles = new THREE.Points(pGeo, pMat);
  rig.add(particles);
  var particleProgress = { t: 0 };

  function updateOffset() {
    rig.position.x = window.innerWidth > 900 ? 4.2 : 0;
    rig.scale.setScalar(window.innerWidth > 900 ? 1.7 : 0.82);
  }
  updateOffset();

  var scrollProgress = 0;
  if (window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: section, start: "top bottom", end: "bottom top", scrub: 0.6,
      onUpdate: function (self) { scrollProgress = self.progress; }
    });
  }

  var isPointerFine = window.SG.perfTier !== "low" && matchMedia("(hover:hover) and (pointer:fine)").matches;
  var camXTo, camYTo, rigRotTo;
  if (window.SG.hasGSAP) {
    camXTo = window.gsap.quickTo(camera.position, "x", { duration: 1, ease: "power3.out" });
    camYTo = window.gsap.quickTo(camera.position, "y", { duration: 1, ease: "power3.out" });
    rigRotTo = window.gsap.quickTo(rig.rotation, "y", { duration: 1.1, ease: "power3.out" });
  }
  if (isPointerFine) {
    section.addEventListener("pointermove", function (e) {
      var r = section.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      if (camXTo) camXTo(nx * 0.9);
      if (camYTo) camYTo(-ny * 0.5);
      if (rigRotTo) rigRotTo(nx * 0.18);
    });
    section.addEventListener("pointerleave", function () {
      if (camXTo) camXTo(0); if (camYTo) camYTo(0); if (rigRotTo) rigRotTo(0);
    });
  }

  /* ---------------- Entrada cinematográfica ---------------- */
  var idleStarted = false;
  function playEntrance() {
    if (!window.SG.hasGSAP) {
      entranceCameraBias = 0;
      pMatOpacityFallback(); startIdle(); return;
    }
    var gsap = window.gsap;
    gsap.set(revealRoot.scale, { x: 0.74, y: 0.74, z: 0.74 });
    gsap.set(revealRoot.position, { z: -2.3, y: -0.28 });
    gsap.set(revealRoot.rotation, { y: -0.48, x: 0.15, z: -0.08 });
    gsap.set([eyeL.scale, eyeR.scale], { x: 0.001, y: 0.001, z: 0.001 });
    gsap.set(bridge.scale, { x: 0.001, y: 0.001, z: 0.001 });
    gsap.set([eyeL.userData.lens.material, eyeR.userData.lens.material], { opacity: 0 });
    templeL.rotation.y = templeL.userData.foldAngle;
    templeR.rotation.y = templeR.userData.foldAngle;
    coreLight.intensity = 0;

    var tl = gsap.timeline({ onComplete: startIdle });
    tl.to(revealRoot.position, { z: 0, y: 0, duration: 1.85, ease: "power3.out" }, 0.1)
      .to(revealRoot.rotation, { y: 0.05, x: 0.01, z: 0, duration: 2.1, ease: "power3.out" }, 0.12)
      .to(revealRoot.scale, { x: 1, y: 1, z: 1, duration: 1.75, ease: "power3.out" }, 0.12)
      .to({ zoom: 1.3 }, { zoom: 0, duration: 2, ease: "power3.out", onUpdate: function () { entranceCameraBias = this.targets()[0].zoom; } }, 0.15)
      .to(particleProgress, { t: 1, duration: 1.4, ease: "power2.out" }, 0)
      .to(pMat, { opacity: 0.6, duration: 0.5 }, 0)
      .to(eyeL.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: "back.out(1.6)" }, 0.5)
      .to(eyeR.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: "back.out(1.6)" }, 0.62)
      .to(bridge.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "power2.out" }, 1.05)
      .to(templeL.rotation, { y: 0, duration: 0.8, ease: "power3.out" }, 1.15)
      .to(templeR.rotation, { y: 0, duration: 0.8, ease: "power3.out" }, 1.2)
      .to([eyeL.userData.lens.material, eyeR.userData.lens.material], { opacity: 0.34, duration: 0.7, ease: "power2.out" }, 1.4)
      .to(coreLight, { intensity: 2.25, duration: 0.9, ease: "sine.out" }, 1.5)
      .to(edgeMat, { opacity: 0.74, duration: 1.2, ease: "sine.out" }, 1.35)
      .to(blueRim, { intensity: 1.7, duration: 1.4, ease: "sine.out" }, 1.15);
  }
  function pMatOpacityFallback() { pMat.opacity = 0.5; particleProgress.t = 1; }
  var idleTimelines = [];
  function startIdle() {
    if (idleStarted || !window.SG.hasGSAP) return;
    idleStarted = true;
    var gsap = window.gsap;
    idleTimelines.push(gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } }).to(rig.position, { y: "+=0.14", duration: 3.4 }));
    idleTimelines.push(gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } }).to(coreLight, { intensity: 2.65, duration: 3.3 }));
    idleTimelines.push(gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } }).to(revealRoot.rotation, { y: 0.105, x: -0.035, duration: 5.6 }));
    idleTimelines.push(gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } }).to(edgeMat, { opacity: 0.49, duration: 4.1 }));
  }
  var entranceIo = new IntersectionObserver(function (entries) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    playEntrance();
    entranceIo.disconnect();
  }, { threshold: 0.2 });
  entranceIo.observe(section);

  var clockT = 0;
  director.registerScene("newsletter", {
    scene: scene,
    camera: camera,
    onResize: function () { updateOffset(); },
    onFrame: function (dt) {
      clockT += dt;
      var pos = pGeo.attributes.position.array;
      var tt = particleProgress.t;
      for (var i = 0; i < count; i++) {
        pos[i * 3] = THREE.MathUtils.lerp(starts[i].x, targets[i].x, tt);
        pos[i * 3 + 1] = THREE.MathUtils.lerp(starts[i].y, targets[i].y, tt) + Math.sin(clockT * 0.6 + i) * 0.01;
        pos[i * 3 + 2] = THREE.MathUtils.lerp(starts[i].z, targets[i].z, tt);
      }
      pGeo.attributes.position.needsUpdate = true;
      blueRim.position.y = Math.sin(clockT * 0.5) * 0.4;
      camera.position.z = baseCameraZ - 0.6 - scrollProgress * 1.4 + entranceCameraBias;
      rig.rotation.x = scrollProgress * -0.08;
      camera.lookAt(rig.position.x * 0.4, 0, 0);
    },
    dispose: function () {
      scene.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) { if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); }); else obj.material.dispose(); }
      });
      idleTimelines.forEach(function (tl) { tl.kill(); });
    }
  });

  var sectionIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      director.reportVisibility("newsletter", entry.intersectionRatio, mount);
    });
  }, { threshold: [0, 0.04, 0.08, 0.15, 0.3, 0.5, 0.7, 0.9, 1] });
  sectionIo.observe(section);

  addEventListener("pagehide", function () { idleTimelines.forEach(function (tl) { tl.kill(); }); }, { once: true });
})();

export {};
