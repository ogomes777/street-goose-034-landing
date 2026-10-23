/* Microfeedback aditivo. Não interfere nas animações de transform existentes. */
const selector = '#top .hero .btn, #top .campaign .btn, #top .sgc-home .btn, #top .newsletter .btn, #top .final-act .btn, #top .sg-ranking-preview .ranking-soft-button, body > .sg-install .sg-install-actions button';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
// Recalcula medidas uma vez se a fonte chegar após as cenas existentes.
document.fonts?.ready.then(() => window.ScrollTrigger?.refresh()).catch(() => {});
// Safari BFCache and tab recovery preserve old JS objects but can change
// viewport height / sticky offsets while the page is suspended. Resync once
// after restoration; do not refresh on ordinary mobile address-bar resizing.
let sgResumeFrame = 0;
function syncCinematicTimelines() {
  if (document.hidden || sgResumeFrame) return;
  sgResumeFrame = requestAnimationFrame(() => {
    sgResumeFrame = requestAnimationFrame(() => {
      sgResumeFrame = 0;
      if (!document.hidden) window.ScrollTrigger?.refresh();
    });
  });
}
window.addEventListener("pageshow", event => {
  if (event.persisted) syncCinematicTimelines();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) syncCinematicTimelines();
});

function lift(target, active) {
  if (reduceMotion.matches || target.disabled || !window.gsap) return;
  window.gsap.to(target, {
    '--sg-polish-lift': active ? '-2px' : '0px',
    duration: active ? .24 : .32,
    ease: 'power2.out',
    overwrite: 'auto',
  });
}
document.addEventListener('pointerover', event => {
  if (!finePointer.matches) return;
  const target = event.target.closest?.(selector);
  if (target && !target.contains(event.relatedTarget)) lift(target,true);
});
document.addEventListener('pointerout', event => {
  if (!finePointer.matches) return;
  const target = event.target.closest?.(selector);
  if (target && !target.contains(event.relatedTarget) && !target.matches(':focus-visible')) lift(target,false);
});
document.addEventListener('focusin', event => {
  const target = event.target.closest?.(selector);
  if (target?.matches(':focus-visible')) lift(target,true);
});
document.addEventListener('focusout', event => {
  const target = event.target.closest?.(selector);
  if (target) lift(target,false);
});

export {};
