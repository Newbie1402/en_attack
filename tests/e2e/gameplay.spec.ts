import { expect, test } from '@playwright/test';

test('starts the slice and fires a real formula command', async ({ page }) => {
  await page.goto('/play/L1');
  await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await expect(page.getByRole('button', { name: 'Phóng tuyết cầu' })).toBeVisible();
  await page.getByLabel('Đường bay y = f(x)').fill('0');
  await page.getByRole('button', { name: 'Phóng tuyết cầu' }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'docs/screenshots/vertical-slice-1440.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: 'docs/screenshots/vertical-slice-1280.png', fullPage: true });
});
