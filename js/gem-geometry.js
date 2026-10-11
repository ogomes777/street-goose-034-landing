export function createGemGeometry(THREE, gem, size = 1) {
  const profile = [new THREE.Vector2(0, -.85 * size), new THREE.Vector2(size * .85, -.12 * size), new THREE.Vector2(size, .12 * size), new THREE.Vector2(size * .62, .53 * size), new THREE.Vector2(0, .78 * size)];
  return new THREE.LatheGeometry(profile, gem.sides);
}
export function createGemMaterial(THREE, color) {
  const shade = new THREE.Color(color).convertSRGBToLinear();
  return new THREE.MeshPhysicalMaterial({ color: shade, metalness: .38, roughness: .1, clearcoat: 1, clearcoatRoughness: .04, emissive: shade, emissiveIntensity: .22, flatShading: true });
}
