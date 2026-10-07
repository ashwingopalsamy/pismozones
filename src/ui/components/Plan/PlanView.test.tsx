import { expect, it } from 'vitest';
import { a11yViolations } from '../../test/axe';
import { renderWithApp } from '../../test/render';
import { PlanView } from './PlanView';

const five = ['saopaulo', 'austin', 'bristol', 'bangalore', 'singapore'] as const;

it('jumps to the best overlap', async () => {
  const { app, user, getByRole, container } = renderWithApp(<PlanView layout="panel" />, {
    activeIds: [...five],
    refId: 'saopaulo',
    moment: Date.UTC(2026, 9, 8, 12),
  });
  await user.click(getByRole('button', { name: /Jump to best overlap/ }));
  expect(app.pinned.value).toBe(Date.UTC(2026, 9, 8, 14));
  expect(await a11yViolations(container)).toEqual([]);
});

it('moves a day at a time', async () => {
  const { app, user, getByRole } = renderWithApp(<PlanView layout="panel" />, {
    refId: 'saopaulo',
    moment: Date.UTC(2026, 9, 8, 14),
  });
  await user.click(getByRole('button', { name: 'Next day' }));
  expect(app.pinned.value).toBe(Date.UTC(2026, 9, 9, 14));
});
