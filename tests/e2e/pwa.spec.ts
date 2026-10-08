import { expect, test } from './fixtures';

test('works offline after first load', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(4);
});

test('shows update prompt on new SW', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('pz:test-need-refresh')));
  await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible();
});
