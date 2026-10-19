import { expect, test } from "@playwright/test";

test("Mobile: autoplay bloqueado oferece som e primeiro gesto tenta recuperar", async ({ page }) => {
  await page.addInitScript(() => {
    const originalPlay = HTMLMediaElement.prototype.play;
    (window as any).__themeAttempts = 0;
    (window as any).__allowTheme = false;
    HTMLMediaElement.prototype.play = function (...args) {
      if (this.hasAttribute("data-music-audio")) {
        (window as any).__themeAttempts++;
        if (!(window as any).__allowTheme) {
          return Promise.reject(new DOMException("Gesture required", "NotAllowedError"));
        }
        return Promise.resolve();
      }
      return originalPlay.apply(this, args);
    };
  });
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  const player = page.locator("[data-music-player]");
  await expect(player).toBeVisible({ timeout: 20000 });
  await expect(page.locator("[data-music-playpause]")).toHaveAttribute("aria-label", "Ativar som");
  const before = await page.evaluate(() => (window as any).__themeAttempts);
  await page.evaluate(() => { (window as any).__allowTheme = true; });
  await page.locator("[data-music-playpause]").click();
  await expect.poll(() => page.evaluate(() => (window as any).__themeAttempts)).toBeGreaterThan(before);
  await expect(page.locator("[data-music-player]")).toBeVisible();
});

test("Mobile: mixer suspenso reativa no primeiro toque sem exigir pause/play", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__resumes = 0;
    class AudioContextFake {
      state = "suspended";
      destination = {};
      handlers: Array<() => void> = [];
      constructor() { (window as any).__audioContextFake = this; }
      createGain() { return { gain: { value: 0 }, connect() {} }; }
      createMediaElementSource() { return { connect() {} }; }
      addEventListener(name: string, cb: () => void) { if (name === "statechange") this.handlers.push(cb); }
      resume() {
        (window as any).__resumes++;
        this.state = "running";
        this.handlers.forEach((cb) => cb());
        return Promise.resolve();
      }
      notify() { this.handlers.forEach((cb) => cb()); }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: AudioContextFake });
    HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  });
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-music-player]")).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => {
    const m = (window as any).SG.music;
    m.activateIntroSound();
    const el = document.querySelector("[data-music-audio]") as HTMLAudioElement;
    Object.defineProperty(el, "paused", { configurable: true, get() { return false; } });
    Object.defineProperty(el, "readyState", { configurable: true, get() { return 4; } });
    el.dispatchEvent(new Event("playing"));
    const context = (window as any).__audioContextFake;
    context.state = "suspended";
    context.notify();
  });
  await expect(page.locator("[data-music-playpause]")).toHaveAttribute("aria-label", "Ativar som");
  const before = await page.evaluate(() => (window as any).__resumes);
  await page.locator("[data-music-playpause]").click();
  await expect.poll(() => page.evaluate(() => (window as any).__resumes)).toBeGreaterThan(before);
});

test("Performance: trilha mobile comprimida é realmente servida", async ({ request }) => {
  const response = await request.get("/assets/street-goose-theme-mobile.mp3");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"] || "").toMatch(/audio\/mpeg|audio\/mp3|application\/octet-stream/);
  const bytes = await response.body();
  expect(bytes.length).toBeGreaterThan(100_000);
});
