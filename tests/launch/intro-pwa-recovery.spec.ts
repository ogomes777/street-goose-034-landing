import {test,expect} from "@playwright/test";

// iOS WebKit, Android Chromium and desktop. Do not require external logins.
test.describe("Street Goose intro + som depois do login/PWA", () => {
  test("intro tocada uma vez na sessao nao reinicia ao voltar do login", async ({page}) => {
    await page.goto("/", {waitUntil:"domcontentloaded"});
    const skip = page.locator("[data-intro-skip]");
    await skip.evaluate((el:HTMLButtonElement) => el.click());
    await expect(page.locator("[data-intro-loader]")).toBeHidden({timeout:12_000});
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem("sgIntroSeen"))).toBe("1");
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator("[data-intro-loader]")).toBeHidden({timeout:12_000});
    const state = await page.evaluate(() => ({
      introComplete:(window as any).SG?.introComplete,
      videoPreload:(document.querySelector("[data-intro-video]") as HTMLVideoElement).preload,
      playingSources:document.querySelectorAll("[data-intro-video] source").length,
      bodyLocked:document.body.style.position==="fixed",
    }));
    expect(state.introComplete).toBe(true);
    expect(state.playingSources).toBe(0);
    expect(state.bodyLocked).toBe(false);
  });

  test("restauração da aba Safari (BFCache) não dispara reload", async ({page}) => {
    await page.addInitScript(() => sessionStorage.setItem("sgIntroSeen","1"));
    await page.goto("/", {waitUntil:"domcontentloaded"});
    await page.evaluate(() => {
      (window as any).__sgBfcacheMarker = "keep-this-document";
      window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}));
    });
    await page.waitForTimeout(500);
    await expect.poll(() => page.evaluate(() => (window as any).__sgBfcacheMarker)).toBe("keep-this-document");
    await expect(page.locator("[data-intro-loader]")).toBeHidden();
  });

  test("PWA iPhone em modo de economia oferece toque para reproduzir a intro", async ({page}) => {
    await page.addInitScript(() => {
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        if (this.hasAttribute("data-intro-video")) {
          return Promise.reject(new DOMException("Autoplay blocked","NotAllowedError"));
        }
        return original.apply(this,args);
      };
    });
    await page.goto("/", {waitUntil:"domcontentloaded"});
    await expect(page.locator("[data-intro-loader]")).toBeVisible();
    const sound = page.locator("[data-intro-sound]");
    await expect(sound).toContainText("Tocar abertura", {timeout:22_000});
    await expect(sound).toBeVisible();
    // If the user refuses, the intro remains safely skippable.
    await page.locator("[data-intro-skip]").evaluate((el:HTMLButtonElement)=>el.click());
    await expect(page.locator("[data-intro-loader]")).toBeHidden({timeout:12_000});
    await expect(page.locator("[data-music-player]")).toBeVisible({timeout:20_000});
  });
});
