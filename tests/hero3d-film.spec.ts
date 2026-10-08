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
    // Chromium cancels superseded byte-range requests while a video is being
    // seeked. That is expected for scroll scrubbing; every other media failure
    // remains a regression.
    const supersededHero3dRange =
      request.url().includes("/assets/heroes/web/hero-3d") && failure === "net::ERR_ABORTED";
    if (!supersededHero3dRange) {
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

test("hero3d initializes with the desktop film contained and error-free", async ({ page }) => {
  const issues = watchRuntimeIssues(page);
  await suppressCampaignPopup(page);
  await page.goto("/");

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
  await suppressCampaignPopup(page);
  await page.goto("/");
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
  await suppressCampaignPopup(page);
  await page.goto("http://127.0.0.1:4174/");

  await waitForActiveHero3d(page);
  await scrollHero3dTo(page, 0.12);
  await waitForHero3dMetadata(page);

  const source = await page.locator(hero3dVideo).evaluate((video: HTMLVideoElement) => video.currentSrc);
  expect(new URL(source).pathname).toBe("/assets/heroes/web/hero-3d-mobile.mp4");
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
  await suppressCampaignPopup(page);
  await page.goto("/");

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
        compactFallback: (target as HTMLElement).offsetHeight <= window.innerHeight * 1.05,
      };
    }),
  ).toEqual({ orbitBoost: 0, hasScrubTrigger: false, compactFallback: true });

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
