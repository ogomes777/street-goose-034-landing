import { levelGem } from './level-gems.js';

/* Decorative only: names, places and XP remain accessible HTML from real data. */
export async function mountRankingScene(host, leaders) {
  let stopped = false, cleanup = () => {};
  const dispose = () => { stopped = true; cleanup(); };
  const ready = (async () => {
    const THREE = await import('three');
    if (stopped || !host.isConnected) return;
    const canvas = host.querySelector('canvas');
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch (_) { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 640 ? 1.25 : 1.6));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 80);
    camera.position.set(0, 3.9, 10.8); camera.lookAt(0, 1.5, 0);
    scene.add(new THREE.HemisphereLight(0xd8c5ff, 0x151025, 1.4));
    const key = new THREE.DirectionalLight(0xffe5c1, 2); key.position.set(-3, 6, 4); scene.add(key);
    const rim = new THREE.PointLight(0x9d73ff, 4, 16); rim.position.set(4, 3, -3); scene.add(rim);
    const blue = new THREE.PointLight(0x62abff, 2, 14); blue.position.set(-4, 2, 2); scene.add(blue);
    const group = new THREE.Group(); scene.add(group);
    const podiums = [], crystals = [], rings = [];
    const metalColors = [0xf3cb79, 0xc2cde3, 0xbd835e];
    const heights = [1.65, 1.05, .7], slots = [0, -2, 2];
    [0, 1, 2].forEach(i => {
      const column = new THREE.Group(); column.position.x = slots[i]; group.add(column); podiums.push(column);
      const h = heights[i];
      const metal = new THREE.MeshStandardMaterial({ color: metalColors[i], metalness: .8, roughness: .28 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.79, .9, h, 48), new THREE.MeshStandardMaterial({ color: 0x242135, metalness: .85, roughness: .27 }));
      body.position.y = h / 2; column.add(body);
      [.08, h - .04, h - .16].forEach(y => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.79, .025, 8, 64), metal);
        ring.rotation.x = Math.PI / 2; ring.position.y = y; column.add(ring);
      });
      const top = new THREE.Mesh(new THREE.CylinderGeometry(.79, .79, .07, 48), metal); top.position.y = h; column.add(top);
      const gem = levelGem(leaders[i] ? leaders[i].level : 1);
      const material = new THREE.MeshPhysicalMaterial({ color: leaders[i] ? gem.color : '#514767', metalness: .25, roughness: .12, clearcoat: 1, clearcoatRoughness: .05, emissive: leaders[i] ? gem.color : '#251c3a', emissiveIntensity: leaders[i] ? .18 : .02, flatShading: true });
      const size = i === 0 ? .65 : .5;
      const profile = [new THREE.Vector2(0, -.85 * size), new THREE.Vector2(size * .85, -.12 * size), new THREE.Vector2(size, .12 * size), new THREE.Vector2(size * .62, .53 * size), new THREE.Vector2(0, .78 * size)];
      const crystal = new THREE.Mesh(new THREE.LatheGeometry(profile, gem.sides), material);
      crystal.scale.y = 1.35; crystal.position.y = h + 1.05; column.add(crystal); crystals.push(crystal);
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(i === 0 ? .91 : .72, .014, 6, 80), new THREE.MeshBasicMaterial({ color: metalColors[i], transparent: true, opacity: .65 }));
      orbit.rotation.set(1.1, .2, -.3); orbit.position.y = h + 1.05; column.add(orbit); rings.push(orbit);
      // Fine etched lines on the front of each plinth.
      for (let j = 0; j < 10; j++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(.008, h - .24, .008), new THREE.MeshBasicMaterial({ color: metalColors[i], transparent: true, opacity: .25 }));
        const angle = (j - 4.5) * .13; line.position.set(Math.sin(angle) * .81, h / 2, Math.cos(angle) * .81); column.add(line);
      }
    });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.1, .06, 80), new THREE.MeshBasicMaterial({ color: 0x171322 }));
    floor.position.y = -.07; group.add(floor);
    [3.3, 3.75, 4.1].forEach(radius => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .012, 5, 100), new THREE.MeshBasicMaterial({ color: 0xa991d4, transparent: true, opacity: .25 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = -.015; group.add(ring);
    });
    const positions = new Float32Array(800 * 3), colors = new Float32Array(800 * 3);
    const palette = [new THREE.Color('#dabdff'), new THREE.Color('#fff0cd'), new THREE.Color('#89bcff')];
    for (let i = 0; i < 800; i++) {
      const a = i * 2.399963, r = 2 + Math.random() * 10;
      positions[i * 3] = Math.cos(a) * r; positions[i * 3 + 1] = (Math.random() - .3) * 11; positions[i * 3 + 2] = -2 - Math.random() * 8;
      const c = palette[i % 3]; colors.set([c.r, c.g, c.b], i * 3);
    }
    const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ size: .028, vertexColors: true, transparent: true, opacity: .8 })); scene.add(stars);
    let frame = 0, visible = true, paused = matchMedia('(prefers-reduced-motion: reduce)').matches, last = 0;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const button = host.querySelector('[data-scene-toggle]');
    function syncButton() { if (button) { button.textContent = paused ? 'Reproduzir animação' : 'Pausar animação'; button.setAttribute('aria-pressed', String(paused)); } }
    function draw(t) {
      if (stopped) return;
      frame = 0;
      if (!visible || document.hidden || paused) return;
      if (t - last >= 32) {
        const time = t * .001;
        crystals.forEach((gem, i) => { gem.rotation.y = time * .32 + i; gem.position.y = heights[i] + 1.05 + Math.sin(time * 1.2 + i) * .09; });
        rings.forEach((r, i) => { r.rotation.z = -.3 + Math.sin(time * .45 + i) * .2; });
        stars.rotation.z = Math.sin(time * .03) * .035;
        group.rotation.y = Math.sin(time * .16) * .06;
        renderer.render(scene, camera); last = t;
      }
      frame = requestAnimationFrame(draw);
    }
    function resume() { if (!stopped && !frame && visible && !document.hidden && !paused) frame = requestAnimationFrame(draw); }
    function resize() {
      const { width, height } = host.getBoundingClientRect(); if (!width || !height) return;
      renderer.setSize(width, height, false); camera.aspect = width / height;
      camera.position.z = 10.8 / Math.min(1, Math.max(.8, camera.aspect));
      camera.lookAt(0, 1.5, 0); camera.updateProjectionMatrix(); renderer.render(scene, camera);
    }
    function toggle() { paused = !paused; syncButton(); if (paused) { cancelAnimationFrame(frame); frame = 0; } else resume(); }
    function motion(e) { paused = e.matches; syncButton(); cancelAnimationFrame(frame); frame = 0; resize(); resume(); }
    function visibility() { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else resume(); }
    function lost(e) { e.preventDefault(); cancelAnimationFrame(frame); frame = 0; host.classList.remove('has-webgl'); }
    const observer = new ResizeObserver(resize); observer.observe(host);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (!visible) { cancelAnimationFrame(frame); frame = 0; } else resume(); }); intersection.observe(host);
    canvas.addEventListener('webglcontextlost', lost); document.addEventListener('visibilitychange', visibility); media.addEventListener('change', motion);
    if (button) button.addEventListener('click', toggle);
    host.classList.add('has-webgl'); syncButton(); resize(); resume();
    cleanup = () => {
      cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', motion); canvas.removeEventListener('webglcontextlost', lost);
      if (button) button.removeEventListener('click', toggle);
      const geometries = new Set(), materials = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m)); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); host.classList.remove('has-webgl');
    };
  })().catch(() => {});
  await ready;
  return dispose;
}
