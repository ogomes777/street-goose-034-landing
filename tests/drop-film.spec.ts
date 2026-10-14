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
  const samples = await page.evaluate(async () => {
    const body = document.querySelector('.sg-drop-body')!;
    const goose = document.querySelector('.sg-drop-goose')!;
    const arm = document.querySelector('.sg-drop-arm')!;
    const result: { artwork: string; pose: string; goose: string; arm: string }[] = [];
    for (let i = 0; i < 12; i++) {
      result.push({artwork:getComputedStyle(body).backgroundImage,pose:getComputedStyle(body).backgroundPosition,goose:getComputedStyle(goose).transform,arm:getComputedStyle(arm).transform});
      await new Promise(resolve => setTimeout(resolve, 180));
    }
    return result;
  });
  expect(new Set(samples.map(sample => sample.artwork)).size).toBe(1);
  expect(new Set(samples.map(sample => sample.pose)).size).toBe(1);
  expect(new Set(samples.map(sample => sample.goose)).size).toBeGreaterThan(5);
  expect(new Set(samples.map(sample => sample.arm)).size).toBeGreaterThan(2);
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
