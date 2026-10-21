import { test, expect } from "@playwright/test";

test.describe("Street Goose / experiencia final de instalacao", () => {
  test("secao de instalacao, cartao e rodape carregam sem quebrar navegacao", async ({page}) => {
    await page.goto("/", {waitUntil:"domcontentloaded"});
    await expect(page.locator(".sg-install")).toBeVisible({timeout:20_000});
    await expect(page.locator(".sg-install-pass-stage .sg-install-pass")).toBeVisible();
    await expect(page.locator(".sg-pass-window-controls i")).toHaveCount(3);
    await expect(page.locator("body > footer.sg-footer-premium")).toBeVisible();
    await expect(page.locator("body > footer a[href='/privacidade']")).toBeVisible();
    await expect(page.locator("body > footer a[href='/categoria/lupas']")).toBeVisible();
    await expect(page.locator(".sg-install .sg-steps-bell svg")).toHaveCount(1);
  });

  test("iPhone mostra tutorial de Compartilhar e registra confirmacao explicita", async ({page},testInfo) => {
    test.skip(testInfo.project.name !== "iphone-webkit", "Tutorial iOS");
    await page.goto("/", {waitUntil:"domcontentloaded"});
    const install = page.locator(".sg-install [data-install]");
    await expect(install).toBeVisible({timeout:20_000});
    // Safari has long cinematic scroll sections: exercise the accessible button's
    // click handler independently of browser-automation scroll heuristics.
    await install.evaluate((node: HTMLButtonElement) => node.click());
    const dialog = page.locator("dialog.sg-install-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Compartilhar");
    await expect(dialog).toContainText("Adicionar à Tela de Início");
    await dialog.locator("[data-guide-done]").click();
    await expect(dialog).not.toBeVisible();
    await expect(install).toBeHidden();
    await expect(page.locator(".sg-install-help")).toBeVisible();
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator(".sg-install [data-install]")).toBeHidden();
  });

  test("cartao tem toque/cursor compositado sem bloquear scroll", async ({page}) => {
    await page.goto("/", {waitUntil:"domcontentloaded"});
    const stage = page.locator(".sg-install-pass-stage");
    await expect(stage).toBeVisible({timeout:20_000});
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toHaveCSS("touch-action","pan-y");
    // Mobile headless WebKit does not deliver a desktop mouse move reliably.
    // Dispatch a PointerEvent to test the exact same handler as touch/cursor.
    await stage.evaluate(el => {
      const box = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true, pointerType: "mouse", buttons: 1,
        clientX: box.left + box.width * .75,
        clientY: box.top + box.height * .35
      }));
    });
    await expect.poll(async () => stage.evaluate(el => el.style.getPropertyValue("--sg-card-tilt-x")), {timeout:5_000}).not.toBe("");
    await stage.evaluate(el => el.dispatchEvent(new PointerEvent("pointerleave", {bubbles: true})));
    await expect.poll(async () => stage.evaluate(el => el.style.getPropertyValue("--sg-card-tilt-x"))).toBe("");
  });
  test("TikTok: explica como sair do navegador interno sem marcar app como instalado", async ({page}) => {
    await page.addInitScript(() => {
      const original = navigator.userAgent;
      Object.defineProperty(navigator, "userAgent", {configurable:true, get:() => original + " TikTok"});
    });
    await page.goto("/", {waitUntil:"domcontentloaded"});
    const install = page.locator(".sg-install [data-install]");
    await expect(install).toBeVisible({timeout:20_000});
    await install.evaluate((node: HTMLButtonElement) => node.click());
    const dialog = page.locator("dialog.sg-install-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Abra a Street no navegador");
    await expect(dialog).toContainText("Safari ou Chrome");
    await expect(dialog.locator("[data-guide-done]")).toHaveCount(0);
    await expect(dialog.locator("[data-guide-copy]")).toHaveCount(1);
    await dialog.locator("[data-guide-later]").click();
    await expect(install).toBeVisible();
  });

  test("cartao 034 tem aspecto de cartao fisico nos celulares", async ({page}) => {
    await page.setViewportSize({width:375,height:812});
    await page.goto("/", {waitUntil:"domcontentloaded"});
    const card = page.locator(".sg-install-pass");
    await expect(card).toBeVisible({timeout:20_000});
    const result = await card.evaluate(el => {
      const rect = el as HTMLElement;
      const style = getComputedStyle(rect);
      return {
        ratio: rect.offsetWidth / rect.offsetHeight,
        width: rect.offsetWidth,
        height: rect.offsetHeight,
        aspect: style.aspectRatio,
        minHeight: parseFloat(style.minHeight) || 0,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    expect(result.ratio).toBeGreaterThan(1.5);
    expect(result.ratio).toBeLessThan(1.68);
    expect(result.width).toBeGreaterThan(250);
    expect(result.height).toBeLessThan(240);
    expect(result.minHeight).toBe(0);
    expect(result.overflowX).toBeLessThanOrEqual(1);
  });

  test("whatsapp concierge e quadrados mantem hierarquia e usabilidade", async ({page}) => {
    await page.goto("/", {waitUntil:"domcontentloaded"});
    const panel = page.locator(".payment-whatsapp");
    await expect(panel.locator("[data-whatsapp-cta]")).toBeVisible({timeout:20_000});
    await expect(panel.locator(".payment-whatsapp-overline")).toContainText("CONCIERGE");
    await expect(page.locator("#top .trust-strip > div")).toHaveCount(4);
    await expect(page.locator("#top .trust-strip .trust-icon")).toHaveCount(4);
    await expect(page.locator("[data-newsletter-canvas]")).toHaveCount(1);
    const waLink = await panel.locator("[data-whatsapp-cta]").getAttribute("href");
    expect(waLink).toMatch(/^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//);
  });

});
