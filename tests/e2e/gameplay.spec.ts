import { expect, test } from '@playwright/test';

test('starts the slice and fires a real formula command', async ({ page }) => {
  await page.goto('/play/L1');
  await expect(page.locator('.game-hud')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await expect(page.getByRole('button', { name: 'Phóng tuyết cầu' })).toBeVisible();
  await page.getByLabel('Đường bay y = f(x)').fill('0');
  await page.getByRole('button', { name: 'Phóng tuyết cầu' }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
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
      path: `artifacts/visual-qa/after/gameplay-${viewport.width}x${viewport.height}.png`,
      fullPage: false,
    });
  }
});
