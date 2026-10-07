import { expect, it, vi } from 'vitest';
import { renderWithApp } from '../../test/render';
import { Sheet } from './Sheet';

it('closes on Escape and returns focus to the opener', async () => {
  const opener = document.createElement('button');
  document.body.append(opener);
  opener.focus();
  const onClose = vi.fn();
  const { user, rerender, getByRole } = renderWithApp(
    <Sheet open onClose={onClose} title="Settings">
      <p>x</p>
    </Sheet>,
  );
  expect(getByRole('dialog', { name: 'Settings' })).toBeTruthy();
  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
  rerender(
    <Sheet open={false} onClose={onClose} title="Settings">
      <p>x</p>
    </Sheet>,
  );
  expect(document.activeElement).toBe(opener);
  opener.remove();
});
