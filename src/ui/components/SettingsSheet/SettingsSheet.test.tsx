import { expect, it } from 'vitest';
import { a11yViolations } from '../../test/axe';
import { renderWithApp } from '../../test/render';
import { SettingsSheet } from './SettingsSheet';

it('switches to 12h and updates the preview', async () => {
  const { app, user, getByRole, container } = renderWithApp(
    <SettingsSheet open onClose={() => {}} onOpenCities={() => {}} onOpenHolidays={() => {}} />,
  );
  await user.click(getByRole('button', { name: '12h' }));
  expect(getByRole('article').getAttribute('aria-label')).toMatch(/^Bangalore, 7:52 PM,/);
  expect(app.prefs.prefs.value.hourCycle).toBe('h12');
  await user.click(getByRole('button', { name: 'Português' }));
  expect(app.prefs.lang.value).toBe('pt-BR');
  expect(await a11yViolations(container)).toEqual([]);
});
