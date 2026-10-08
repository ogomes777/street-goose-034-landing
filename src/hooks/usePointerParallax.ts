import { type RefObject, useEffect } from "react";
import { clamp, damp, getScrollProgress, lerp, normalizePointer, smoothstep } from "../lib/motionMath";

type Point = { x: number; y: number };

type MotionState = {
  pointerTarget: Point;
  head: Point;
  body: Point;
  eyewear: Point;
  pointerSpeed: number;
  pointerSpeedTarget: number;
  scrollProgress: number;
  scrollProgressTarget: number;
  scrollVelocity: number;
  scrollVelocityTarget: number;
  lastPointer: Point;
  lastPointerAt: number;
  lastTouchAt: number;
  lastScrollY: number;
  lastScrollAt: number;
};

const resetVisualVariables = (element: HTMLElement) => {
  const values: Record<string, string> = {
    "--sg-head-rx": "0deg",
    "--sg-head-ry": "0deg",
    "--sg-head-x": "0px",
    "--sg-head-y": "0px",
    "--sg-body-rx": "0deg",
    "--sg-body-ry": "0deg",
    "--sg-body-x": "0px",
    "--sg-body-y": "0px",
    "--sg-eyewear-rx": "0deg",
    "--sg-eyewear-ry": "0deg",
    "--sg-eyewear-x": "0px",
    "--sg-eyewear-y": "0px",
    "--sg-background-x": "0px",
    "--sg-background-y": "0px",
    "--sg-rear-x": "0px",
    "--sg-rear-y": "0px",
    "--sg-front-x": "0px",
    "--sg-front-y": "0px",
    "--sg-light-x": "0px",
    "--sg-light-y": "0px",
    "--sg-lens-shine": "0px",
    "--sg-lens-cool-shine": "0px",
    "--sg-lens-warm-shine": "0px",
    "--sg-speed": "0",
    "--sg-scroll-scale": "1",
    "--sg-scroll-x": "0px",
    "--sg-scroll-y": "0px",
    "--sg-scroll-z": "0px",
    "--sg-scene-opacity": "1",
  };

  Object.entries(values).forEach(([property, value]) => element.style.setProperty(property, value));
};

const addMediaListener = (query: MediaQueryList, listener: () => void) => {
  if (query.addEventListener) query.addEventListener("change", listener);
  else query.addListener(listener);
};

const removeMediaListener = (query: MediaQueryList, listener: () => void) => {
  if (query.removeEventListener) query.removeEventListener("change", listener);
  else query.removeListener(listener);
};

export function usePointerParallax(heroRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = heroRef.current;
    if (!element) return undefined;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointerQuery = window.matchMedia("(hover: none), (pointer: coarse)");
    const state: MotionState = {
      pointerTarget: { x: 0, y: 0 },
      head: { x: 0, y: 0 },
      body: { x: 0, y: 0 },
      eyewear: { x: 0, y: 0 },
      pointerSpeed: 0,
      pointerSpeedTarget: 0,
      scrollProgress: 0,
      scrollProgressTarget: 0,
      scrollVelocity: 0,
      scrollVelocityTarget: 0,
      lastPointer: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      lastPointerAt: performance.now(),
      lastTouchAt: -Infinity,
      lastScrollY: window.scrollY,
      lastScrollAt: performance.now(),
    };

    let sectionStart = 0;
    let scrollTravel = 1;
    let isVisible = false;
    let frameId = 0;
    let previousFrameAt = performance.now();
    let destroyed = false;

    const measureSection = () => {
      const rect = element.getBoundingClientRect();
      sectionStart = window.scrollY + rect.top;
      scrollTravel = Math.max(element.offsetHeight - window.innerHeight, 1);
      state.scrollProgressTarget = getScrollProgress(window.scrollY, sectionStart, scrollTravel);
    };

    const updatePointerTarget = (clientX: number, clientY: number, now: number) => {
      const next = normalizePointer(clientX, clientY, window.innerWidth, window.innerHeight);
      const elapsed = Math.max(now - state.lastPointerAt, 8);
      const distance = Math.hypot(clientX - state.lastPointer.x, clientY - state.lastPointer.y);
      state.pointerSpeedTarget = clamp((distance / elapsed) / 2.2, 0, 1);
      state.pointerTarget = next;
      state.lastPointer = { x: clientX, y: clientY };
      state.lastPointerAt = now;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isVisible || event.pointerType === "touch") return;
      updatePointerTarget(event.clientX, event.clientY, performance.now());
    };

    const onPointerLeave = () => {
      state.pointerTarget = { x: 0, y: 0 };
      state.pointerSpeedTarget = 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!isVisible || !event.touches.length) return;
      const touch = event.touches[0];
      const now = performance.now();
      state.lastTouchAt = now;
      updatePointerTarget(touch.clientX, touch.clientY, now);
    };

    const onScroll = () => {
      const now = performance.now();
      const scrollY = window.scrollY;
      const elapsed = Math.max(now - state.lastScrollAt, 8);
      state.scrollVelocityTarget = clamp((scrollY - state.lastScrollY) / elapsed / 2.4, -1, 1);
      state.scrollProgressTarget = getScrollProgress(scrollY, sectionStart, scrollTravel);
      state.lastScrollY = scrollY;
      state.lastScrollAt = now;
    };

    const writeFrame = (now: number) => {
      frameId = 0;
      if (destroyed || !isVisible || document.hidden || reducedMotionQuery.matches) return;

      const deltaSeconds = clamp((now - previousFrameAt) / 1000, 1 / 240, 0.05);
      previousFrameAt = now;

      if (now - state.lastPointerAt > 84) state.pointerSpeedTarget = 0;
      if (now - state.lastScrollAt > 84) state.scrollVelocityTarget = 0;

      state.pointerSpeed = damp(state.pointerSpeed, state.pointerSpeedTarget, 10, deltaSeconds);
      state.scrollVelocity = damp(state.scrollVelocity, state.scrollVelocityTarget, 7, deltaSeconds);
      state.scrollProgress = damp(state.scrollProgress, state.scrollProgressTarget, 12, deltaSeconds);

      const isCoarse = coarsePointerQuery.matches;
      const touchInfluence = isCoarse ? clamp(1 - (now - state.lastTouchAt) / 1400, 0, 1) : 1;
      const proceduralX = isCoarse ? Math.sin(now * 0.00042) * 0.055 + state.scrollVelocity * 0.11 : 0;
      const proceduralY = isCoarse ? Math.cos(now * 0.00031) * 0.03 + Math.abs(state.scrollVelocity) * 0.035 : 0;
      const targetX = isCoarse
        ? lerp(proceduralX, state.pointerTarget.x * 0.62, touchInfluence)
        : state.pointerTarget.x;
      const targetY = isCoarse
        ? lerp(proceduralY, state.pointerTarget.y * 0.5, touchInfluence)
        : state.pointerTarget.y;

      const entry = smoothstep(0, 0.36, state.scrollProgress);
      const exit = smoothstep(0.72, 1, state.scrollProgress);
      const controlStrength = (0.72 + entry * 0.28) * (1 - exit * 0.32);
      const followLambda = lerp(10.5, 5.4, state.pointerSpeed);

      state.head.x = damp(state.head.x, targetX * controlStrength, followLambda, deltaSeconds);
      state.head.y = damp(state.head.y, targetY * controlStrength, followLambda, deltaSeconds);
      state.body.x = damp(state.body.x, state.head.x * 0.26, 5.2, deltaSeconds);
      state.body.y = damp(state.body.y, state.head.y * 0.24, 5.2, deltaSeconds);
      state.eyewear.x = damp(state.eyewear.x, state.head.x, 16.5, deltaSeconds);
      state.eyewear.y = damp(state.eyewear.y, state.head.y, 16.5, deltaSeconds);

      const style = element.style;
      style.setProperty("--sg-head-ry", `${(state.head.x * 8).toFixed(3)}deg`);
      style.setProperty("--sg-head-rx", `${(-state.head.y * 5).toFixed(3)}deg`);
      style.setProperty("--sg-head-x", `${(state.head.x * 5).toFixed(3)}px`);
      style.setProperty("--sg-head-y", `${(state.head.y * 3).toFixed(3)}px`);
      style.setProperty("--sg-body-ry", `${(state.body.x * 8).toFixed(3)}deg`);
      style.setProperty("--sg-body-rx", `${(-state.body.y * 5).toFixed(3)}deg`);
      style.setProperty("--sg-body-x", `${(state.body.x * 6).toFixed(3)}px`);
      style.setProperty("--sg-body-y", `${(state.body.y * 4).toFixed(3)}px`);
      style.setProperty("--sg-eyewear-ry", `${(state.eyewear.x * 7.95).toFixed(3)}deg`);
      style.setProperty("--sg-eyewear-rx", `${(-state.eyewear.y * 4.95).toFixed(3)}deg`);
      style.setProperty("--sg-eyewear-x", `${(state.eyewear.x * 5.7).toFixed(3)}px`);
      style.setProperty("--sg-eyewear-y", `${(state.eyewear.y * 3.3).toFixed(3)}px`);
      style.setProperty("--sg-background-x", `${(-state.head.x * 18).toFixed(3)}px`);
      style.setProperty("--sg-background-y", `${(-state.head.y * 10).toFixed(3)}px`);
      style.setProperty("--sg-rear-x", `${(-state.head.x * 10).toFixed(3)}px`);
      style.setProperty("--sg-rear-y", `${(-state.head.y * 6).toFixed(3)}px`);
      style.setProperty("--sg-front-x", `${(state.head.x * 15).toFixed(3)}px`);
      style.setProperty("--sg-front-y", `${(state.head.y * 9).toFixed(3)}px`);
      style.setProperty("--sg-light-x", `${(state.head.x * window.innerWidth * 0.26).toFixed(2)}px`);
      style.setProperty("--sg-light-y", `${(state.head.y * window.innerHeight * 0.2).toFixed(2)}px`);
      const lensShine = state.eyewear.x * 68 + state.pointerSpeed * 10;
      style.setProperty("--sg-lens-shine", `${lensShine.toFixed(2)}px`);
      style.setProperty("--sg-lens-cool-shine", `${(-lensShine * 0.35).toFixed(2)}px`);
      style.setProperty("--sg-lens-warm-shine", `${(lensShine * 0.22).toFixed(2)}px`);
      style.setProperty("--sg-speed", state.pointerSpeed.toFixed(3));
      style.setProperty("--sg-scroll-scale", (0.94 + entry * 0.06 + exit * 0.025).toFixed(4));
      style.setProperty("--sg-scroll-x", `${(exit * 24).toFixed(2)}px`);
      style.setProperty("--sg-scroll-y", `${(-exit * 8).toFixed(2)}px`);
      style.setProperty("--sg-scroll-z", `${(exit * 70).toFixed(2)}px`);
      style.setProperty("--sg-scene-opacity", (1 - exit * 0.16).toFixed(3));

      frameId = window.requestAnimationFrame(writeFrame);
    };

    const syncFrameLoop = () => {
      const shouldRun = isVisible && !document.hidden && !reducedMotionQuery.matches;
      element.classList.toggle("is-paused", !shouldRun);
      element.classList.toggle("is-reduced", reducedMotionQuery.matches);

      if (shouldRun && !frameId) {
        previousFrameAt = performance.now();
        frameId = window.requestAnimationFrame(writeFrame);
      } else if (!shouldRun && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }

      if (reducedMotionQuery.matches) resetVisualVariables(element);
    };

    const onVisibilityChange = () => syncFrameLoop();
    const onMediaChange = () => syncFrameLoop();
    const onResize = () => {
      measureSection();
      onScroll();
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        syncFrameLoop();
      },
      { threshold: 0.01 },
    );
    const resizeObserver = new ResizeObserver(measureSection);

    measureSection();
    onScroll();
    isVisible = element.getBoundingClientRect().bottom > 0 && element.getBoundingClientRect().top < window.innerHeight;
    resetVisualVariables(element);
    intersectionObserver.observe(element);
    resizeObserver.observe(element);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    element.addEventListener("pointerleave", onPointerLeave, { passive: true });
    element.addEventListener("touchstart", onTouchMove, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    addMediaListener(reducedMotionQuery, onMediaChange);
    addMediaListener(coarsePointerQuery, onMediaChange);

    const readyFrame = window.requestAnimationFrame(() => element.classList.add("is-ready"));
    syncFrameLoop();

    return () => {
      destroyed = true;
      window.cancelAnimationFrame(readyFrame);
      if (frameId) window.cancelAnimationFrame(frameId);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      element.removeEventListener("pointerleave", onPointerLeave);
      element.removeEventListener("touchstart", onTouchMove);
      element.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      removeMediaListener(reducedMotionQuery, onMediaChange);
      removeMediaListener(coarsePointerQuery, onMediaChange);
      element.classList.remove("is-ready", "is-paused", "is-reduced");
    };
  }, [heroRef]);
}
