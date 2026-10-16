import { expect, test, type Page } from "@playwright/test";

const hero3dVideo = "[data-hero3d-video]";

type RuntimeIssues = {
  badResponses: string[];
  consoleErrors: string[];
  failedRequests: string[];
  pageErrors: string[];
};

const watchRuntimeIssues = (page: Page): RuntimeIssues => {
  const issues: RuntimeIssues = {
    badResponses: [],
    consoleErrors: [],
    failedRequests: [],
    pageErrors: [],
  };

  page.on("pageerror", (error) => issues.pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") issues.consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "request failed";
    // Chromium cancels superseded media requests when switching responsive
    // sources, scrubbing, or closing a test page; these aborts are expected.
    const expectedMediaCancellation =
      failure === "net::ERR_ABORTED" && /\.(?:mp4|mp3)$/i.test(new URL(request.url()).pathname);
    if (!expectedMediaCancellation) {
      issues.failedRequests.push(`${failure}:${request.url()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) issues.badResponses.push(`${response.status()}:${response.url()}`);
  });

  return issues;
};

const suppressCampaignPopup = (page: Page) =>
  page.addInitScript(() => window.sessionStorage.setItem("sgPopupSeen", "1"));

const openWithoutIntro = async (page: Page) => {
  await suppressCampaignPopup(page);
  await page.goto("/");
  const skipIntro = page.locator("[data-intro-skip]");
  if (await skipIntro.isVisible()) await skipIntro.click();
  await page.locator("[data-intro-loader]").waitFor({ state: "hidden" });
};

const waitForActiveHero3d = (page: Page) =>
  page.waitForFunction(() => {
    const runtime = window as typeof window & {
      SG?: { hero3dOrbitBoost?: number };
      ScrollTrigger?: {
        getAll: () => Array<{ trigger?: Element; vars?: { trigger?: Element } }>;
      };
    };
    const section = document.querySelector("[data-hero3d-film]");
    const trigger = runtime.ScrollTrigger
      ?.getAll()
      .find((candidate) => candidate.trigger === section || candidate.vars?.trigger === section);

    return typeof runtime.SG?.hero3dOrbitBoost === "number" && Boolean(trigger);
  });

const scrollHero3dTo = (page: Page, progress: number) =>
  page.evaluate((targetProgress) => {
    document.documentElement.style.scrollBehavior = "auto";
    const section = document.querySelector<HTMLElement>("[data-hero3d-film]");
    if (!section) return;
    const scrollDistance = Math.max(0, section.offsetHeight - window.innerHeight);
    window.scrollTo(0, section.offsetTop + scrollDistance * targetProgress);
  }, progress);

const waitForHero3dMetadata = (page: Page) =>
  page.waitForFunction(() => {
    const video = document.querySelector<HTMLVideoElement>("[data-hero3d-video]");
    return Boolean(video && video.currentSrc && Number.isFinite(video.duration) && video.duration > 0);
  });

const currentFrameProgress = (page: Page) =>
  page.locator(hero3dVideo).evaluate((video: HTMLVideoElement) => video.currentTime / video.duration);

const expectContainedWithoutOverflow = async (page: Page) => {
  const layout = await page.locator("[data-hero3d-film]").evaluate((section) => {
    const video = section.querySelector<HTMLVideoElement>("[data-hero3d-video]")!;
    const sticky = section.querySelector<HTMLElement>(".hero3d-sticky")!;
    const videoBox = video.getBoundingClientRect();
    const stickyBox = sticky.getBoundingClientRect();
    const videoStyle = getComputedStyle(video);
    const stickyStyle = getComputedStyle(sticky);

    return {
      objectFit: videoStyle.objectFit,
      overflowX: stickyStyle.overflowX,
      overflowY: stickyStyle.overflowY,
      videoInsideSticky:
        videoBox.left >= stickyBox.left - 1 &&
        videoBox.right <= stickyBox.right + 1 &&
        videoBox.top >= stickyBox.top - 1 &&
        videoBox.bottom <= stickyBox.bottom + 1,
      withoutHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
    };
  });

  expect(layout).toEqual({
    objectFit: "contain",
    overflowX: "hidden",
    overflowY: "hidden",
    videoInsideSticky: true,
    withoutHorizontalOverflow: true,
  });
};

test("original graffiti closes the Identity Film as a scroll-driven 3D reveal", async ({ page }) => {
  const issues = watchRuntimeIssues(page);
  await openWithoutIntro(page);

  const section = page.locator("[data-hero3d-film]");
  const artwork = section.locator("[data-hero3d-graffiti-art]");
  await expect(artwork).toHaveCount(1);
  await expect(page.locator("section.sg-identity-graffiti")).toHaveCount(0);

  const placement = await artwork.evaluate((image) => {
    const wrapper = image.closest("[data-hero3d-graffiti]");
    return {
      sameSection:
        wrapper?.closest("section[data-hero3d-film]") ===
        document.querySelector("section[data-hero3d-film]"),
      immediatelyAfterVideo: wrapper?.previousElementSibling?.classList.contains("hero3d-sticky") ?? false,
      wrapperBlendMode: getComputedStyle(wrapper!).mixBlendMode,
      artBlendMode: getComputedStyle(image).mixBlendMode,
      background: getComputedStyle(wrapper!).backgroundColor,
      src: new URL((image as HTMLImageElement).src).pathname,
    };
  });
  expect(placement).toEqual({
    sameSection: true,
    immediatelyAfterVideo: true,
    wrapperBlendMode: "normal",
    artBlendMode: "luminosity",
    background: "rgba(0, 0, 0, 0)",
    src: "/brand/sg034-idvisual-cutout.webp",
  });

  await waitForActiveHero3d(page);
  await scrollHero3dTo(page, 0.82);
  await waitForHero3dMetadata(page);
  await expect.poll(() => section.locator("[data-hero3d-graffiti-drawing]").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.05);

  await scrollHero3dTo(page, 0.995);
  await expect.poll(() => section.locator("[data-hero3d-graffiti-drawing]").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
  await expect.poll(() => currentFrameProgress(page)).toBeGreaterThan(0.94);
  await expect.poll(() => artwork.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  // The source used to be RGB with an opaque black field; assert real alpha.
  const alpha = await artwork.evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    return { corner: ctx.getImageData(0, 0, 1, 1).data[3], ink: ctx.getImageData(400, 400, 1, 1).data[3] };
  });
  expect(alpha.corner).toBe(0);
  expect(alpha.ink).toBeGreaterThan(150);
  await expect.poll(() => section.locator(".hero3d-stage").evaluate(el => Number(getComputedStyle(el).opacity))).toBeLessThan(0.01);
  await expectContainedWithoutOverflow(page);

  expect(issues.pageErrors).toEqual([]);
  expect(issues.consoleErrors).toEqual([]);
  expect(issues.failedRequests).toEqual([]);
  expect(issues.badResponses).toEqual([]);
});

test("cinematic orange and cobalt impacts hand off into the product universe", async ({ page }) => {
  await openWithoutIntro(page);
  await waitForActiveHero3d(page);
  const film = page.locator("[data-hero3d-film]");
  const filmValues = () => film.evaluate((el) => {
    const css = getComputedStyle(el);
    return {
      heat: Number(css.getPropertyValue("--sg-graffiti-heat")),
      orangeImpact: Number(css.getPropertyValue("--sg-orange-impact")),
      cobalt: Number(css.getPropertyValue("--sg-graffiti-blue")),
      blueImpact: Number(css.getPropertyValue("--sg-blue-impact")),
    };
  });
  await scrollHero3dTo(page, .902);
  await expect.poll(async () => (await filmValues()).heat).toBeGreaterThan(.85);
  await expect.poll(async () => (await filmValues()).orangeImpact).toBeGreaterThan(.25);

  await scrollHero3dTo(page, .954);
  await expect.poll(async () => (await filmValues()).cobalt).toBeGreaterThan(.35);
  await expect.poll(async () => (await filmValues()).blueImpact).toBeGreaterThan(.75);

  await page.evaluate(() => {
    const universe = document.querySelector<HTMLElement>("[data-universe-stage]")!;
    window.scrollTo(0, universe.offsetTop + .02 * (universe.offsetHeight - window.innerHeight));
  });
  const bridge = page.locator(".universe-sticky");
  await expect.poll(async () => Number(await bridge.evaluate((el) => getComputedStyle(el).getPropertyValue("--sg-universe-bridge")))).toBeGreaterThan(.80);
  await page.evaluate(() => {
    const universe = document.querySelector<HTMLElement>("[data-universe-stage]")!;
    window.scrollTo(0, universe.offsetTop + .25 * (universe.offsetHeight - window.innerHeight));
  });
  await expect.poll(async () => Number(await bridge.evaluate((el) => getComputedStyle(el).getPropertyValue("--sg-universe-bridge")))).toBeLessThan(.05);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});

test("Originkit toon fireball follows Identity Film and powers down after cobalt impact", async ({ page }) => {
  await openWithoutIntro(page);
  await waitForActiveHero3d(page);
  const orb = page.locator("[data-hero3d-fireball]");
  const canvas = orb.locator("canvas");
  await expect(orb).toHaveCount(1);
  await expect(canvas).toHaveCount(1);
  await scrollHero3dTo(page, .917);
  await expect.poll(() => orb.evaluate(el =>
    Number(getComputedStyle(el).getPropertyValue("--sg-fireball-visibility")))).toBeGreaterThan(.30);
  await expect.poll(() => canvas.evaluate(el =>
    (el as HTMLCanvasElement).width)).toBeGreaterThan(50);
  await expect(orb).toHaveCSS("pointer-events", "none");
  await scrollHero3dTo(page, .999);
  await expect.poll(() => orb.evaluate(el =>
    Number(getComputedStyle(el).getPropertyValue("--sg-fireball-visibility")))).toBeLessThan(.03);
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
});

test("V5 impact pulses ignite, expand and extinguish without extra sections", async ({ page }) => {
  await openWithoutIntro(page);
  await waitForActiveHero3d(page);
  const film = page.locator("[data-hero3d-film]");
  const orb = page.locator("[data-hero3d-fireball]");
  const value = (key: string) => film.evaluate((el, key) =>
    Number(getComputedStyle(el).getPropertyValue(key)), key);
  await expect(page.locator(".hero3d-energy")).toHaveCount(3);
  await scrollHero3dTo(page,.900);
  await expect.poll(()=>value("--sg-energy-heat")).toBeGreaterThan(.7);
  await scrollHero3dTo(page,.950);
  await expect.poll(()=>orb.evaluate(el =>
    Number(getComputedStyle(el).getPropertyValue("--sg-fireball-expansion")))).toBeGreaterThan(1.1);
  await expect.poll(()=>value("--sg-energy-cobalt")).toBeGreaterThan(.7);
  await expect.poll(()=>value("--sg-energy-wave")).toBeGreaterThan(.2);
  await expect(orb).toHaveClass(/is-webgl/);
  await scrollHero3dTo(page,.999);
  await expect.poll(()=>value("--sg-energy-cobalt")).toBeLessThan(.03);
  await expect.poll(()=>orb.evaluate(el =>
    Number(getComputedStyle(el).getPropertyValue("--sg-fireball-visibility")))).toBeLessThan(.03);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1)).toBeTruthy();
});

test("hero3d initializes with the desktop film contained and error-free", async ({ page }) => {
  const issues = watchRuntimeIssues(page);
  await openWithoutIntro(page);

  await expect(page.locator("[data-hero3d-film]")).toBeAttached();
  await waitForActiveHero3d(page);
  await scrollHero3dTo(page, 0.12);
  await waitForHero3dMetadata(page);

  const source = await page.locator(hero3dVideo).evaluate((video: HTMLVideoElement) => video.currentSrc);
  expect(new URL(source).pathname).toBe("/assets/heroes/web/hero-3d.mp4");
  await expectContainedWithoutOverflow(page);

  expect(issues.pageErrors).toEqual([]);
  expect(issues.consoleErrors).toEqual([]);
  expect(issues.failedRequests).toEqual([]);
  expect(issues.badResponses).toEqual([]);
});

test("hero3d scroll progress advances and reverses currentTime", async ({ page }) => {
  await openWithoutIntro(page);
  await waitForActiveHero3d(page);

  await scrollHero3dTo(page, 0.18);
  await waitForHero3dMetadata(page);
  await expect.poll(() => currentFrameProgress(page)).toBeGreaterThan(0.1);
  const earlyFrame = await currentFrameProgress(page);

  await scrollHero3dTo(page, 0.72);
  await expect.poll(() => currentFrameProgress(page)).toBeGreaterThan(earlyFrame + 0.35);
  const forwardFrame = await currentFrameProgress(page);

  await scrollHero3dTo(page, 0.24);
  await expect.poll(() => currentFrameProgress(page)).toBeLessThan(forwardFrame - 0.25);
  const reversedFrame = await currentFrameProgress(page);

  expect(reversedFrame).toBeGreaterThan(0.12);
  expect(reversedFrame).toBeLessThan(0.4);
});

test("hero3d selects the mobile film without viewport overflow", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const issues = watchRuntimeIssues(page);
  await openWithoutIntro(page);

  await waitForActiveHero3d(page);
  await scrollHero3dTo(page, 0.12);
  await waitForHero3dMetadata(page);

  const source = await page.locator(hero3dVideo).evaluate((video: HTMLVideoElement) => video.currentSrc);
  expect(new URL(source).pathname).toBe("/assets/heroes/web/hero-3d-mobile.mp4");
  await expectContainedWithoutOverflow(page);
  const artwork = page.locator("[data-hero3d-graffiti-art]");
  const artworkFrame = page.locator("[data-hero3d-graffiti]");
  const section = page.locator("[data-hero3d-film]");
  await scrollHero3dTo(page, 0.995);
  await expect.poll(() => section.locator("[data-hero3d-graffiti-drawing]").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
  await expect.poll(() => currentFrameProgress(page)).toBeGreaterThan(0.94);
  await expect.poll(() => artwork.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(artworkFrame).toHaveCSS("touch-action", "pan-y");
  await expectContainedWithoutOverflow(page);

  expect(issues.pageErrors).toEqual([]);
  expect(issues.consoleErrors).toEqual([]);
  expect(issues.failedRequests).toEqual([]);
  expect(issues.badResponses).toEqual([]);
  await context.close();
});

test("hero3d uses a static poster frame when reduced motion is requested", async ({ page }) => {
  const issues = watchRuntimeIssues(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openWithoutIntro(page);

  const section = page.locator("[data-hero3d-film]");
  const video = page.locator(hero3dVideo);
  await expect(section).toHaveClass(/hero3d-film--static/);
  await expect(section.locator(".hero3d-sticky")).toHaveCSS("position", "relative");
  expect(new URL((await video.getAttribute("poster"))!, page.url()).pathname).toBe(
    "/assets/heroes/web/hero-3d-poster.jpg",
  );
  expect(
    await page.evaluate(() => {
      const runtime = window as typeof window & {
        SG?: { hero3dOrbitBoost?: number };
        ScrollTrigger?: { getAll: () => Array<{ trigger?: Element; vars?: { trigger?: Element } }> };
      };
      const target = document.querySelector("[data-hero3d-film]");
      return {
        orbitBoost: runtime.SG?.hero3dOrbitBoost,
        hasScrubTrigger: Boolean(
          runtime.ScrollTrigger
            ?.getAll()
            .some((candidate) => candidate.trigger === target || candidate.vars?.trigger === target),
        ),
        compactFallback:
          target.querySelector<HTMLElement>(".hero3d-sticky")!.offsetHeight <= window.innerHeight * 1.05,
        graffitiVisible: (() => {
          const art = target.querySelector<HTMLElement>("[data-hero3d-graffiti-art]");
          const drawing = target.querySelector<HTMLElement>("[data-hero3d-graffiti-drawing]");
          return Boolean(art && drawing && getComputedStyle(art).visibility === "visible" && Number(getComputedStyle(drawing).opacity) > 0.95);
        })(),
      };
    }),
  ).toEqual({ orbitBoost: 0, hasScrubTrigger: false, compactFallback: true, graffitiVisible: true });

  await section.scrollIntoViewIfNeeded();
  await waitForHero3dMetadata(page);
  await expect.poll(() => currentFrameProgress(page)).toBeGreaterThan(0.65);
  const fallbackFrame = await currentFrameProgress(page);
  expect(fallbackFrame).toBeLessThan(0.82);
  await expect(video).toHaveJSProperty("paused", true);

  await page.evaluate(() => {
    const target = document.querySelector<HTMLElement>("[data-hero3d-film]");
    if (target) window.scrollTo(0, target.offsetTop + target.offsetHeight + window.innerHeight * 0.5);
  });
  await page.waitForTimeout(250);
  expect(Math.abs((await currentFrameProgress(page)) - fallbackFrame)).toBeLessThan(0.02);

  expect(issues.pageErrors).toEqual([]);
  expect(issues.consoleErrors).toEqual([]);
  expect(issues.failedRequests).toEqual([]);
  expect(issues.badResponses).toEqual([]);
});

