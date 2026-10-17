/* Scroll-driven video seeking without flooding the decoder. Assigning
   currentTime on every scroll frame queues seeks a phone can't finish, and the
   page stutters while the decoder catches up. Here at most one seek is in
   flight: new targets replace the pending one and are applied when the
   previous seek lands ("seeked"), and moves under ~1 frame are skipped. */
export function createVideoScrubber(video, minStep) {
  if (!video) return function () {};
  var step = minStep || 1 / 30;
  var pending = null, busy = false, last = -1;
  function apply(t) {
    if (Math.abs(t - last) < step) return;
    busy = true; last = t;
    try { video.currentTime = t; } catch (e) { busy = false; }
  }
  video.addEventListener("seeked", function () {
    busy = false;
    if (pending !== null) { var t = pending; pending = null; apply(t); }
  });
  return function seek(t) {
    if (!isFinite(t)) return;
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
  var slow = conn && (conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || "") || (conn.downlink > 0 && conn.downlink < 5));
  var desktop = video.querySelector("[data-src-desktop]");
  if (!slow || !desktop || !video.querySelector("[data-src-mobile]")) return false;
  desktop.remove();
  return true;
}
