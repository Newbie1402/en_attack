import { expect, test } from '@playwright/test';

test('opens the SnowGraph menu and a playable route', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Bảo vệ tổ chim/i })).toBeVisible();
  await page.getByRole('link', { name: 'Bắt đầu bay' }).click();
  await expect(page.getByRole('heading', { name: /Chuyến bay đầu tiên/i })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
});
