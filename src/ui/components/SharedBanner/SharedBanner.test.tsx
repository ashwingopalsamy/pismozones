import { encodeShare } from '@core/share/codec';
import { expect, it } from 'vitest';
import { renderWithApp } from '../../test/render';
import { SharedBanner } from './SharedBanner';

it('exits the shared view', async () => {
  const token = encodeShare({
    instant: Date.UTC(2026, 9, 8, 14),
    refId: 'bristol',
    officeIds: ['bristol', 'austin'],
  });
  const { app, user, getByRole, getByText } = renderWithApp(<SharedBanner />, {
    path: `/s/${token}`,
  });
  expect(getByText('Shared time · Thu 8 Oct 15:00 Bristol')).toBeTruthy();
  await user.click(getByRole('button', { name: 'Back to my view' }));
  expect(app.overlay.value).toBeNull();
});
