import { expect, test } from './fixtures';

const ALLOWED = [
  'localhost',
  '127.0.0.1',
  'static.cloudflareinsights.com',
  'cloudflareinsights.com',
];

test('no CSP violations and no unexpected third parties', async ({ page }) => {
  const bad: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) bad.push(m.text());
  });
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname;
    if (!ALLOWED.includes(host)) bad.push(host);
  });
  const res = await page.goto('/');
  expect(res?.headers()['content-security-policy']).toContain("default-src 'self'");
  await page.getByRole('textbox', { name: 'Convert a time' }).fill('3pm bristol to austin');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Settings' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(bad).toEqual([]);
});
