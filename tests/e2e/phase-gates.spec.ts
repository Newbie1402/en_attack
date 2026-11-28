import { expect, test } from '@playwright/test';

test('economy shop charges only accepted placements', async ({ page }) => {
  await page.goto('/play/L1');
  await page.getByRole('button', { name: /Én tuyết/ }).click();
  await expect(page.getByLabel('Năng lượng hiện có')).toContainText('200');
  await expect(page.getByRole('button', { name: 'Hủy thao tác' })).toBeVisible();
  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 260, y: 210 } });
  await expect(page.getByLabel('Năng lượng hiện có')).toContainText('100');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'artifacts/visual-qa/v3-after/placement/placement-1440x900.png',
    fullPage: false,
  });
  await page.locator('.unit-card').nth(3).click();
  await expect(page.getByLabel('Năng lượng hiện có')).toContainText('100');
  await canvas.click({ position: { x: 260, y: 270 } });
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
  await expect(page.getByRole('button', { name: 'Áp dụng công thức' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('boss level exposes its tactical route', async ({ page }) => {
  await page.goto('/play/L6');
  await expect(page.getByRole('heading', { name: 'Hộ vệ băng giá' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await expect(page.getByRole('button', { name: /Đóng băng/ })).toBeEnabled();
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('mixed defense wave renders the enemy strategy battlefield', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/play/L3');
  await page.getByLabel('Đường bay y = f(x)').fill('0');
  await page.getByRole('button', { name: 'Gắn công thức' }).click();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await page.waitForTimeout(4200);
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({
    path: 'artifacts/visual-qa/v3-after/enemy-mechanics/l3-defenses-1440x900.png',
    fullPage: false,
  });
});
