/* Seven cuts, built from small faceted meshes without textures or extra loaders. */
export function createGemGeometry(THREE, gem, size = 1) {
  const vertices = [];
  function solid(outline, rings, offset = [0, 0, 0]) {
    const n = outline.length;
    const point = (ring, i) => [size * (outline[i % n][0] * ring[1] + offset[0]), size * (ring[0] + offset[1]), size * (outline[i % n][1] * ring[1] + offset[2])];
    const triangle = (a, b, c) => vertices.push(...a, ...b, ...c);
    for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < n; i++) {
      const a = point(rings[j], i), b = point(rings[j], i + 1), c = point(rings[j + 1], i), d = point(rings[j + 1], i + 1);
      triangle(a, c, b); triangle(b, c, d);
    }
    for (const [ring, reverse] of [[rings[0], true], [rings[rings.length - 1], false]]) for (let i = 0; i < n; i++) {
      const center = [offset[0] * size, (ring[0] + offset[1]) * size, offset[2] * size];
      const a = point(ring, i), b = point(ring, i + 1); triangle(center, reverse ? b : a, reverse ? a : b);
    }
  }
  const round = (n, x = 1, z = 1) => Array.from({ length: n }, (_, i) => [Math.cos(i * Math.PI * 2 / n) * x, Math.sin(i * Math.PI * 2 / n) * z]);
  switch (gem.cut) {
    case 'prism': solid(round(6, .52, .52), [[-1, .25], [-.72, 1], [.55, 1], [1.08, 0]]); break;
    case 'step': solid([[-.72,-.4],[-.48,-.64],[.48,-.64],[.72,-.4],[.72,.4],[.48,.64],[-.48,.64],[-.72,.4]], [[-.72,.35],[-.12,1],[.2,1],[.43,.83],[.58,.58]]); break;
    case 'oval': solid(round(10, .78, .53), [[-.78,0],[-.1,1],[.12,1],[.5,.62],[.62,.25]]); break;
    case 'cluster':
      solid(round(5,.36,.36), [[-.7,.7],[.35,1],[1.02,0]]);
      solid(round(5,.29,.29), [[-.7,.8],[.06,1],[.7,0]], [-.43,0,.1]);
      solid(round(5,.27,.27), [[-.7,.8],[-.04,1],[.5,0]], [.42,0,-.06]); break;
    case 'pear': solid([[0,-.9],[.5,-.32],[.64,.25],[.38,.65],[0,.78],[-.38,.65],[-.64,.25],[-.5,-.32]], [[-.7,0],[-.06,1],[.17,1],[.48,.55]]); break;
    case 'trillion': solid([[0,-.9],[.82,.48],[-.82,.48]], [[-.64,0],[-.08,1],[.13,1],[.45,.58]]); break;
    default: solid(round(12), [[-.85,0],[-.06,1],[.06,1],[.44,.62],[.49,.57]]);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals(); return geometry;
}
export function createGemMaterial(THREE, color) {
  const shade = new THREE.Color(color).convertSRGBToLinear();
  return new THREE.MeshPhysicalMaterial({ color: shade, metalness: .38, roughness: .1, clearcoat: 1, clearcoatRoughness: .04, emissive: shade, emissiveIntensity: .22, flatShading: true, side: THREE.DoubleSide });
}
