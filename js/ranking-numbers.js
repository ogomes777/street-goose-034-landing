/* Animate toward actual server values once on entry; never changes XP state. */
export function mountRankingNumbers(root) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const frames = new Set(), targets = new Set();
  const finish = node => { node.textContent = Number(node.dataset.rankValue).toLocaleString('pt-BR'); targets.delete(node); };
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const node = entry.target; observer.unobserve(node);
    if (media.matches || root.closest('.ranking-motion-paused')) { finish(node); return; }
    const value = Number(node.dataset.rankValue), start = performance.now();
    targets.add(node);
    function tick(now) {
      const pct = Math.min(1, (now - start) / 850);
      if (!node.isConnected || !targets.has(node)) return;
      node.textContent = Math.round(value * (1 - Math.pow(1 - pct, 3))).toLocaleString('pt-BR');
      if (pct < 1) { const id = requestAnimationFrame(t => { frames.delete(id); tick(t); }); frames.add(id); } else finish(node);
    }
    tick(start);
  }), { threshold: .5 });
  root.querySelectorAll('[data-rank-value]').forEach(node => observer.observe(node));
  function stop() { frames.forEach(cancelAnimationFrame); frames.clear(); targets.forEach(finish); }
  const page = root.closest('.is-ranking');
  function motion(e) { if (e.detail.paused) stop(); }
  function preference(e) { if (e.matches) stop(); }
  page?.addEventListener('sg:ranking-motion', motion); media.addEventListener('change', preference);
  return () => { observer.disconnect(); stop(); page?.removeEventListener('sg:ranking-motion', motion); media.removeEventListener('change', preference); };
}
