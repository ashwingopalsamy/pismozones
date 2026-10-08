import { expect, test } from './fixtures';

test('best overlap moves every card', async ({ page, isMobile }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Reference city/ }).click();
  await page.getByRole('button', { name: 'Add Singapore' }).click();
  await page.keyboard.press('Escape');
  if (isMobile) await page.getByRole('button', { name: 'Plan' }).click();
  await page.getByRole('button', { name: /Jump to best overlap/ }).click();
  if (isMobile) await page.getByRole('button', { name: 'Zones' }).click();
  await expect(page.getByRole('article', { name: /^São Paulo, 11:00, Today/ })).toBeVisible();
});
