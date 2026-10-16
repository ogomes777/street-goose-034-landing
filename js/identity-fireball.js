/* Street Goose 034 · original Originkit Toon Fireball 2 integration.
   Uses user's actual 3D ball, steam + flame cylinders, noise textures and
   multi-level bloom. Only changes: transparent canvas, responsive sizing,
   viewport-aware lazy mount and paused offscreen animation.
   No CSS fake sphere, no black canvas background, no hijacked scroll. */
export function createIdentityFireball(host, perfTier) {
  if (!host) return null;
  const mobile = matchMedia("(max-width:720px)").matches;
  const controller = { active:false, visible:false, wake:undefined, stop:undefined };
  let started = false, destroyed = false, reactRoot = null, mountPromise = null;

  const smooth = (a,b,v) => {
    const x = Math.min(1,Math.max(0,(v-a)/(b-a)));
    return x*x*(3-2*x);
  };
  function mount() {
    if (started || destroyed || mountPromise) return mountPromise;
    mountPromise = Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./identity-fireball-originkit.tsx")
    ]).then(([React, ReactDOM, module]) => {
      if (destroyed) return;
      reactRoot = ReactDOM.createRoot(host);
      reactRoot.render(React.createElement(module.default, {
        control: controller,
        // The exact custom-style preset from the user-supplied Originkit file.
        baseColor:"#6567EA", accentColor:"#6562E0",
        speed:14, distance:5, interaction:false,
        fire:{core:"#FF0000",steam:"#FFFDFD",trail:"#0E23F3"},
        bloom:{strength:130,radius:10},
        style:{pointerEvents:"none",background:"transparent"}
      }));
      started = true;
      host.dataset.fireballRenderer = "originkit";
      host.classList.add("is-webgl");
      controller.wake?.();
    }).catch(error => {
      console.warn("[SG034] Originkit renderer unavailable, keeping transparent fallback.",error);
      host.dataset.fireballRenderer = "fallback";
    });
    return mountPromise;
  }

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        controller.visible = Boolean(entries[0]?.isIntersecting);
        if (controller.visible) mount();
        if (controller.visible && controller.active) controller.wake?.();
        else controller.stop?.();
      },{rootMargin:"120% 0px",threshold:0})
    : null;
  if (observer) observer.observe(host);
  else { controller.visible = true; mount(); }

  const visibility = () => {
    if(document.hidden) controller.stop?.();
    else if(controller.visible && controller.active) controller.wake?.();
  };
  document.addEventListener("visibilitychange",visibility);

  return {
    update(progress, warm, cobalt, boom) {
      const enter=smooth(.850,.911,progress);
      const leave=1-smooth(.966,.999,progress);
      const strength=enter*leave;
      controller.active=strength>.025;
      host.style.setProperty("--sg-fireball-visibility",strength.toFixed(3));
      host.style.setProperty("--sg-fireball-expansion",
        (1 + smooth(.919,.982,progress)*.14 + boom*.05).toFixed(3));
      if(controller.visible && controller.active) { mount(); controller.wake?.(); }
      else controller.stop?.();
    },
    destroy() {
      destroyed=true;controller.active=false;controller.stop?.();
      observer?.disconnect();
      document.removeEventListener("visibilitychange",visibility);
      if (reactRoot) reactRoot.unmount();
    }
  };
}
