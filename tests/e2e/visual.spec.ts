import { expect, test } from '@playwright/test';

test('winter battlefield keeps the game viewport and local assets visible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/play/L4');
  await expect(page.locator('.game-hud')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Đường mòn băng giá' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await expect(page.getByRole('button', { name: /Đóng băng/ })).toBeEnabled();
  await page.getByRole('button', { name: 'x^2' }).click();
  await expect(page.getByLabel('Đường bay y = f(x)')).toHaveValue('x^2');
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(900);
  await page.screenshot({
    path: 'artifacts/visual-qa/v3-after/responsive/winter-1440x900.png',
    fullPage: false,
  });
});
