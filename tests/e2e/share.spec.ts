import { expect, test } from './fixtures';

// A v1 link created in Austin for 15:00 on Wed 7 Oct means that instant for every viewer.
for (const tz of ['America/Sao_Paulo', 'America/Chicago', 'Asia/Kolkata']) {
  test.describe(tz, () => {
    test.use({ timezoneId: tz });
    test(`v1 link shows Austin 15:00 Wed 7 Oct in ${tz}`, async ({ page }) => {
      const res = await page.goto('/s/10p00hwf');
      expect(await res?.text()).toContain('<title>15:00 in Austin · Wed 7 Oct</title>');
      await expect(page.getByText('Shared time · Wed 7 Oct 15:00 Austin')).toBeVisible();
      await expect(page.getByRole('article', { name: /^Austin, 15:00,/ })).toBeVisible();
      await page.getByRole('button', { name: 'Back to my view' }).click();
      await expect(page.getByRole('article')).toHaveCount(4);
    });
  });
}
