import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test.describe("Street Goose / clean cinematic galaxy", () => {
  test("procedural scene retains real podium but drops distracting effects", () => {
    const scene=readFileSync("js/ranking-scene.js","utf8");
    expect(scene).toContain("const GALAXY = calm ? 2800 : small ? 6300 : 14500");
    expect(scene).toContain("1.64 * Math.log(r + .55)");
    expect(scene).toContain("const stellarKnot = kind > .76 && kind < .88");
    expect(scene).toContain("const knotCenters = [1.75, 3.35, 5.05]");
    expect(scene).toContain("starForming");
    expect(scene).toContain("galaxyRoot.scale.setScalar(galBreath)");
    // Quality budget is unchanged; extra stars and additional render passes
    // would be a regression for the iPhone.
    expect(scene).not.toContain("const GALAXY = calm ? 2800 : small ? 6300 : 25000");
    expect(scene).toContain("const STARS = calm ? 95 : small ? 230 : 520");
    expect(scene).not.toContain("const planet = new THREE.Group()");
    expect(scene).not.toContain("streakStart");
    expect(scene).toContain("const group = new THREE.Group()");
    expect(scene).toContain("placeGems()");
  });

  test("ranking loads with a clean backdrop and preserved navigation", async ({page}) => {
    await page.addInitScript(() => {try { sessionStorage.setItem("sgIntroSeen","1"); } catch {}});
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto("/ranking",{waitUntil:"domcontentloaded"});
    await expect(page.locator(".ranking-page-head h1")).toContainText("Ranking Street Goose",{timeout:20_000});
    await expect(page.locator("[data-ranking-stage], .ranking-empty").first()).toBeVisible({timeout:22_000});
    const stage=page.locator("[data-ranking-stage]");
    // Ranking data is remote; if unavailable during CI, the page still
    // shows a truthful reload prompt and the CSS is checked in the fixture.
    if(await stage.count()){
      await expect(stage).toBeVisible();
      await expect(page.locator(".ranking-stage-top")).toContainText("THE 034 CONSTELLATION");
      await expect(page.locator(".ranking-stage-member")).toHaveCount(3);
      await expect(stage).toHaveCSS("background-color", /rgba?\(/);
      const before=await stage.evaluate(el=>getComputedStyle(el,"::before").display);
      expect(before).toBe("none");
    } else {
      await expect(page.locator(".ranking-empty")).toBeVisible();
    }
    expect(errors.filter(x=>/ranking-scene|webgl|cannot read properties/i.test(x))).toEqual([]);
  });

  test("fallback supplies a dark readable composition without another animation", () => {
    const css=readFileSync("js/ranking-cinematic.css","utf8");
    expect(css).toContain(".ranking-stage:not(.has-webgl)");
    expect(css).toContain(".ranking-stage-fallback{z-index:1}");
    expect(css).toContain(".ranking-stage::after{display:none");
    expect(css).not.toContain("animation:infinite");
  });

});
