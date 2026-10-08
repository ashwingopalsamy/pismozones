import { fireEvent } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../test/render';
import { CardList } from '../CardList/CardList';

const renderCards = () => renderWithApp(<CardList layout="desktop" editable />);

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
  it('Enter and Esc hand focus back to the card’s time button', async () => {
    const { user, getByRole } = renderCards();
    const button = () => getByRole('button', { name: 'Set time in Austin' });
    await user.click(button());
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(button());
    await user.click(button());
    await user.keyboard('1000{Enter}');
    expect(document.activeElement).toBe(button());
  });
  it('PgUp, PgDn and Tomorrow step civil days in the card’s zone across DST', async () => {
    const { app, user, getByRole } = renderWithApp(<CardList layout="phone" editable />, {
      moment: Date.UTC(2026, 9, 24, 14), // Sat 24 Oct, 15:00 BST
    });
    await user.click(getByRole('button', { name: 'Set time in Bristol' }));
    await user.keyboard('{PageUp}');
    expect(app.pinned.value).toBe(Date.UTC(2026, 9, 25, 15)); // Sun 25 Oct, 15:00 GMT
    await user.keyboard('{PageDown}');
    expect(app.pinned.value).toBe(Date.UTC(2026, 9, 24, 14));
    await user.click(getByRole('button', { name: 'Tomorrow' }));
    expect(app.pinned.value).toBe(Date.UTC(2026, 9, 25, 15));
  });
  it('chips never take focus, so a tap cannot be lost to the editor closing on blur', async () => {
    const { user, getByRole } = renderWithApp(<CardList layout="phone" editable />);
    await user.click(getByRole('button', { name: 'Set time in Austin' }));
    expect(fireEvent.mouseDown(getByRole('button', { name: '+1h' }))).toBe(false);
  });
});
