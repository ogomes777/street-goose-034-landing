import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("sgIntroSeen", "1");
    sessionStorage.setItem("sgPopupSeen", "1");
  });
});

test("five category previews remain available on capable desktops", async ({ page }, info) => {
  test.skip(!/desktop/.test(info.project.name));
  await page.goto("/?perf=high");
  const rail = page.locator("[data-portal-grid]");
  await expect(rail.locator(".portal-card")).toHaveCount(5, { timeout: 30_000 });
  await rail.scrollIntoViewIfNeeded();
  await expect.poll(async () => rail.evaluate(el =>
    [...el.querySelectorAll("video source")].filter(source => source.hasAttribute("src")).length
  ), { timeout: 12_000 }).toBeGreaterThan(1);
  await expect(rail.locator(".portal-card-poster")).toHaveCount(5);
});

test("slow tier keeps catalog previews and the film poster without black sections", async ({ page }, info) => {
  test.skip(!/iphone|android/.test(info.project.name));
  await page.goto("/?perf=low");
  const rail = page.locator("[data-portal-grid]");
  await expect(rail.locator(".portal-card")).toHaveCount(5, { timeout: 30_000 });
  await rail.scrollIntoViewIfNeeded();
  await expect(rail.locator(".portal-card-video")).toHaveCount(5);
  const still = page.locator(".sg-scroll-film-recovery");
  await expect(still).toHaveAttribute("src", /film-scrub-poster/);
  await expect(still).toBeAttached();
});

test("Quartz product and cinematic poster survive returning up the page", async ({ page }, info) => {
  test.skip(!/desktop/.test(info.project.name));
  await page.goto("/?perf=high");
  const section = page.locator("[data-universe-stage]");
  await expect(section).toBeAttached({ timeout: 30_000 });
  await section.scrollIntoViewIfNeeded();
  await expect.poll(async () => section.locator("[data-universe-slot='center'] img").evaluate(img =>
    (img as HTMLImageElement).naturalWidth
  ), { timeout: 15_000 }).toBeGreaterThan(0);
  await page.evaluate(() => {
    const section = document.querySelector("[data-universe-stage]") as HTMLElement;
    window.scrollTo({ top: section.offsetTop + section.offsetHeight - innerHeight - 4, behavior: "instant" });
  });
  await expect.poll(async () => page.locator("[data-universe-count]").textContent(), { timeout: 8_000 }).toContain("07 / 07");
  await expect.poll(async () => section.locator("[data-universe-slot='center'] img").evaluate(img =>
    (img as HTMLImageElement).naturalWidth
  ), { timeout: 12_000 }).toBeGreaterThan(0);
  await page.evaluate(() => {
    const s = document.querySelector("[data-universe-stage]") as HTMLElement;
    window.scrollTo({ top: s.offsetTop + s.offsetHeight * .3, behavior: "instant" });
  });
  await expect.poll(async () => section.locator("[data-universe-slot='center'] img").evaluate(img =>
    (img as HTMLImageElement).naturalWidth
  ), { timeout: 12_000 }).toBeGreaterThan(0);
});
