import { fireEvent } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { a11yViolations } from '../../test/axe';
import { renderWithApp } from '../../test/render';
import { Ruler } from './Ruler';

describe('Ruler', () => {
  it('drags left into the future and snaps on release', () => {
    const { app, getByRole } = renderWithApp(<Ruler />);
    const track = getByRole('slider');
    fireEvent.pointerDown(track, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(track, { clientX: 40, pointerId: 1 });
    expect(app.pinned.value).toBe(Date.UTC(2026, 9, 7, 15, 35));
    fireEvent.pointerUp(track, { pointerId: 1 });
    expect(app.pinned.value).toBe(Date.UTC(2026, 9, 7, 15, 30));
  });
  it('keyboard', async () => {
    const { app, user, getByRole, container } = renderWithApp(<Ruler />);
    getByRole('slider').focus();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(app.pinned.value).toBe(Date.UTC(2026, 9, 7, 15, 15));
    await user.keyboard('{Home}');
    expect(app.mode.value).toBe('live');
    expect(await a11yViolations(container)).toEqual([]);
  });
});
