/* Scroll-driven video seeking without flooding the decoder. Assigning
   currentTime on every scroll frame queues seeks a phone can't finish, and the
   page stutters while the decoder catches up. Here at most one seek is in
   flight: new targets replace the pending one and are applied when the
   previous seek lands ("seeked"), and moves under ~1 frame are skipped.
   A seek that never reports back (iOS drops "seeked" when a load is
   interrupted or memory is tight) must not freeze the film: a watchdog frees
   the slot, and a reload/abort resets it, so the last target always lands.
   After a long visit iOS may also evict the decoded video entirely
   (readyState back to 0): the next seek reloads it once and lands the
   target as soon as the frames are back. */
export function createVideoScrubber(video, minStep) {
  if (!video) return function () {};
  var step = minStep || 1 / 30;
  var pending = null, busy = false, last = -1, watchdog = 0, reloading = false;
  function release() {
    busy = false;
    clearTimeout(watchdog);
    if (pending !== null) { var t = pending; pending = null; apply(t); }
  }
  function apply(t) {
    if (Math.abs(t - last) < step && Math.abs(video.currentTime - t) < step) return;
    busy = true; last = t;
    clearTimeout(watchdog);
    watchdog = setTimeout(release, 400);
    try { video.currentTime = t; } catch (e) { busy = false; clearTimeout(watchdog); }
  }
  video.addEventListener("seeked", release);
  // A new source / interrupted load cancels any seek in flight.
  ["emptied", "abort"].forEach(function (type) {
    video.addEventListener(type, function () { last = -1; release(); });
  });
  video.addEventListener("loadeddata", function () {
    if (!reloading) return;
    reloading = false; last = -1;
    if (pending !== null && !busy) { var t = pending; pending = null; apply(t); }
  });
  return function seek(t) {
    if (!isFinite(t)) return;
    // Frames evicted after the film had loaded: reload once, keep the target.
    if (video.readyState === 0 && video.getAttribute("preload") === "auto") {
      pending = t;
      if (!reloading) { reloading = true; try { video.load(); } catch (e) { reloading = false; } }
      return;
    }
    if (busy) pending = t; else apply(t);
  };
}

/* Slow connection on a large screen: drop the desktop rendition so the
   lighter mobile cut is used (same framing, a fraction of the size). Call
   before the video starts loading. Browsers that don't report the connection
   keep the HTML's media-query choice. */
export function preferLightSource(video) {
  if (!video) return false;
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  // Slow networks or genuinely modest desktop hardware get the smaller cut.
  // This is only a source choice: cinematic timing/UX stay unchanged.
  var lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 2;
  var lowCpu = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 2;
  var slow = (conn && (conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || "") || (conn.downlink > 0 && conn.downlink < 5))) || lowMemory || lowCpu;
  var desktop = video.querySelector("[data-src-desktop]");
  if (!slow || !desktop || !video.querySelector("[data-src-mobile]")) return false;
  desktop.remove();
  return true;
}
