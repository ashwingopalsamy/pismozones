import { test as base, expect } from '@playwright/test';

/** Every spec runs at Wed 7 Oct 2026 14:22 UTC (19:52 in the viewer's Bangalore). */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.install({ time: new Date('2026-10-07T14:22:00Z') });
    await use(page);
  },
});
export { expect };
