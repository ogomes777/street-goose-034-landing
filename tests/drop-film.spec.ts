import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.use({ launchOptions: process.env.SG_BROWSER_PATH ? { executablePath: process.env.SG_BROWSER_PATH, args: ['--no-sandbox','--disable-dev-shm-usage'] } : {} });

async function enter(page, blocked = false) {
  if (blocked) await page.route('**/src/main.tsx', route => route.abort());
  await page.route('**/*.mp4', route => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-intro-skip]').click();
  await expect(page.locator('[data-popup]')).toHaveClass(/is-open/, { timeout: 2000 });
  await expect(page.locator('[data-popup]')).toHaveCSS('opacity','1');
}

test('entry works before the main bootstrap, the lupa navigates, and stays dismissed', async ({ page }) => {
  await enter(page, true);
  await expect(page.locator('[data-drop-film]')).toHaveClass(/is-playing/);
  if (await page.locator('[data-drop-skip]').isVisible()) await page.locator('[data-drop-skip]').click();
  await expect(page.locator('[data-drop-film]')).toHaveClass(/is-settled/);
  await page.locator('[data-drop-promotion]').first().click();
  await expect(page).toHaveURL(/\/categoria\/lupas$/);
  await expect(page.locator('[data-popup]')).not.toHaveClass(/is-open/);
  expect(await page.evaluate(() => sessionStorage.getItem('sgPopupSeen'))).toBe('1');
});

test('desktop film and real SPA promotion destination', async ({ page }) => {
  page.on('pageerror', error => console.log('PAGE ERROR:',error.message));
  await enter(page);
  await expect.poll(() => page.evaluate(() => typeof (window as any).SG_ROUTER?.navigate), {timeout:20000}).toBe('function');
  await expect(page.locator('[data-drop-film]')).toHaveAttribute('data-motion-engine', 'gsap');
  await expect(page.locator('.sg-drop-prices')).toContainText('200');
  await expect(page.locator('.sg-drop-prices')).toContainText('290');
  await expect(page.locator('.sg-drop-terms')).toContainText('Nem todos os modelos participam');
  if (await page.locator('[data-drop-skip]').isVisible()) await page.locator('[data-drop-skip]').click();
  await page.screenshot({ path: '/workspace/scratch/c7ef087aa677/drop-desktop.png' });
  await page.locator('.sg-drop-lupa').click();
  await expect(page).toHaveURL(/\/categoria\/lupas$/);
  await expect(page.locator('[data-category-page]')).toBeVisible();
});

for (const size of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
  test(`mobile ${size.width}x${size.height} preserves usable controls`, async ({ page }) => {
    await page.setViewportSize(size);
    await enter(page, true);
    await page.locator('[data-drop-skip]').click();
    const bounds = await page.locator('[data-drop-film]').boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(size.width - 20);
    expect(bounds!.height).toBeLessThanOrEqual(size.height - 20);
    await page.screenshot({ path: `/workspace/scratch/c7ef087aa677/drop-mobile-${size.width}.png` });
    await page.locator('.sg-drop-cta').click();
    await expect(page).toHaveURL(/\/categoria\/lupas$/);
  });
}

test('reduced motion presents the complete functional offer immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page, true);
  await expect(page.locator('[data-drop-film]')).toHaveClass(/is-settled/);
  expect(await page.locator('.sg-drop-lupa').evaluate(el => el.getAnimations().length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-popup]')).not.toHaveClass(/is-open/);
});

test('denied storage and economy mode still show the offer with six particles', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { value: { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } } });
    Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '2g' } });
  });
  await enter(page, true);
  await expect(page.locator('[data-drop-film]')).toHaveClass(/is-lite/);
  expect(await page.locator('[data-drop-particles] i').count()).toBe(6);
  await page.locator('[data-close-popup].popup-close').click();
  expect(await page.evaluate(() => (window as any).SG.entryPopupSettled)).toBe(true);
});

test('lead gate waits for dismissal and then releases; no simultaneous overlays', async ({ page }) => {
  await enter(page, true);
  const source = readFileSync('js/customer-onboarding.js','utf8');
  const gate = source.slice(source.indexOf('export function waitForEntryOverlays()'), source.indexOf('export async function offerCustomerOnboarding'));
  await page.evaluate(gate => {
    const wait = new Function('return (' + gate.replace('export ', '') + ')')();
    (window as any).leadReleased = false;
    wait().then(() => {
      (window as any).leadReleased = true;
      const dialog = document.createElement('dialog'); dialog.id = 'lead-gate-fixture';
      dialog.innerHTML = '<form><label>Nome completo<input name="full_name"></label><button>Salvar meu perfil</button></form>';
      document.body.append(dialog); dialog.showModal();
    });
  }, gate);
  expect(await page.evaluate(() => (window as any).leadReleased)).toBe(false);
  await page.locator('.popup-close[data-close-popup]').click();
  await expect(page.locator('#lead-gate-fixture')).toBeVisible();
  await expect(page.locator('[data-popup]')).not.toHaveClass(/is-open/);
});

test('continuous GSAP motion keeps one artwork and cleans up on natural completion', async ({ page }) => {
  await enter(page, true);
  await page.waitForFunction(() => {const tl=(document.querySelector('[data-drop-film]') as any)._dropTimeline;if(tl){tl.pause();return true;}return false;});
  const samples = await page.evaluate(async () => {
    const body = document.querySelector('.sg-drop-body')!;
    const goose = document.querySelector('.sg-drop-goose')!;
    const arm = document.querySelector('.sg-drop-arm')!;
    const result: { artwork: string; pose: string; goose: string; crouch: string }[] = [];
    const tl=(document.querySelector('[data-drop-film]') as any)._dropTimeline;
    for (let i = 0; i < 12; i++) {
      tl.seek(i*.3, false);
      result.push({artwork:getComputedStyle(body).backgroundImage,pose:getComputedStyle(body).backgroundPosition,goose:getComputedStyle(goose).transform,crouch:(document.querySelector('[data-drop-film]') as HTMLElement).dataset.crouch || '0'});

    }
    tl.play();
    return result;
  });
  expect(new Set(samples.map(sample => sample.artwork)).size).toBe(1);
  expect(new Set(samples.map(sample => sample.pose)).size).toBe(1);
  expect(new Set(samples.map(sample => sample.goose)).size).toBeGreaterThan(5);
  expect(new Set(samples.map(sample => sample.crouch)).size).toBeGreaterThan(2);
  await expect(page.locator('[data-drop-film]')).toHaveClass(/is-settled/, { timeout: 6500 });
  expect(await page.locator('.sg-drop-goose').evaluate(el => (el as HTMLElement).style.transform)).toBe('');
  expect(await page.locator('.sg-drop-lupa').evaluate(el => (el as HTMLElement).style.transform)).toBe('');
});

test('offer remains usable when GSAP cannot load', async ({ page }) => {
  await page.route('**/vendor/gsap-3.12.5.min.js', route => route.abort());
  await enter(page, true);
  await expect(page.locator('[data-drop-film]')).toHaveClass(/is-settled/);
  await expect(page.locator('.sg-drop-terms')).toBeVisible();
  await page.locator('.sg-drop-cta').click();
  await expect(page).toHaveURL(/\/categoria\/lupas$/);
});

test('knees flex before the hand releases, and headline reveals with a light sweep', async ({ page }) => {
  await enter(page, true);
  await page.waitForFunction(() => {
    const film = document.querySelector('[data-drop-film]') as any;
    if (!film._dropTimeline) return false;
    film._dropTimeline.pause(); return true;
  });
  await page.waitForFunction(() => document.querySelector('[data-drop-pose]')!.classList.contains('has-rig'));
  const states = await page.evaluate(() => {
    const film = document.querySelector('[data-drop-film]') as any;
    const lupa = document.querySelector('.sg-drop-lupa') as HTMLElement;
    const word = document.querySelector('em.sg-drop-word') as HTMLElement;
    const tl = film._dropTimeline;
    const at = (t: number) => {
      tl.seek(t, false);
      return {jump:Number(film.dataset.jump),crouch:Number(film.dataset.crouch),flight:Number(film.dataset.throw),transform:lupa.style.transform,wordTransform:word.style.transform,color:getComputedStyle(word).color,shine:word.style.getPropertyValue('--shine')};
    };
    return {start:at(.3),standing:at(.6),crouched:at(1.18),released:at(2.4),approaching:at(3.45)};
  });
  expect(states.start.wordTransform).toMatch(/112%/);
  expect(states.crouched.crouch).toBeGreaterThan(.85);
  expect(states.crouched.flight).toBe(0);
  expect(Number(states.crouched.transform.match(/scale\(([^)]+)/)![1])).toBeLessThan(.15);
  expect(states.released.jump).toBeLessThan(-10);
  expect(states.released.crouch).toBe(0);
  expect(states.released.flight).toBeGreaterThan(0);
  expect(states.approaching.flight).toBeGreaterThan(.95);
  expect(states.released.shine).not.toBe('');
  expect(states.released.color).not.toBe(states.standing.color);
  await page.locator('[data-drop-skip]').click();
  await expect(page.locator('.sg-drop-word').first()).toBeVisible();
  await page.locator('.popup-close[data-close-popup]').click();
  expect(await page.evaluate(() => (document.querySelector('[data-drop-film]') as any)._dropTimeline)).toBe(null);
});

test('loss of GPU support keeps the articulated canvas scene and valid destination', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: any, ...args: any[]) {
      if (type === 'webgl' || type === 'webgl2') return null;
      return original.call(this, type, ...args);
    } as any;
  });
  await enter(page, true);
  await expect(page.locator('[data-drop-pose]')).toHaveAttribute('data-rig-status', 'canvas');
  await page.locator('[data-drop-skip]').click();
  await page.locator('.sg-drop-lupa').click();
  await expect(page).toHaveURL(/\/categoria\/lupas$/);
});


test('portal and floating light continue after the throw, pause while hidden, and clean up on close', async ({ page }) => {
  await enter(page, true);
  await expect(page.locator('[data-drop-film]')).toHaveClass(/is-settled/, {timeout:6500});
  const read = () => page.evaluate(() => ({
    portal: (document.querySelector('.sg-drop-portal > span') as HTMLElement).style.transform,
    product: (document.querySelector('.sg-drop-product') as HTMLElement).style.transform,
    orbit: (document.querySelector('.sg-drop-product-orbit i') as HTMLElement).style.transform,
    hitbox: (document.querySelector('.sg-drop-lupa') as HTMLElement).style.transform
  }));
  const before = await read();
  await expect.poll(async () => (await read()).portal).not.toBe(before.portal);
  await expect.poll(async () => (await read()).product).not.toBe(before.product);
  await expect.poll(async () => (await read()).orbit).not.toBe(before.orbit);
  expect((await read()).hitbox).toBe('');
  const paused = await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable:true, value:true});
    document.dispatchEvent(new Event('visibilitychange'));
    return (document.querySelector('[data-drop-film]') as any)._dropAmbient.paused();
  });
  expect(paused).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable:true, value:false});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (document.querySelector('[data-drop-film]') as any)._dropAmbient)).toBe(null);
  expect(await page.evaluate(() => document.body.style.position)).toBe('');
});
