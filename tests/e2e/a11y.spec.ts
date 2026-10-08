import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const scan = (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();

for (const scheme of ['light', 'dark'] as const)
  test(`no axe violations on the main view, in settings, and in plan (${scheme})`, async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('article').first()).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);
    await page.getByRole('button', { name: 'Settings' }).first().click();
    expect((await scan(page)).violations).toEqual([]);
    await page.getByRole('button', { name: 'Close' }).click();
    if (isMobile) await page.getByRole('button', { name: 'Plan' }).click();
    expect((await scan(page)).violations).toEqual([]);
  });
