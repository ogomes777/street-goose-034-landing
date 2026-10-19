// Start media controls without waiting for React, GSAP or the catalog.
window.SG = window.SG || {};
window.SG.prefersReducedMotion = function () {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
// Carregamento paralelo: antes, intro-loader esperava o download, parse e
// execução do player. Em celulares lentos, isso atrasava os controles "Som"
// e a sincronização com o vídeo, mesmo com o MP4 iniciado no HTML.
// O loader tolera o player ainda não pronto (musicCuePending). Os dois
// módulos são independentes da inicialização do catálogo e do React.
import("./intro-loader.js")
  .catch(function (error) { console.error("Street Goose intro failed", error); });
import("./music-player.js")
  .catch(function (error) { console.error("Street Goose music failed", error); });
