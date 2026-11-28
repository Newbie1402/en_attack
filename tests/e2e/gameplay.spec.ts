import { expect, test } from '@playwright/test';

test('assigns a formula and observes automatic combat', async ({ page }) => {
  await page.goto('/play/L1');
  await expect(page.locator('.game-hud')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeVisible();
  await page.getByLabel('Đường bay y = f(x)').fill('0');
  await page.getByRole('button', { name: 'Gắn công thức' }).click();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await expect(page.getByRole('button', { name: 'Áp dụng công thức' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Phóng tuyết cầu' })).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.waitForTimeout(900);
  await page.screenshot({
    path: 'artifacts/visual-qa/v3-after/auto-combat/auto-combat-1440x900.png',
    fullPage: false,
  });
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect(page.locator('.game-hud')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(viewport.height);
    await page.screenshot({
      path: `artifacts/visual-qa/v3-after/responsive/gameplay-${viewport.width}x${viewport.height}.png`,
      fullPage: false,
    });
  }
});
