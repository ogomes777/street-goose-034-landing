import { levelGem } from './level-gems.js';
import { createGemGeometry, createGemMaterial } from './gem-geometry.js';

/* One GPU context for all seven gems, with independent scissor viewports. */
export async function mountRankingGems(host) {
  const THREE = await import('three');
  if (!host || !host.isConnected) return () => {};
  const slots = [...host.querySelectorAll('li .sg-level-gem')];
  if (!slots.length) return () => {};
  const canvas = document.createElement('canvas'); canvas.className = 'ranking-gems-canvas'; canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); } catch (_) { return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 640 ? 1.25 : 1.6));
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
  host.append(canvas);
  const views = slots.map((slot, i) => {
    const scene = new THREE.Scene(), gem = levelGem(Number(slot.dataset.level) || i + 1);
    scene.add(new THREE.HemisphereLight(0xe3e4ff, 0x131324, .9));
    const light = new THREE.DirectionalLight(0xffffff, 1.3); light.position.set(-2, 3, 4); scene.add(light);
    const rim = new THREE.PointLight(gem.color, 2, 10); rim.position.set(2, 1, -2); scene.add(rim);
    const mesh = new THREE.Mesh(createGemGeometry(THREE, gem, .75), createGemMaterial(THREE, gem.color)); mesh.scale.y = 1.22; scene.add(mesh);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(.96, .008, 5, 64), new THREE.MeshBasicMaterial({ color: gem.color, transparent: true, opacity: .38 })); orbit.rotation.x = 1.15; scene.add(orbit);
    const sparkGeometry = new THREE.BufferGeometry(); const points = new Float32Array(18 * 3);
    for (let n = 0; n < 18; n++) { const a = n * 2.39996, r = .88 + Math.random() * .32; points.set([Math.cos(a) * r, Math.sin(a) * r, (Math.random() - .5) * .5], n * 3); }
    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const sparks = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({ color: gem.color, size: .026, transparent: true, opacity: .8 })); scene.add(sparks);
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 20); camera.position.set(0, .25, 4.6); camera.lookAt(0, 0, 0);
    return { scene, mesh, orbit, sparks, camera, rect: null, slot };
  });
  let width = 1, height = 1, frame = 0, last = 0, animationTime = 0, visible = false, disposed = false, contextLost = false;
  const root = host.closest('.is-ranking'), media = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = media.matches || !!root?.classList.contains('ranking-motion-paused');
  function render(time = 0) {
    renderer.setScissorTest(false); renderer.setViewport(0, 0, width, height); renderer.clear(); renderer.setScissorTest(true);
    views.forEach((view, i) => {
      const r = view.rect; if (!r) return;
      if (!paused) {
        view.mesh.rotation.y = time * .65 + i * .5; view.mesh.rotation.z = Math.sin(time * .75 + i) * .09;
        view.mesh.position.y = Math.sin(time * 1.6 + i * .8) * .1;
        const pulse = 1 + Math.sin(time * 1.8 + i) * .045; view.mesh.scale.set(pulse, 1.22 * pulse, pulse);
        view.mesh.material.emissiveIntensity = .18 + (1 + Math.sin(time * 1.8 + i)) * .09;
        view.orbit.rotation.y = time * .35 + i; view.sparks.rotation.z = time * .12; view.sparks.material.opacity = .5 + Math.sin(time * 1.5 + i) * .25;
      }
      renderer.setViewport(r.x, height - r.y - r.h, r.w, r.h); renderer.setScissor(r.x, height - r.y - r.h, r.w, r.h); renderer.render(view.scene, view.camera);
    });
  }
  function resize() {
    const bounds = host.getBoundingClientRect(); width = Math.max(1, bounds.width); height = Math.max(1, bounds.height); renderer.setSize(width, height, false);
    views.forEach(view => { const r = view.slot.getBoundingClientRect(); view.rect = { x: r.left - bounds.left - 10, y: r.top - bounds.top - 10, w: r.width + 20, h: r.height + 20 }; view.camera.aspect = view.rect.w / view.rect.h; view.camera.updateProjectionMatrix(); }); render(animationTime);
  }
  function tick(t) { frame = 0; if (disposed || contextLost || !visible || paused || document.hidden) return; if (t - last > 32) { animationTime += Math.min(.1, Math.max(0, (t - last) * .001)); render(animationTime); last = t; } frame = requestAnimationFrame(tick); }
  function resume() { if (!disposed && !contextLost && visible && !paused && !document.hidden && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } }
  function pause(value) { paused = value; cancelAnimationFrame(frame); frame = 0; resume(); }
  function motion(e) { pause(e.detail.paused); }
  function preference(e) { pause(e.matches); }
  function visibility() { cancelAnimationFrame(frame); frame = 0; resume(); }
  function lost(e) { e.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0; host.classList.remove('has-gem-webgl'); }
  const observer = new ResizeObserver(resize); observer.observe(host);
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; visibility(); }); intersection.observe(host);
  root?.addEventListener('sg:ranking-motion', motion); document.addEventListener('visibilitychange', visibility); media.addEventListener('change', preference); canvas.addEventListener('webglcontextlost', lost);
  host.classList.add('has-gem-webgl'); resize(); resume();
  return () => {
    disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); root?.removeEventListener('sg:ranking-motion', motion); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', preference); canvas.removeEventListener('webglcontextlost', lost);
    views.forEach(view => view.scene.traverse(obj => { obj.geometry?.dispose(); if (obj.material) obj.material.dispose(); })); renderer.dispose(); canvas.remove(); host.classList.remove('has-gem-webgl');
  };
}
