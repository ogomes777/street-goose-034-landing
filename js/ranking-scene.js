import { levelGem, PODIUM_GEM_LEVELS } from './level-gems.js';
import { QualityGovernor } from '../src/components/ranking-crystal/crystal-quality.ts';

/* Decorative only: names, places and XP remain accessible HTML from real data.
   The three podium stones are the shared refractive crystals (gem-field),
   drawn in HTML slots this scene keeps aligned with the pedestals. Everything
   that moves here (galaxy rotation, twinkle, nebula drift) runs in shaders,
   so a frame costs no per-particle CPU work. */

const GALAXY_VERT = `
uniform float uTime;
uniform float uScale;
attribute float aRadius;
attribute float aAngle;
attribute float aHeight;
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
varying vec3 vColor;
void main() {
  // Differential rotation: inner orbits turn faster, so the arms slowly wind.
  float a = aAngle + uTime * 0.024 / (0.55 + aRadius);
  vec3 p = vec3(cos(a) * aRadius, aHeight, sin(a) * aRadius);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.94 + 0.06 * sin(uTime * (0.38 + aSeed * 0.8) + aSeed * 61.0);
  gl_PointSize = min(9.0, aSize * uScale * twinkle / -mv.z);
  vColor = aColor;
}`;

const POINT_FRAG = `
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  float a = exp(-d * 5.0) + 0.35 * exp(-d * 40.0);
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * a * 0.72, a * 0.67);
}`;

const STAR_VERT = `
uniform float uTime;
uniform float uScale;
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.8 + 0.2 * pow(0.5 + 0.5 * sin(uTime * (0.28 + aSeed) + aSeed * 97.0), 3.0);
  gl_PointSize = min(4.0, aSize * uScale * tw / -mv.z);
  vColor = aColor * (0.6 + 0.4 * tw);
}`;

const NEBULA_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const NEBULA_FRAG = `
uniform float uTime;
uniform float uOctaves;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p), w=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),w.x),
    mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),w.x),w.y);
}
void main(){
  vec2 p=(vUv-vec2(.52,.55))*vec2(1.15,1.55);
  float haze=exp(-dot(p,p)*6.0);
  float dust=noise(vUv*vec2(3.6,2.4)+vec2(uTime*.002,0.0));
  vec3 space=vec3(.004,.006,.014);
  space+=vec3(.015,.018,.047)*haze;
  space+=vec3(.013,.009,.022)*haze*dust;
  gl_FragColor=vec4(space,1.0);
}`;

// Shows the nebula texture as is (no encoding, no tone mapping), exactly as
// the nebula shader would have written it straight to the screen.
const NEBULA_SHOW_FRAG = `
uniform sampler2D tMap;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(tMap, vUv); }`;

const BEAM_VERT = `
varying vec2 vUv;
varying float vFacing;
void main() {
  vUv = uv;
  vec3 n = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFacing = abs(dot(n, normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`;

const BEAM_FRAG = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
varying float vFacing;
void main() {
  float fade = pow(1.0 - vUv.y, 2.2) * smoothstep(0.0, 0.06, vUv.y);
  float core = pow(vFacing, 2.5);
  float shimmer = 0.85 + 0.15 * sin(vUv.y * 18.0 - uTime * 1.6);
  float a = fade * core * uOpacity * shimmer;
  gl_FragColor = vec4(uColor * a, a);
}`;

const FLOOR_FRAG = `
uniform vec3 uColor;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float glow = exp(-r * r * 3.2) * 0.17;
  float rings = 0.0;
  for (int i = 1; i <= 2; i++) {
    float rr = float(i) * 0.43;
    rings += exp(-pow((r - rr) * 90.0, 2.0)) * 0.11;
  }
  float edge = exp(-pow((r - 0.985) * 70.0, 2.0)) * 0.18;
  float sweep = 0.0;
  float a = (glow + rings + edge + sweep) * smoothstep(1.0, 0.92, r);
  gl_FragColor = vec4(uColor * a, a);
}`;

const STREAK_FRAG = `
uniform float uLife;
varying vec2 vUv;
void main() {
  float head = smoothstep(0.0, 1.0, vUv.x);
  float body = pow(head, 3.0) * exp(-pow((vUv.y - 0.5) * 7.0, 2.0));
  float a = body * sin(3.14159 * uLife);
  gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, a);
}`;

function gauss(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function mulberry(seed) {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export async function mountRankingScene(host) {
  let stopped = false, cleanup = () => {};
  const dispose = () => { stopped = true; cleanup(); };
  const ready = (async () => {
    const THREE = await import('three');
    // Let the page paint first (names, podium, copy): building the scene
    // compiles shaders, and doing it before that first paint is what makes
    // the tap into the constellation feel frozen.
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    if (stopped || !host.isConnected) return;
    const canvas = host.querySelector('canvas');
    const small = matchMedia('(max-width: 720px), (pointer: coarse)').matches;
    // Calm tier: same scene, a fraction of the stars, low resolution, 30 fps.
    const calm = window.SG?.perfTier === 'low';
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !small, powerPreference: small ? 'low-power' : 'high-performance' }); }
    catch (_) { return; }
    const pixelRatio = calm ? 1 : Math.min(devicePixelRatio || 1, small ? 1.15 : 1.5);
    renderer.setPixelRatio(pixelRatio);
    // Same governor as the crystals: if this device can't hold the frame
    // rate, the resolution steps down (never below 60 %) instead of the
    // animation stuttering, and climbs back once there is headroom. Phones
    // draw at 30 fps, so "slow" there means under ~22 fps.
    const governor = new QualityGovernor(calm || small
      ? { levels: [1, .85, .72, .6], downMs: 45, upMs: 36, downFrames: 20, upFrames: 180, cooldownFrames: 45, ignoreMs: 400 }
      : { levels: [1, .85, .72, .6], downFrames: 30, cooldownFrames: 60, ignoreMs: 400 });
    // Reading shader logs forces each compile to finish on the spot (a long
    // freeze when the page opens); the shaders are fixed, so only dev checks.
    renderer.debug.checkShaderErrors = !!import.meta.env.DEV;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    const rand = mulberry(34);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 120);
    const camBase = new THREE.Vector3(0, 3.9, 10.8), lookAt = new THREE.Vector3(0, 1.5, 0);
    camera.position.copy(camBase); camera.lookAt(lookAt);
    scene.add(camera);
    const textures = [], timeUniforms = [], scaleUniforms = [];

    // Lights for the polished pedestals.
    scene.add(new THREE.HemisphereLight(0xb9a4ff, 0x0b0814, .9));
    const key = new THREE.DirectionalLight(0xffe2bd, 2.2); key.position.set(-3, 6, 5); scene.add(key);
    const rim = new THREE.PointLight(0xa070ff, 2.4, 18); rim.position.set(4, 4, -3); scene.add(rim);
    const blue = new THREE.PointLight(0x5aa8ff, 1.4, 16); blue.position.set(-5, 2, 1); scene.add(blue);

    const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 128;
    const gctx = glowCanvas.getContext('2d'); const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(.12, '#ffffffb0'); grad.addColorStop(.4, '#ffffff26'); grad.addColorStop(1, '#ffffff00');
    gctx.fillStyle = grad; gctx.fillRect(0, 0, 128, 128);
    const glowTexture = new THREE.CanvasTexture(glowCanvas); textures.push(glowTexture);
    const glow = (color, opacity, size) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.scale.set(size, size, 1); return s;
    };

    // 1 · Nebula: a screen-filling backdrop that always covers the view.
    // Domain-warped noise is the costliest pixel of the scene, yet it drifts
    // about 1 % per second: it is painted at half resolution into its own
    // texture, refreshed four times a second, and shown stretched (soft
    // clouds look the same), instead of being recomputed on every frame.
    const nebulaUniforms = { uTime: { value: 0 }, uOctaves: { value: 1 } };
    const nebulaTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
    const nebulaScene = new THREE.Scene(), nebulaCam = new THREE.OrthographicCamera(-.5, .5, .5, -.5, 0, 1);
    const nebulaPaint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ vertexShader: NEBULA_VERT, fragmentShader: NEBULA_FRAG, uniforms: nebulaUniforms, depthWrite: false, depthTest: false, toneMapped: false }));
    nebulaPaint.position.z = -.5; nebulaScene.add(nebulaPaint);
    const nebula = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ vertexShader: NEBULA_VERT, fragmentShader: NEBULA_SHOW_FRAG, uniforms: { tMap: { value: nebulaTarget.texture } }, depthWrite: false, depthTest: false, toneMapped: false }));
    nebula.position.z = -90; nebula.renderOrder = -10; camera.add(nebula);
    let nebulaAt = -1;
    function paintNebula(time, force) {
      if (!force && nebulaAt >= 0 && Math.abs(time - nebulaAt) < 1.2) return;
      nebulaAt = time; nebulaUniforms.uTime.value = time;
      renderer.setRenderTarget(nebulaTarget); renderer.render(nebulaScene, nebulaCam); renderer.setRenderTarget(null);
    }

    // 2 · Background stars with individual twinkle.
    const STARS = calm ? 95 : small ? 230 : 520;
    const starPos = new Float32Array(STARS * 3), starSize = new Float32Array(STARS), starSeed = new Float32Array(STARS), starColor = new Float32Array(STARS * 3);
    const starPalette = [[.75, .82, 1], [1, 1, 1], [1, .9, .75], [.85, .78, 1]];
    for (let i = 0; i < STARS; i++) {
      const theta = (rand() - .5) * 2.4, phi = (rand() - .35) * 1.3, r = 35 + rand() * 25;
      starPos.set([Math.sin(theta) * Math.cos(phi) * r, Math.sin(phi) * r + 4, -Math.cos(theta) * Math.cos(phi) * r], i * 3);
      starSize[i] = (rand() < .03 ? 0.30 : 0.11 + rand() * 0.10); starSeed[i] = rand();
      starColor.set(starPalette[i % 4], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3)); starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
    starGeo.setAttribute('aSeed', new THREE.BufferAttribute(starSeed, 1)); starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColor, 3));
    const starUniforms = { uTime: { value: 0 }, uScale: { value: 1 } }; timeUniforms.push(starUniforms.uTime); scaleUniforms.push(starUniforms.uScale);
    const stars = new THREE.Points(starGeo, new THREE.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: POINT_FRAG, uniforms: starUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    stars.renderOrder = -5; scene.add(stars);

    // 3 · Spiral galaxy: two logarithmic arms, bulge, star-forming knots, dust.
    const GALAXY = calm ? 2800 : small ? 6300 : 14500, R = 7.2;
    const aRadius = new Float32Array(GALAXY), aAngle = new Float32Array(GALAXY), aHeight = new Float32Array(GALAXY), aSize = new Float32Array(GALAXY), aSeed = new Float32Array(GALAXY), aColor = new Float32Array(GALAXY * 3);
    const core = new THREE.Color('#f4e1bd');
    const warm = new THREE.Color('#d7aa83');
    const violet = new THREE.Color('#876da5');
    const cyan = new THREE.Color('#7db9d3');
    const tmp = new THREE.Color();
    // Recognisable two-arm spiral, compact nucleus and restrained dust lanes.
    // All stellar positions are created once and animated in the GPU shader.
    for (let i = 0; i < GALAXY; i++) {
      const kind = rand();
      let r, angle, h, size, color;
      if (kind < .095) {
        r = Math.abs(gauss(rand)) * .46;
        angle = rand() * Math.PI * 2;
        h = gauss(rand) * .16 * Math.exp(-r);
        size = .016 + rand() * .022;
        color = tmp.copy(core).lerp(warm, Math.min(1, r));
      } else if (kind < .94) {
        r = .34 + Math.pow(rand(), 1.14) * R;
        const arm = (i % 2) * Math.PI;
        const width = .095 + .10 * (r / R);
        const spread = gauss(rand) * width * (kind > .87 ? 2 : 1);
        angle = arm + 1.6 * Math.log(r + .55) + spread;
        h = gauss(rand) * .065 * (1 - .25 * r / R);
        size = .019 + rand() * .021;
        const t = r / R;
        color = t < .3 ? tmp.copy(warm).lerp(violet, t / .3) :
          tmp.copy(violet).lerp(cyan, Math.min(1, (t - .3) / .7));
        if (kind > .885 && kind < .915) color.multiplyScalar(.30);
      } else {
        r = 1.4 + Math.pow(rand(), .72) * R;
        angle = rand() * Math.PI * 2;
        h = gauss(rand) * .23;
        size = .012 + rand() * .011;
        color = tmp.copy(violet).lerp(cyan, rand()).multiplyScalar(.31);
      }
      aRadius[i] = r; aAngle[i] = angle; aHeight[i] = h;
      aSize[i] = size; aSeed[i] = rand();
      const brightness = .62 + rand() * .38;
      aColor.set([color.r * brightness, color.g * brightness, color.b * brightness], i * 3);
    }
    const galaxyGeo = new THREE.BufferGeometry();
    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(GALAXY * 3), 3));
    [['aRadius', aRadius], ['aAngle', aAngle], ['aHeight', aHeight], ['aSize', aSize], ['aSeed', aSeed]].forEach(([n, a]) => galaxyGeo.setAttribute(n, new THREE.BufferAttribute(a, 1)));
    galaxyGeo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
    galaxyGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R + 1);
    const galaxyUniforms = { uTime: { value: 0 }, uScale: { value: 1 } }; timeUniforms.push(galaxyUniforms.uTime); scaleUniforms.push(galaxyUniforms.uScale);
    const galaxy = new THREE.Points(galaxyGeo, new THREE.ShaderMaterial({ vertexShader: GALAXY_VERT, fragmentShader: POINT_FRAG, uniforms: galaxyUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    const galaxyRoot = new THREE.Group(); galaxyRoot.position.set(0, 4.55, -8.5); galaxyRoot.rotation.set(1.12, 0, -.18); galaxyRoot.scale.setScalar(.91); scene.add(galaxyRoot);
    galaxyRoot.add(galaxy);
    const coreGlow = [glow(0xffddac, .21, 1.5), glow(0x8885bf, .06, 4.2)];
    coreGlow.forEach(s => { s.position.copy(galaxyRoot.position); s.renderOrder = -4; scene.add(s); });

    // No planet: the spiral and real leaderboard are the visual focus.

    // 5 · Podium: polished columns, metal rims, light shafts, floor.
    const group = new THREE.Group(); scene.add(group);
    const metalColors = [0xf3cb79, 0xc8d3e8, 0xc58a62];
    const heights = [1.65, 1.05, .7], slotsX = [0, -2.05, 2.05];
    const anchors = [], gemGlows = [], beams = [];
    const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x1c1830, metalness: .9, roughness: .2, clearcoat: 1, clearcoatRoughness: .08 });
    [0, 1, 2].forEach(i => {
      const column = new THREE.Group(); column.position.x = slotsX[i]; group.add(column);
      const h = heights[i];
      const metal = new THREE.MeshPhysicalMaterial({ color: metalColors[i], metalness: 1, roughness: .22, clearcoat: .6, emissive: metalColors[i], emissiveIntensity: .08 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.8, .9, h, 64), bodyMaterial); body.position.y = h / 2; column.add(body);
      [.06, h - .05, h - .17].forEach(y => { const ring = new THREE.Mesh(new THREE.TorusGeometry(.8, .022, 10, 96), metal); ring.rotation.x = Math.PI / 2; ring.position.y = y; column.add(ring); });
      const top = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, .06, 64), metal); top.position.y = h; column.add(top);
      const topGlow = new THREE.Mesh(new THREE.CircleGeometry(.72, 64), new THREE.MeshBasicMaterial({ color: metalColors[i], transparent: true, opacity: .32, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }));
      topGlow.rotation.x = -Math.PI / 2; topGlow.position.y = h + .035; column.add(topGlow);
      const beamUniforms = { uColor: { value: new THREE.Color(metalColors[i]) }, uOpacity: { value: i === 0 ? .13 : .075 }, uTime: { value: 0 } }; timeUniforms.push(beamUniforms.uTime);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.82, .62, 3.2, 20, 1, true), new THREE.ShaderMaterial({ vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, uniforms: beamUniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }));
      beam.position.y = h + 1.6; column.add(beam); beams.push(beam);
      const anchor = new THREE.Object3D(); anchor.position.y = h + 1.12; column.add(anchor); anchors.push(anchor);
      const g = glow(new THREE.Color(levelGem(PODIUM_GEM_LEVELS[i]).color), .13, i === 0 ? 1.8 : 1.35); g.position.set(0, h + 1.12, -.35); column.add(g); gemGlows.push(g);
    });
    const floorUniforms = { uColor: { value: new THREE.Color(0xa77bff) }, uTime: { value: 0 } }; timeUniforms.push(floorUniforms.uTime);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 9.6), new THREE.ShaderMaterial({ vertexShader: NEBULA_VERT, fragmentShader: FLOOR_FRAG, uniforms: floorUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = .005; group.add(floor);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.75, 4.85, .08, 96), new THREE.MeshPhysicalMaterial({ color: 0x0e0b18, metalness: .7, roughness: .3, clearcoat: 1 }));
    base.position.y = -.045; group.add(base);

    // HTML slots for the podium crystals.
    const gemSlots = [0, 1, 2].map(i => host.querySelector('[data-podium="' + i + '"]'));
    const gemScale = [1.1, .95, .95];
    const v = new THREE.Vector3(), vTop = new THREE.Vector3(), vBottom = new THREE.Vector3(), up = new THREE.Vector3(0, .8, 0);
    let width = 1, height = 1;
    function placeGems() {
      anchors.forEach((anchor, i) => {
        const slot = gemSlots[i]; if (!slot) return;
        anchor.getWorldPosition(v);
        vTop.copy(v).add(up).project(camera);
        vBottom.copy(v).sub(up).project(camera);
        v.project(camera);
        const x = (v.x + 1) / 2 * width, y = (1 - v.y) / 2 * height;
        const hPx = Math.abs(vTop.y - vBottom.y) / 2 * height * 1.3 * gemScale[i];
        const wPx = hPx * .86;
        const size = Math.round(wPx) + 'px';
        if (slot.style.width !== size) { slot.style.width = size; slot.style.height = Math.round(hPx) + 'px'; }
        slot.style.transform = 'translate3d(' + (x - wPx / 2).toFixed(1) + 'px,' + (y - hPx / 2).toFixed(1) + 'px,0)';
      });
    }

    let contextLost = false, animationTime = 0, frame = 0, visible = true, last = 0;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = media.matches;
    const fineHover = matchMedia('(hover: hover) and (pointer: fine)');
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const minFrame = calm || small ? 32 : 15;
    const button = host.querySelector('[data-scene-toggle]');
    function syncButton() {
      host.closest('.is-ranking')?.classList.toggle('ranking-motion-paused', paused);
      host.dispatchEvent(new CustomEvent('sg:ranking-motion', { bubbles: true, detail: { paused } }));
      if (button) { button.textContent = paused ? 'Reproduzir animação' : 'Pausar animação'; button.setAttribute('aria-pressed', String(paused)); }
    }
    function floatGems(time) {
      anchors.forEach((anchor, i) => { anchor.position.y = heights[i] + 1.12 + (paused ? 0 : Math.sin(time * 1.3 + i * 1.7) * .12); });
    }
    function pose(time, dt) {
      const reveal = paused ? 1 : Math.min(1, time / 1.2);
      timeUniforms.forEach(u => { u.value = time; });
      floatGems(time);
      anchors.forEach((anchor, i) => {
        gemGlows[i].position.y = anchor.position.y;
        gemGlows[i].material.opacity = (.24 + (1 + Math.sin(time * 1.6 + i)) * .05) * reveal;
      });
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5); pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);
      camera.position.set(camBase.x + Math.sin(time * .11) * .45 + pointer.x * .5, camBase.y + Math.sin(time * .17) * .16 - pointer.y * .25, camBase.z * camZoom);
      camera.lookAt(lookAt);
      galaxyRoot.rotation.z = -.18 + Math.sin(time * .06) * .012;
      stars.rotation.y = time * .002;
      group.rotation.y = Math.sin(time * .12) * .015;
      coreGlow[0].material.opacity = (.19 + Math.sin(time * .18) * .02) * reveal;
      placeGems();
    }
    // Time and the floating stones advance on every display frame, so the
    // crystals glide even where the galaxy itself is drawn at 30 fps.
    let lastTick = 0;
    function draw(t) {
      frame = 0;
      if (stopped || contextLost || !visible || document.hidden || paused) return;
      animationTime += Math.min(.1, Math.max(0, (t - lastTick) * .001)); lastTick = t;
      if (t - last >= minFrame) {
        if (governor.sample(t - last)) resize();
        pose(animationTime, Math.min(.1, Math.max(0, (t - last) * .001)));
        paintNebula(animationTime);
        renderer.render(scene, camera); last = t;
      } else {
        floatGems(animationTime); placeGems();
      }
      frame = requestAnimationFrame(draw);
    }
    function resume() { if (!stopped && !contextLost && !frame && visible && !document.hidden && !paused) { governor.reset(); last = lastTick = performance.now(); frame = requestAnimationFrame(draw); } }
    let camZoom = 1;
    function resize() {
      if (contextLost) return;
      const rect = host.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      width = rect.width; height = rect.height;
      const ratio = pixelRatio * governor.scale;
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false); camera.aspect = width / height;
      nebulaTarget.setSize(Math.max(1, Math.ceil(width * ratio * .35)), Math.max(1, Math.ceil(height * ratio * .35)));
      camZoom = 1 / Math.min(1, Math.max(.78, camera.aspect));
      camera.updateProjectionMatrix();
      // Nebula plane fills the frustum at its depth.
      const hNear = 2 * Math.tan(camera.fov * Math.PI / 360) * 90;
      nebula.scale.set(hNear * camera.aspect * 1.05, hNear * 1.05, 1);
      const scale = height * ratio * .5 / Math.tan(camera.fov * Math.PI / 360);
      scaleUniforms.forEach(u => { u.value = scale; });
      pose(animationTime, 0); paintNebula(animationTime, true); renderer.render(scene, camera);
    }
    function toggle() { paused = !paused; syncButton(); if (paused) { cancelAnimationFrame(frame); frame = 0; pose(animationTime, 0); paintNebula(animationTime, true); renderer.render(scene, camera); } else resume(); }
    function motion(e) { paused = e.matches; syncButton(); cancelAnimationFrame(frame); frame = 0; resize(); resume(); }
    function visibility() { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else resume(); }
    function lost(e) { e.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0; host.classList.remove('has-webgl'); }
    function move(e) {
      if (!fineHover.matches || paused) return;
      const r = host.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width - .5) * 2; pointer.ty = ((e.clientY - r.top) / r.height - .5) * 2;
    }
    function leave() { pointer.tx = 0; pointer.ty = 0; }
    const observer = new ResizeObserver(resize); observer.observe(host);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (!visible) { cancelAnimationFrame(frame); frame = 0; } else resume(); }); intersection.observe(host);
    canvas.addEventListener('webglcontextlost', lost); document.addEventListener('visibilitychange', visibility); media.addEventListener('change', motion);
    host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave);
    if (button) button.addEventListener('click', toggle);
    host.classList.add('has-webgl'); syncButton(); resize(); resume();
    cleanup = () => {
      cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', motion); canvas.removeEventListener('webglcontextlost', lost);
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave);
      if (button) button.removeEventListener('click', toggle);
      const geometries = new Set(), materials = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m)); });
      nebulaPaint.geometry.dispose(); nebulaPaint.material.dispose(); nebulaTarget.dispose();
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(texture => texture.dispose()); renderer.dispose(); host.classList.remove('has-webgl');
    };
  })().catch(() => {});
  await ready;
  return dispose;
}
