import { expect, it } from 'vitest';
import { getOffice, type Office, type OfficeId } from '../cities/registry';
import { planDay } from './overlap';
import { suggestSlots } from './suggest';

const offices = (ids: OfficeId[]) => ids.map((id) => getOffice(id) as Office);

it('ranks one-hour windows by people in hours and keeps them apart', () => {
  const plan = planDay(
    { year: 2026, month: 10, day: 8 },
    'America/Sao_Paulo',
    offices(['saopaulo', 'austin', 'bristol', 'bangalore']),
  );
  const s = suggestSlots(plan, 2);
  expect(s.length).toBeGreaterThan(0);
  const best = [...s].sort((a, b) => b.inHours - a.inHours)[0];
  expect(best?.inHours).toBe(3);
  for (let i = 1; i < s.length; i++)
    expect(s[i]?.startIndex).toBeGreaterThanOrEqual(s[i - 1]?.endIndex ?? 0);
});
