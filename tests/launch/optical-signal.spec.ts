import { test, expect } from "@playwright/test";

test.describe("SG 034 / Optical Signal premium", () => {
  test("quatro marcas proprietarias substituem os glifos genericos", async ({page}) => {
    await page.goto("/", {waitUntil:"domcontentloaded"});
    const strip = page.locator("#top .trust-strip");
    await expect(strip.locator(":scope > .sg-trust-tile")).toHaveCount(4);
    await expect(strip.locator(".sg-trust-mark svg")).toHaveCount(4);
    await expect(strip.locator(".sg-trust-pixels i")).toHaveCount(16);
    await expect(strip.locator(".sg-mark-034")).toContainText("034");
    await expect(strip.locator(".sg-trust-tile b")).toHaveText(["CURADORIA", "ATENDIMENTO", "EXPERIÊNCIA", "SG 034"]);
    const iconFrame = await strip.locator(".sg-trust-mark").first().evaluate(el => {
      const style = getComputedStyle(el);
      return {border:style.borderTopWidth,background:style.backgroundColor};
    });
    expect(iconFrame.border).toBe("0px");
    expect(iconFrame.background).toBe("rgba(0, 0, 0, 0)");
  });

  test("pixel respira na area visivel e sem movimentos desnecessarios fora dela", async ({page}) => {
    await page.goto("/", {waitUntil:"domcontentloaded"});
    const strip = page.locator("#top .trust-strip");
    await strip.evaluate(el => el.scrollIntoView({behavior:"instant",block:"center"}));
    await expect(strip).toHaveClass(/sg-trust-active/, {timeout:10_000});
    await expect(strip.locator(".sg-trust-pixels i").first()).toHaveCSS("animation-play-state","running");
    await page.evaluate(() => window.scrollTo({top:0,behavior:"instant"}));
    await expect(strip).not.toHaveClass(/sg-trust-active/, {timeout:10_000});
    await expect(strip.locator(".sg-trust-pixels i").first()).toHaveCSS("animation-play-state","paused");
  });

  test("newsletter e formulario nao sao encobertos pelo 3D", async ({page}) => {
    await page.goto("/", {waitUntil:"domcontentloaded"});
    const newsletter = page.locator("#top .newsletter");
    await expect(newsletter.locator("[data-newsletter-canvas]")).toHaveCount(1);
    await expect(newsletter.locator("input[type=email]")).toBeVisible();
    await expect(newsletter.locator("button[type=submit]")).toBeVisible();
    const fields = await newsletter.evaluate(section => {
      const email = section.querySelector("input[type=email]");
      const canvas = section.querySelector("[data-newsletter-canvas]");
      return {
        inputZ: getComputedStyle(email!.closest(".newsletter-form-wrap")!).zIndex,
        canvasZ: getComputedStyle(canvas!).zIndex
      };
    });
    expect(Number(fields.inputZ)).toBeGreaterThan(Number(fields.canvasZ));
  });

  test("acessibilidade respeita movimento reduzido", async ({page}) => {
    await page.emulateMedia({reducedMotion:"reduce"});
    await page.goto("/", {waitUntil:"domcontentloaded"});
    const pixels = page.locator("#top .sg-trust-pixels i");
    await expect(pixels).toHaveCount(16);
    await expect(pixels.first()).toHaveCSS("animation-name","none");
    await expect(page.locator("#top .newsletter input[type=email]")).toBeVisible();
  });
});
