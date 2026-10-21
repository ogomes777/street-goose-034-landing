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

  test("observador inicia e suspende pixels conforme visibilidade", async ({page}) => {
    // Exercise the same observer callback as IntersectionObserver, without
    // relying on page scrolling while the cinematic intro/popups own scroll.
    await page.addInitScript(() => {
      const NativeObserver = window.IntersectionObserver;
      const env = window as typeof window & { __sgSignalTest?: (visible:boolean) => void };
      window.IntersectionObserver = class extends NativeObserver {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          super(callback, options);
          if (options?.rootMargin === "70px 0px 70px 0px") {
            env.__sgSignalTest = (visible:boolean) => callback(
              [{isIntersecting:visible, intersectionRatio:visible?1:0} as IntersectionObserverEntry],
              this
            );
          }
        }
      };
    });
    await page.goto("/", {waitUntil:"domcontentloaded"});
    const strip = page.locator("#top .trust-strip");
    await expect.poll(() => page.evaluate(
      () => typeof (window as typeof window & { __sgSignalTest?: (v:boolean) => void }).__sgSignalTest
    ), {timeout:15_000}).toBe("function");
    await page.evaluate(() => (window as typeof window & { __sgSignalTest:(v:boolean)=>void }).__sgSignalTest(true));
    await expect(strip).toHaveClass(/sg-trust-active/);
    await expect(strip.locator(".sg-trust-pixels i").first()).toHaveCSS("animation-play-state","running");
    await page.evaluate(() => (window as typeof window & { __sgSignalTest:(v:boolean)=>void }).__sgSignalTest(false));
    await expect(strip).not.toHaveClass(/sg-trust-active/);
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
