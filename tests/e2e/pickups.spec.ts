import { expect, test } from '@playwright/test';

test('lucky nest produces a visible pickup without auto-crediting it', async ({ page }) => {
  await page.goto('/play/L1');
  await page.getByRole('button', { name: /Tổ may mắn/ }).click();
  await expect(page.getByLabel('Năng lượng hiện có')).toContainText('150');
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await expect(page.getByRole('button', { name: 'Phóng tuyết cầu' })).toBeVisible();
  await page.waitForTimeout(9000);
  await expect(page.getByText(/vật phẩm đang chờ bạn/)).toBeVisible();
  await page.screenshot({
    path: 'artifacts/visual-qa/after/lucky-nest-pickup-1440x900.png',
    fullPage: false,
  });
  await page.locator('canvas').click({ position: { x: 252, y: 319 } });
  await expect(page.getByLabel('Năng lượng hiện có')).toContainText('175');
});
