// Start media controls without waiting for React, GSAP or the catalog.
window.SG = window.SG || {};
window.SG.prefersReducedMotion = function () {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
await import("./music-player.js");
await import("./intro-loader.js");
