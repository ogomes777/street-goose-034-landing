/* Runtime safety net. The capability tier (js/motion.js) is a guess made at
   load; this checks reality. While the visitor scrolls, it samples frame
   times in short windows. If frames stay slow (median under ~22 fps) in two
   windows, the page switches to the calm tier for the rest of the visit:
   "sg:perf-low" tells every WebGL scene to stop and show its static version.
   It never upgrades, never reloads, and stops listening after a few checks. */
(function () {
  "use strict";
  var SG = window.SG || (window.SG = {});
  if (SG.perfTier === "low" || !window.requestAnimationFrame) return;
  var SLOW_MEDIAN_MS = 45, WINDOW_MS = 2000, MAX_WINDOWS = 6;
  var sampling = false, windows = 0, strikes = 0;

  function median(list) {
    var s = list.slice().sort(function (a, b) { return a - b; });
    return s[Math.floor(s.length / 2)] || 0;
  }
  function degrade() {
    SG.perfTier = "low";
    var root = document.documentElement;
    root.classList.remove("sg-perf-high", "sg-perf-medium");
    root.classList.add("sg-perf-low");
    window.dispatchEvent(new CustomEvent("sg:perf-low"));
    stopListening();
  }
  function sample() {
    if (sampling || document.hidden) return;
    sampling = true;
    var frames = [], last = performance.now(), start = last;
    function tick(now) {
      frames.push(now - last); last = now;
      if (now - start < WINDOW_MS) { requestAnimationFrame(tick); return; }
      sampling = false; windows++;
      // Ignore windows that include a tab switch or a debugger pause.
      var usable = frames.slice(1).filter(function (d) { return d < 1000; });
      if (usable.length >= 12 && median(usable) > SLOW_MEDIAN_MS) strikes++;
      else strikes = 0;
      if (strikes >= 2) degrade();
      else if (windows >= MAX_WINDOWS) stopListening();
    }
    requestAnimationFrame(tick);
  }
  function stopListening() {
    window.removeEventListener("scroll", sample, { passive: true });
    window.removeEventListener("touchmove", sample, { passive: true });
  }
  window.addEventListener("scroll", sample, { passive: true });
  window.addEventListener("touchmove", sample, { passive: true });

  // Known weak GPUs: read the renderer once, in idle time, and release it.
  function probeGpu() {
    if (SG.perfTier === "low") return;
    try {
      var c = document.createElement("canvas");
      var gl = c.getContext("webgl") || c.getContext("experimental-webgl");
      if (!gl) { degrade(); return; }
      var dbg = gl.getExtension("WEBGL_debug_renderer_info");
      var gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "") : "";
      var lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
      SG.gpu = gpu;
      if (/Mali-(4|T6|T7|G31|G51|G52)|Adreno \(TM\) ?[345]\d\d|PowerVR|SGX|Vivante|VideoCore/i.test(gpu)) degrade();
    } catch (e) { degrade(); }
  }
  if ("requestIdleCallback" in window) requestIdleCallback(probeGpu, { timeout: 4000 });
  else setTimeout(probeGpu, 2500);
})();

export {};
