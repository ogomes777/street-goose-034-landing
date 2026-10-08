import { expect, test } from "@playwright/test";

const readMotion = async (page: import("@playwright/test").Page) =>
  page.locator("[data-character-hero]").evaluate((element) => {
    const value = (name: string) => Number.parseFloat((element as HTMLElement).style.getPropertyValue(name)) || 0;
    return {
      headX: value("--sg-head-ry"),
      headY: value("--sg-head-rx"),
      bodyX: value("--sg-body-ry"),
      eyewearX: value("--sg-eyewear-ry"),
      scale: value("--sg-scroll-scale"),
    };
  });

const showInteractiveHero = async (page: import("@playwright/test").Page) => {
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const section = document.querySelector<HTMLElement>("[data-character-hero]");
    if (section) window.scrollTo(0, section.offsetTop);
  });
  await page.waitForFunction(() => {
    const section = document.querySelector<HTMLElement>("[data-character-hero]");
    if (!section) return false;
    const rect = section.getBoundingClientRect();
    return rect.top <= 1 && rect.bottom >= window.innerHeight;
  });
};

test("restores the original film carousel before the interactive hero", async ({ page }) => {
  const errors: string[] = [];
  const failedResponses: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()}:${response.url()}`);
  });
  await page.goto("/");

  const filmHero = page.locator("[data-hero]");
  const interactiveHero = page.locator("[data-character-hero]");
  await expect(filmHero).toBeVisible();
  await expect(filmHero.locator("h1")).toContainText(/Seu visual.*chega antes/i);
  await page.waitForFunction(() => Boolean(document.querySelector<HTMLVideoElement>("[data-hero-video]")?.currentSrc));
  expect(await filmHero.locator("[data-hero-video]").evaluate((video: HTMLVideoElement) => video.currentSrc)).toContain(
    "hero-film",
  );
  await page.waitForFunction(() => {
    const video = document.querySelector<HTMLVideoElement>("[data-hero-video]");
    return Boolean(video && !video.paused && video.currentTime > 0.05);
  });
  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-hero-canvas]");
    return Boolean(canvas && canvas.width > 0 && canvas.height > 0);
  });

  const filmBox = await filmHero.boundingBox();
  const interactiveBox = await interactiveHero.boundingBox();
  expect(filmBox).not.toBeNull();
  expect(interactiveBox).not.toBeNull();
  expect(Math.abs(filmBox!.y + filmBox!.height - interactiveBox!.y)).toBeLessThan(2);

  const initialScroll = await page.evaluate(() => window.scrollY);
  await filmHero.locator("[data-next]").click();
  await expect(filmHero.locator("[data-current]")).toHaveText("02");
  await expect(filmHero.locator("h1")).toContainText(/Não é só óculos.*É presença/i);
  expect(await filmHero.locator("[data-hero-image]").getAttribute("src")).toContain("curadoria-01.webp");
  await expect.poll(() => filmHero.locator("[data-hero-image]").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);

  await filmHero.locator("[data-next]").click();
  await expect(filmHero.locator("[data-current]")).toHaveText("03");
  await expect(filmHero.locator("h1 em")).toHaveCSS("color", "rgb(255, 122, 0)");
  expect(await filmHero.locator("[data-hero-image]").getAttribute("src")).toContain("performance-run.webp");
  await expect.poll(() => filmHero.locator("[data-hero-image]").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  expect(await filmHero.evaluate((element) => (element as HTMLElement).style.getPropertyValue("--accent"))).toBe(
    "#FF7A00",
  );

  await filmHero.locator("[data-next]").click();
  await expect(filmHero.locator("[data-current]")).toHaveText("04");
  await expect(filmHero.locator("h1")).toContainText(/Menos ruído.*Mais assinatura/i);
  expect(await filmHero.locator("[data-hero-image]").getAttribute("src")).toContain("night-mode.webp");
  await expect.poll(() => filmHero.locator("[data-hero-image]").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  expect(await filmHero.evaluate((element) => (element as HTMLElement).style.getPropertyValue("--accent"))).toBe(
    "#8B5CF6",
  );
  expect(errors).toEqual([]);
  expect(failedResponses).toEqual([]);
});

test("tracks the pointer with bounded, weighted layers", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  const hero = page.locator("[data-character-hero]");
  await expect(hero).toBeVisible();
  await expect(hero).toHaveClass(/is-ready/);
  await showInteractiveHero(page);
  await expect(page.locator("[data-hero-video]")).toHaveJSProperty("paused", true);

  await page.mouse.move(1425, 450);
  await expect
    .poll(async () => {
      const motion = await readMotion(page);
      return motion.headX > 4 && motion.eyewearX > motion.headX * 0.92;
    })
    .toBe(true);
  const right = await readMotion(page);
  expect(right.headX).toBeGreaterThan(4);
  expect(right.headX).toBeLessThanOrEqual(8.01);
  expect(right.bodyX).toBeGreaterThan(0);
  expect(right.bodyX).toBeLessThan(right.headX * 0.31);
  expect(right.eyewearX).toBeGreaterThan(right.headX * 0.92);
  expect(right.eyewearX).toBeLessThanOrEqual(8.01);
  await expect(page.locator(".sg-character-scene__body-response")).toHaveCSS("transform", "none");

  await page.mouse.move(15, 450);
  await expect.poll(async () => (await readMotion(page)).headX).toBeLessThan(-4);
  const left = await readMotion(page);
  expect(left.headX).toBeLessThan(-4);
  expect(left.headX).toBeGreaterThanOrEqual(-8.01);

  await page.mouse.move(720, 8);
  await expect.poll(async () => (await readMotion(page)).headY).toBeGreaterThan(2.5);
  const up = await readMotion(page);
  expect(up.headY).toBeGreaterThan(2.5);
  expect(up.headY).toBeLessThanOrEqual(5.01);

  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("scroll response is reversible", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-character-hero]").waitFor();

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const section = document.querySelector<HTMLElement>("[data-character-hero]");
    if (section) window.scrollTo(0, section.offsetTop + (section.offsetHeight - window.innerHeight) * 0.55);
  });
  await page.waitForTimeout(420);
  expect((await readMotion(page)).scale).toBeGreaterThan(0.975);

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const section = document.querySelector<HTMLElement>("[data-character-hero]");
    if (section) window.scrollTo(0, section.offsetTop);
  });
  await page.waitForFunction(() => {
    const section = document.querySelector<HTMLElement>("[data-character-hero]");
    return Number.parseFloat(section?.style.getPropertyValue("--sg-scroll-scale") || "1") < 0.95;
  });
  expect((await readMotion(page)).scale).toBeLessThan(0.95);
});

test("reduced motion produces a static premium fallback", async ({ page }) => {
  const failedResponses: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()}:${response.url()}`);
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const filmFallback = page.locator("[data-hero-image]");
  await expect(filmFallback).toBeVisible();
  await expect.poll(() => filmFallback.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  expect(await filmFallback.getAttribute("src")).toContain("hero-poster");
  const hero = page.locator("[data-character-hero]");
  await expect(hero).toHaveClass(/is-reduced/);

  await page.mouse.move(1420, 20);
  await page.waitForTimeout(120);
  const motion = await readMotion(page);
  expect(motion.headX).toBe(0);
  expect(motion.headY).toBe(0);
  expect(motion.scale).toBe(1);
  expect(failedResponses).toEqual([]);
});

test("mobile keeps the hero legible without horizontal overflow", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4174/");

  await expect(page.locator("[data-hero] h1")).toContainText(/Seu visual.*chega antes/i);
  await page.waitForFunction(() => Boolean(document.querySelector<HTMLVideoElement>("[data-hero-video]")?.currentSrc));
  expect(await page.locator("[data-hero-video]").evaluate((video: HTMLVideoElement) => video.currentSrc)).toContain(
    "hero-film-mobile",
  );
  await showInteractiveHero(page);
  await expect(page.getByRole("heading", { name: /visão em movimento/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await expect(page.locator(".sg-character-hero__backdrop")).toHaveCSS("display", "none");
  await expect(page.locator(".sg-atmosphere__ring--tight")).toHaveCSS("display", "none");

  await context.close();
});

test("short landscape viewports keep the editorial copy in frame", async ({ browser }) => {
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 667, height: 375 },
    { width: 568, height: 320 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto("/");

    const filmHeadline = await page.locator("[data-hero] h1").boundingBox();
    expect(filmHeadline).not.toBeNull();
    expect(filmHeadline!.y).toBeGreaterThanOrEqual(0);
    expect(filmHeadline!.y + filmHeadline!.height).toBeLessThanOrEqual(viewport.height);
    const controls = await page.locator("[data-hero] .hero-controls").boundingBox();
    expect(controls).not.toBeNull();
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(viewport.height);
    await page.waitForFunction(() => Boolean(document.querySelector<HTMLVideoElement>("[data-hero-video]")?.currentSrc));
    expect(await page.locator("[data-hero-video]").evaluate((video: HTMLVideoElement) => video.currentSrc)).toContain(
      "hero-film-mobile",
    );

    await showInteractiveHero(page);
    const headline = await page.locator(".sg-character-hero__copy h1").boundingBox();
    const continuation = await page.locator(".sg-character-hero__scroll").boundingBox();
    expect(headline).not.toBeNull();
    expect(continuation).not.toBeNull();
    expect(headline!.y).toBeGreaterThanOrEqual(0);
    expect(headline!.y + headline!.height).toBeLessThanOrEqual(viewport.height);
    expect(continuation!.y + continuation!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.waitForFunction(() => Boolean(document.querySelector<HTMLVideoElement>("[data-film-video]")?.currentSrc));
    expect(await page.locator("[data-film-video]").evaluate((video: HTMLVideoElement) => video.currentSrc)).toContain(
      "film-scrub-mobile",
    );

    await context.close();
  }
});

test("scroll film chapters restore on a rapid reverse scroll", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("sgPopupSeen", "1"));
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const section = document.querySelector<HTMLElement>("[data-scroll-film]");
    if (section) window.scrollTo(0, section.offsetTop + section.offsetHeight - window.innerHeight - 2);
  });
  await expect(page.locator("[data-film-chapter]")).toHaveText("CAPÍTULO 03");

  await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>("[data-scroll-film]");
    if (section) window.scrollTo(0, section.offsetTop);
  });
  await expect(page.locator("[data-film-chapter]")).toHaveText("CAPÍTULO 01");
});

test("legacy catalogue and cart drawer integration remain intact", async ({ page }) => {
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(request.url()));
  // Keep the automatic campaign trigger from racing the explicit bag-button check.
  // The popup's automatic flow is covered by the production smoke suite.
  await page.addInitScript(() => window.sessionStorage.setItem("sgPopupSeen", "1"));

  await page.goto("/");
  await expect(page.locator(".product-card")).toHaveCount(17);
  await expect(page.locator(".shape-card")).toHaveCount(2);

  await page.locator("#colecao").scrollIntoViewIfNeeded();
  const popup = page.locator(".popup");
  const cart = page.locator("[data-cart]");
  await expect(popup).not.toHaveClass(/is-open/);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.locator(".bag-btn").click();
  await expect(cart).toHaveClass(/is-open/);
  await expect(cart).toHaveAttribute("aria-hidden", "false");
  await expect(popup).not.toHaveClass(/is-open/);
  await cart.locator("[data-close-cart].popup-close").click();
  await expect(cart).not.toHaveClass(/is-open/);
  await expect(cart).toHaveAttribute("aria-hidden", "true");
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore)).toBeLessThan(2);

  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("campaign popup remains separate from the cart drawer", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await page.waitForFunction(
    () =>
      typeof (
        window as typeof window & {
          SG?: { openCart?: () => void };
        }
      ).SG?.openCart === "function",
  );

  const triggerScroll = await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const scrollDistance = document.documentElement.scrollHeight - window.innerHeight;
    const target = scrollDistance * 0.34;
    window.scrollTo(0, target);
    return target;
  });

  const popup = page.locator("[data-popup]");
  const cart = page.locator("[data-cart]");
  await expect(popup).toHaveClass(/is-open/);
  await expect(popup).toHaveAttribute("aria-hidden", "false");
  await expect(cart).not.toHaveClass(/is-open/);

  await popup.locator("[data-close-popup].popup-close").click();
  await expect(popup).not.toHaveClass(/is-open/);
  await expect(popup).toHaveAttribute("aria-hidden", "true");
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - triggerScroll)).toBeLessThan(2);
  expect(pageErrors).toEqual([]);
});
