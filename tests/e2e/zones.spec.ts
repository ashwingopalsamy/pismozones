import { expect, test } from './fixtures';

test('live view lists the default offices with the viewer tagged', async ({ page }) => {
  await page.goto('/');
  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /^Austin, /);
  await expect(page.getByRole('article', { name: /^Bangalore, 19:52, Today/ })).toContainText(
    'You',
  );
  await expect(page.getByText('Live', { exact: true })).toBeVisible();
});

test('command bar previews, commits, and returns to live', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Convert a time' });
  await input.fill('3pm bristol to austin');
  await expect(page.getByText('Today, Wed 7 Oct · 15:00 Bristol → 09:00 Austin')).toBeVisible();
  await input.press('Enter');
  await expect(page.getByText(/^[+−]\d/)).toBeVisible();
  await expect(page.getByRole('article', { name: /^Bristol, 15:00,/ })).toBeVisible();
  await page.getByRole('button', { name: 'Back to now' }).click();
  await expect(page.getByText('Live', { exact: true })).toBeVisible();
});

test('inline edit sets a card time', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Set time in São Paulo' }).click();
  await page.keyboard.type('1530');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('article', { name: /^São Paulo, 15:30,/ })).toBeVisible();
});

test('settings switch to 12-hour time', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).first().click();
  await page.getByRole('button', { name: '12h' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('article', { name: /^Austin, 9:22 AM/ })).toBeVisible();
});
