import { expect, test } from '@playwright/test';

test('campaign, sandbox and settings use real local boundaries', async ({ page }) => {
  await page.goto('/campaign');
  await expect(page.getByRole('link', { name: 'Vào màn chơi →' })).toHaveCount(1);
  await expect(page.getByText('Tổ may mắn')).toBeVisible();

  await page.goto('/sandbox');
  await expect(page.getByRole('heading', { name: 'Thử đường bay' })).toBeVisible();
  await expect(page.locator('svg')).toBeVisible();
  await page.getByLabel('y = f(x)').fill('sin(');
  await expect(page.getByRole('status')).toContainText('không hợp lệ');

  await page.goto('/settings');
  await page.getByLabel('Tắt âm thanh').check();
  await page.reload();
  await expect(page.getByLabel('Tắt âm thanh')).toBeChecked();
});
