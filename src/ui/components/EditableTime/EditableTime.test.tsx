import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../test/render';
import { CardList } from '../CardList/CardList';
import { DESKTOP_BOX } from '../ZoneCard/model';

const renderCards = () => renderWithApp(<CardList box={DESKTOP_BOX} editable />);

describe('inline time edit', () => {
  it('types 1530 in São Paulo and pins 18:30Z', async () => {
    const { app, user, getByRole } = renderCards();
    await user.click(getByRole('button', { name: 'Set time in São Paulo' }));
    await user.keyboard('1530{Enter}');
    expect([app.pinned.value, app.cities.refId.value]).toEqual([
      Date.UTC(2026, 9, 7, 18, 30),
      'saopaulo',
    ]);
  });
  it('bias hint and commit for a bare hour', async () => {
    const { app, user, getByRole, findByText } = renderCards();
    await user.click(getByRole('button', { name: 'Set time in São Paulo' }));
    await user.keyboard('3');
    expect(await findByText('Read as 15:00 — type 03:00 for the other')).toBeTruthy();
    await user.keyboard('{Enter}');
    expect(app.pinned.value).toBe(Date.UTC(2026, 9, 7, 18, 0));
  });
  it('arrows nudge and Esc cancels without pinning', async () => {
    const { app, user, getByRole, findByRole } = renderCards();
    await user.click(getByRole('button', { name: 'Set time in Austin' }));
    await user.keyboard('{ArrowUp}');
    expect(app.pinned.value).toBe(Date.UTC(2026, 9, 7, 14, 30));
    await user.keyboard('{Escape}');
    expect(await findByRole('button', { name: 'Set time in Austin' })).toBeTruthy();
  });
});
