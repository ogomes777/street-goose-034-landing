import { expect, test } from "@playwright/test";

test.describe("SG034 / category rail discovery and performance", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("sgIntroSeen", "1");
      sessionStorage.setItem("sgPopupSeen", "1");
    });
    await page.goto("/");
    await expect(page.locator("[data-portal-grid] .portal-card")).toHaveCount(5, { timeout: 30_000 });
  });

  test("mobile exposes another category and navigates by arrow", async ({ page }, testInfo) => {
    test.skip(!/iphone|android/i.test(testInfo.project.name), "Mobile only");
    const grid = page.locator("[data-portal-grid]");
    await grid.scrollIntoViewIfNeeded();
    await expect(page.locator("[data-portal-hint]")).toBeVisible();
    const viewportState = await grid.evaluate((el) => {
      const cards = el.querySelectorAll(".portal-card");
      return {
        overflow: el.scrollWidth > el.clientWidth + 5,
        firstCardWidth: cards[0].getBoundingClientRect().width,
        visibleWidth: el.getBoundingClientRect().width,
        left: el.scrollLeft,
      };
    });
    expect(viewportState.overflow).toBe(true);
    // The next product is discoverable without the customer guessing a swipe.
    expect(viewportState.visibleWidth - viewportState.firstCardWidth).toBeGreaterThan(24);
    await expect(page.locator("[data-portal-count]")).toHaveText("01 / 05");
    const next = page.locator("[data-portal-next]");
    await expect(next).toBeVisible();
    await next.click();
    await expect.poll(async () => grid.evaluate((el) => el.scrollLeft), { timeout: 8_000 }).toBeGreaterThan(20);
    await expect(page.locator("[data-portal-count]")).toHaveText("02 / 05", { timeout: 8_000 });
    await expect(page.locator("[data-portal-prev]")).toBeVisible();
    await next.click();
    await expect(page.locator("[data-portal-count]")).toHaveText("03 / 05", { timeout: 8_000 });
    await page.locator("[data-portal-prev]").click();
    await expect(page.locator("[data-portal-count]")).toHaveText("02 / 05", { timeout: 8_000 });
    // Swiping is independent of arrows; native horizontal scroll updates UI.
    await grid.evaluate(el => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
    await expect(page.locator("[data-portal-count]")).toHaveText("05 / 05", { timeout: 8_000 });
    await expect(next).toBeHidden();
  });

  test("desktop preserves full five-card grid", async ({ page }, testInfo) => {
    test.skip(!/desktop/i.test(testInfo.project.name), "Desktop only");
    await expect(page.locator("[data-portal-guide]")).toBeHidden();
    const grid = page.locator("[data-portal-grid]");
    await grid.scrollIntoViewIfNeeded();
    const columns = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(5);
  });

  test("only one category preview may play simultaneously", async ({ page }, testInfo) => {
    test.skip(!/desktop/i.test(testInfo.project.name), "Desktop GPU budget");
    await page.locator("[data-portal-grid]").scrollIntoViewIfNeeded();
    await expect.poll(async () => page.locator("[data-portal-grid]").evaluate(el =>
      [...el.querySelectorAll("video")].filter(v => !(v as HTMLVideoElement).paused).length
    ), { timeout: 8_000 }).toBeLessThanOrEqual(1);
  });
});
