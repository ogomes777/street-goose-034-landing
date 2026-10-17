// Start media controls without waiting for React, GSAP or the catalog.
window.SG = window.SG || {};
window.SG.prefersReducedMotion = function () {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
// No top-level await: the next module script (the app bootstrap) must not wait
// for these two files to download; they start in parallel with it.
import("./music-player.js")
  .then(function () { return import("./intro-loader.js"); })
  .catch(function (error) { console.error("Street Goose intro failed", error); });
