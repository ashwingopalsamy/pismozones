import { expect, it } from 'vitest';
import { listCoverageEnd } from './index';

// Intentionally time-dependent: this is the staleness alarm for hand-maintained lists.
it('list-based calendars cover at least 180 days ahead', () => {
  const horizon = new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10);
  for (const id of ['in-ka', 'sg'] as const) {
    const end = listCoverageEnd(id);
    expect(end, id).not.toBeNull();
    if (!end) continue;
    const iso = `${end.year}-${String(end.month).padStart(2, '0')}-${String(end.day).padStart(2, '0')}`;
    expect(iso >= horizon, `${id} ends ${iso}`).toBe(true);
  }
});
