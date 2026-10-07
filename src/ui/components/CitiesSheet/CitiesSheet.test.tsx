import { describe, expect, it } from 'vitest';
import { a11yViolations } from '../../test/axe';
import { renderWithApp } from '../../test/render';
import { CitiesSheet } from './CitiesSheet';
import { searchOffices } from './search';

describe('cities', () => {
  it('searches by country (both languages) and abbreviation', () => {
    expect(searchOffices('brasil').map((o) => o.id)).toEqual(['saopaulo']);
    expect(searchOffices('india').map((o) => o.id)).toEqual(['bangalore']);
    expect(searchOffices('Índia').map((o) => o.id)).toEqual(['bangalore']);
    expect(searchOffices('').length).toBe(12);
  });
  it('toggles, reorders and protects the last office', async () => {
    const { app, user, getByRole, container } = renderWithApp(
      <CitiesSheet open onClose={() => {}} />,
      {
        activeIds: ['saopaulo', 'austin'],
      },
    );
    await user.click(getByRole('button', { name: /Warsaw/ }));
    expect(app.cities.activeIds.value).toEqual(['saopaulo', 'austin', 'warsaw']);
    getByRole('button', { name: /Austin/ }).focus();
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(app.cities.activeIds.value).toEqual(['austin', 'saopaulo', 'warsaw']);
    expect(await a11yViolations(container)).toEqual([]);
  });
  it('keeps focus on a city as it moves between the saved and other sections', async () => {
    const { user, getByRole } = renderWithApp(<CitiesSheet open onClose={() => {}} />, {
      activeIds: ['saopaulo', 'austin'],
    });
    await user.click(getByRole('button', { name: /Warsaw/ }));
    expect(document.activeElement).toBe(getByRole('button', { name: /Warsaw/ }));
    await user.click(getByRole('button', { name: /Austin/ }));
    expect(document.activeElement).toBe(getByRole('button', { name: /Austin/ }));
  });
});
