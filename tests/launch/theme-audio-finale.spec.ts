import {test, expect} from "@playwright/test";

test.describe("SG034 | Light Drop List, Sound Dock and responsive optical finale", () => {
  test.beforeEach(async ({page}) => {
    await page.addInitScript(() => {
      try {sessionStorage.setItem("sgIntroSeen","1");} catch {}
    });
    await page.goto("/", {waitUntil:"domcontentloaded"});
    await expect.poll(() => page.evaluate(() =>
      typeof (window as typeof window & {SG?:{theme?:{set:(x:string)=>void}}}).SG?.theme?.set
    ), {timeout:20000}).toBe("function");
  });

  test("Drop List title and form have readable contrast in BOTH themes", async ({page}) => {
    const read = async () => page.locator(".newsletter").evaluate(node => {
      const sec=node as HTMLElement, title=sec.querySelector("h2")!, input=sec.querySelector("input[type=email]")!;
      return {color:getComputedStyle(title).color,bg:getComputedStyle(sec).backgroundImage,
        inputColor:getComputedStyle(input).color,inputBg:getComputedStyle(input).backgroundColor,
        inputBorder:getComputedStyle(input).borderTopColor};
    });
    const dark=await read();
    expect(dark.color).toMatch(/rgb\(24[0-9], 24[0-9], 23[0-9]\)/);
    await page.evaluate(() => (window as any).SG.theme.set("light"));
    await expect(page.locator("html")).toHaveAttribute("data-theme","light");
    const light=await read();
    expect(light.color).toBe("rgb(29, 32, 31)");
    expect(light.inputColor).toBe("rgb(23, 27, 28)");
    expect(light.inputBg).toBe("rgb(255, 252, 246)");
    expect(light.bg).not.toBe(dark.bg);
    expect(light.inputBg).not.toBe(dark.inputBg);
    await page.evaluate(() => (window as any).SG.theme.set("dark"));
    expect((await read()).color).toBe(dark.color);
  });

  test("Sound Dock stays compact and mute remains keyboard/touch accessible", async ({page}) => {
    const dock=page.locator("[data-music-player]");
    await expect(dock).toBeVisible({timeout:20_000});
    const panel=dock.locator("[data-music-panel]");
    const play=dock.locator("[data-music-playpause]");
    const mute=dock.locator("[data-music-mute]");
    const slider=dock.locator("[data-music-volume]");
    await expect(panel).toBeVisible();
    await expect(play).toBeVisible();
    await expect(mute).toBeVisible();
    await expect(slider).toBeVisible();
    const dimensions=await panel.evaluate(n=>{
      const bounds=n.getBoundingClientRect();
      return {width:bounds.width,right:bounds.right,height:bounds.height,viewport:innerWidth};
    });
    expect(dimensions.width).toBeLessThan(410);
    expect(dimensions.right).toBeLessThanOrEqual(dimensions.viewport+1);
    expect(dimensions.height).toBeGreaterThanOrEqual(40);
    expect(await mute.getAttribute("aria-label")).toMatch(/Mutar|Desmutar/);
    const previous=await mute.getAttribute("aria-pressed");
    await mute.evaluate((element:HTMLButtonElement)=>element.click());
    await expect(mute).toHaveAttribute("aria-pressed",previous==="true"?"false":"true");
    await expect(play).toHaveAttribute("aria-label",/Tocar|Pausar|Ativar/);
  });

  test("final-act backgrounds and copy change when switching light/dark", async ({page}) => {
    const read=()=>page.locator("[data-final-act]").evaluate(n=>{
      const title=n.querySelector("h2")!;
      return {bg:getComputedStyle(n).backgroundImage,fg:getComputedStyle(title).color};
    });
    const dark=await read();
    await page.evaluate(() => (window as any).SG.theme.set("light"));
    const light=await read();
    expect(light.bg).not.toBe(dark.bg);
    expect(light.fg).toBe("rgb(27, 29, 31)");
    await page.evaluate(()=>(window as any).SG.theme.set("dark"));
    expect((await read()).bg).toBe(dark.bg);
  });

  test("Safari tab restore retains the final act and interactive controls", async ({page}) => {
    const messages:string[]=[];
    page.on("pageerror",e=>messages.push(e.message));
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}));
      window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}));
    });
    await expect(page.locator("[data-final-act-product]")).toHaveCount(1);
    await expect(page.locator("[data-music-playpause]")).toBeVisible({timeout:15000});
    expect(messages).toEqual([]);
  });
});
