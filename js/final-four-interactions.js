// Street Goose / editorial trust tiles.
// One observer for reveal, no perpetual JS loop or expensive repaint.
const strip = document.querySelector('#top .trust-strip');
if (strip) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduced.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      strip.classList.add('is-inview');
      io.disconnect();
    }, {threshold: 0.12});
    io.observe(strip);
  }
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    strip.querySelectorAll(':scope > div').forEach(tile => {
      let frame = 0, point = null;
      tile.addEventListener('pointermove', ev => {
        point = {x: ev.clientX, y: ev.clientY};
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (!point) return;
          const box = tile.getBoundingClientRect();
          if (box.width && box.height) {
            const px = Math.max(0, Math.min(100, (point.x - box.left) / box.width * 100));
            const py = Math.max(0, Math.min(100, (point.y - box.top) / box.height * 100));
            tile.style.setProperty('--sg-trust-x', px + '%');
            tile.style.setProperty('--sg-trust-y', py + '%');
          }
          point = null;
        });
      }, {passive:true});
      tile.addEventListener('pointerleave', () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0; point = null;
        tile.style.removeProperty('--sg-trust-x');
        tile.style.removeProperty('--sg-trust-y');
      }, {passive:true});
    });
  } else if (!reduced.matches) {
    strip.querySelectorAll(':scope > div').forEach(tile => {
      tile.addEventListener('pointerdown', () => {
        tile.classList.add('is-touching');
      }, {passive:true});
      for (const eventName of ['pointerup','pointercancel','pointerleave']) {
        tile.addEventListener(eventName, () => tile.classList.remove('is-touching'), {passive:true});
      }
    });
  }
}
