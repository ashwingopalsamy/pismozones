import { expect, it } from 'vitest';
import { a11yViolations } from '../../test/axe';
import { renderWithApp } from '../../test/render';
import { PlanView } from './PlanView';

const five = ['saopaulo', 'austin', 'bristol', 'bangalore', 'singapore'] as const;

it('picking a suggested time pins it and spotlights it', async () => {
  const { app, user, getByRole, container } = renderWithApp(<PlanView layout="panel" />, {
    activeIds: [...five],
    refId: 'saopaulo',
    moment: Date.UTC(2026, 9, 8, 12),
  });
  const best = getByRole('button', { name: /Best fit/ });
  await user.click(best);
  expect(app.mode.value).toBe('pinned');
  expect(best.getAttribute('aria-pressed')).toBe('true');
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
