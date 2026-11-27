import { expect, test } from '@playwright/test';

test('economy shop charges only accepted placements', async ({ page }) => {
  await page.goto('/play/L1');
  await page.getByRole('button', { name: /Én tuyết/ }).click();
  await expect(page.getByLabel('Năng lượng hiện có')).toContainText('100');
  await page.getByRole('button', { name: /Tổ may mắn/ }).click();
  await expect(page.getByLabel('Năng lượng hiện có')).toContainText('50');
});

test('skills become usable only while a match is running', async ({ page }) => {
  await page.goto('/play/L4');
  const slow = page.getByRole('button', { name: /Chậm/ });
  await expect(slow).toBeDisabled();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await expect(slow).toBeEnabled();
  await slow.click();
  await expect(slow).toBeDisabled();
});

test('authored waves start through the simulation clock', async ({ page }) => {
  await page.goto('/play/L1');
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await page.waitForTimeout(2500);
  await expect(page.getByRole('button', { name: 'Phóng tuyết cầu' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('boss level exposes its tactical route', async ({ page }) => {
  await page.goto('/play/L6');
  await expect(page.getByRole('heading', { name: 'Hộ vệ băng giá' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await expect(page.getByRole('button', { name: /Đóng băng/ })).toBeEnabled();
  await expect(page.locator('canvas')).toHaveCount(1);
});
