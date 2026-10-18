import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createVideoScrubber } from "../../js/video-scrub.js";

type Listener = () => void;

function fakeVideo() {
  const listeners: Record<string, Listener[]> = {};
  const seeks: number[] = [];
  let time = 0;
  return {
    seeks,
    addEventListener(type: string, fn: Listener) {
      (listeners[type] ||= []).push(fn);
    },
    fire(type: string) {
      (listeners[type] || []).forEach((fn) => fn());
    },
    get currentTime() {
      return time;
    },
    set currentTime(t: number) {
      time = t;
      seeks.push(t);
    },
  };
}

describe("createVideoScrubber", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("keeps one seek in flight and lands the latest target", () => {
    const video = fakeVideo();
    const seek = createVideoScrubber(video);
    seek(1);
    seek(2);
    seek(3);
    expect(video.seeks).toEqual([1]);
    video.fire("seeked");
    expect(video.seeks).toEqual([1, 3]);
  });

  it("does not freeze when the browser never reports the seek", () => {
    const video = fakeVideo();
    const seek = createVideoScrubber(video);
    seek(1);
    seek(2.5);
    vi.advanceTimersByTime(450);
    expect(video.seeks).toEqual([1, 2.5]);
  });

  it("re-seeks after the source is reset, even to the same time", () => {
    const video = fakeVideo();
    const seek = createVideoScrubber(video);
    seek(1);
    video.fire("seeked");
    video.currentTime = 0; // a reload rewinds the element
    video.seeks.length = 0;
    video.fire("emptied");
    seek(1);
    expect(video.seeks).toEqual([1]);
  });

  it("skips moves smaller than a frame", () => {
    const video = fakeVideo();
    const seek = createVideoScrubber(video);
    seek(1);
    video.fire("seeked");
    seek(1.01);
    expect(video.seeks).toEqual([1]);
  });
});

describe("createVideoScrubber after the browser evicts the video", () => {
  it("reloads once and lands the latest target when frames are back", () => {
    let readyState = 4;
    let loads = 0;
    const listeners: Record<string, (() => void)[]> = {};
    const seeks: number[] = [];
    const video = {
      get readyState() { return readyState; },
      getAttribute: (name: string) => (name === "preload" ? "auto" : null),
      load() { loads++; },
      addEventListener(type: string, fn: () => void) { (listeners[type] ||= []).push(fn); },
      currentTime: 0,
    };
    Object.defineProperty(video, "currentTime", { get: () => 0, set: (t: number) => { seeks.push(t); } });
    const seek = createVideoScrubber(video);
    readyState = 0;
    seek(1);
    seek(2);
    expect(loads).toBe(1);
    expect(seeks).toEqual([]);
    readyState = 4;
    (listeners.loadeddata || []).forEach((fn) => fn());
    expect(seeks).toEqual([2]);
  });
});
