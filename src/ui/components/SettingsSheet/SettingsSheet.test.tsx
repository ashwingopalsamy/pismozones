import { signal } from '@preact/signals';
import { waitFor } from '@testing-library/preact';
import { expect, it, vi } from 'vitest';
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

it('offers Install app when the browser can install, and the iPhone hint otherwise', async () => {
  const available = signal<'prompt' | 'ios' | null>('prompt');
  const install = { available, prompt: vi.fn(async () => 'accepted' as const) };
  const { user, getByRole, queryByText, getByText } = renderWithApp(
    <SettingsSheet
      open
      onClose={() => {}}
      onOpenCities={() => {}}
      onOpenHolidays={() => {}}
      install={install}
    />,
  );
  await user.click(getByRole('button', { name: 'Install app' }));
  expect(install.prompt).toHaveBeenCalled();
  available.value = 'ios';
  expect(await waitFor(() => getByText('On iPhone: Share → Add to Home Screen'))).toBeTruthy();
  available.value = null;
  await waitFor(() => expect(queryByText('Install app')).toBeNull());
});
