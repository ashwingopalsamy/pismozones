import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../test/render';
import { CommandBar } from './CommandBar';

describe('CommandBar', () => {
  it('previews, then commits the latest text on Enter', async () => {
    const { app, user, getByRole } = renderWithApp(<CommandBar placement="top" />);
    const input = getByRole('textbox', { name: 'Convert a time' }) as HTMLInputElement;
    await user.type(input, '3pm bristol to austin');
    expect(app.mode.value).toBe('preview');
    await user.keyboard('{Enter}');
    expect([app.mode.value, app.pinned.value, app.cities.refId.value, input.value]).toEqual([
      'pinned',
      Date.UTC(2026, 9, 7, 14),
      'bristol',
      '',
    ]);
    expect(app.history.items.value[0]).toBe('3pm bristol to austin');
  });
  it('double Esc returns to live and leaves no stale preview', async () => {
    const { app, user, getByRole } = renderWithApp(<CommandBar placement="top" />);
    app.pin(Date.UTC(2026, 9, 8), 'ruler');
    await user.type(getByRole('textbox'), 'tomorrow 9am sp');
    await user.keyboard('{Escape}');
    expect([app.preview.value, app.mode.value]).toEqual([null, 'pinned']);
    await user.keyboard('{Escape}');
    expect(app.mode.value).toBe('live');
  });
  it('applies a suggestion chip and ignores Enter on errors', async () => {
    const { app, user, getByRole } = renderWithApp(<CommandBar placement="top" />);
    await user.type(getByRole('textbox'), '3pm brstol{Enter}');
    expect(app.pinned.value).toBeNull();
    await user.click(getByRole('button', { name: 'Bristol' }));
    expect((getByRole('textbox') as HTMLInputElement).value).toBe('3pm bristol');
  });
  it('recalls history with the arrow keys', async () => {
    const { app, user, getByRole } = renderWithApp(<CommandBar placement="top" />);
    app.history.remember('noon sg to sp');
    getByRole('textbox').focus();
    await user.keyboard('{ArrowUp}');
    expect((getByRole('textbox') as HTMLInputElement).value).toBe('noon sg to sp');
  });
});
