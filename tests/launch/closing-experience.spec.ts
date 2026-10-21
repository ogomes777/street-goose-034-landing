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
    await install.click();
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
    const box = await stage.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x+box!.width*.75,box!.y+box!.height*.35);
    await expect.poll(async () => stage.evaluate(el => el.style.getPropertyValue("--sg-card-tilt-x")), {timeout:5_000}).not.toBe("");
    await page.mouse.move(0,0);
    await expect.poll(async () => stage.evaluate(el => el.style.getPropertyValue("--sg-card-tilt-x"))).toBe("");
  });
});
