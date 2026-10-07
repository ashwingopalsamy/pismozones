import { DEFAULT_ACTIVE } from '@core/cities/registry';
import { effect } from '@preact/signals';
import { describe, expect, it } from 'vitest';
import { createCities } from './cities';
import { createClock } from './clock';
import { createHistory } from './history';
import { createMoment } from './moment';
import { makeEnv, NOW } from './testing';

const compose = (env = makeEnv()) => {
  const track = () => {};
  const clock = createClock(env.scheduler);
  const cities = createCities(
    { activeIds: [...DEFAULT_ACTIVE], refId: null },
    env.viewerZone,
    track,
  );
  return { ...createMoment(clock, cities, track), cities, clock };
};

describe('clock', () => {
  it('ticks on second boundaries and changes minuteNow once a minute', () => {
    const env = makeEnv();
    const c = createClock(env.scheduler);
    const stop = c.start();
    let minuteChanges = 0;
    effect(() => {
      c.minuteNow.value;
      minuteChanges++;
    });
    env.advance(38_000);
    expect(c.now.value).toBe(NOW + 38_000);
    env.advance(22_000);
    expect(minuteChanges).toBe(2);
    stop();
  });
  it('resyncs when the tab becomes visible', () => {
    const env = makeEnv();
    const c = createClock(env.scheduler);
    const stop = c.start();
    env.setTime(NOW + 3 * 3_600_000);
    env.fireVisible();
    expect(c.now.value).toBe(NOW + 3 * 3_600_000);
    stop();
  });
});

describe('moment', () => {
  it('moment and mode follow pin, nudge and live', () => {
    const s = compose();
    expect(s.mode.value).toBe('live');
    s.pin(Date.UTC(2026, 9, 7, 14), 'card_edit', { refId: 'bristol' });
    expect([s.mode.value, s.moment.value, s.cities.refId.value]).toEqual([
      'pinned',
      Date.UTC(2026, 9, 7, 14),
      'bristol',
    ]);
    s.nudge(900_000, 'keyboard');
    expect(s.moment.value).toBe(Date.UTC(2026, 9, 7, 14, 15));
    s.backToLive('button');
    expect([s.mode.value, s.pinned.value]).toEqual(['live', null]);
  });
  it('nudge from live snaps to the quarter hour', () => {
    const s = compose();
    s.nudge(900_000, 'keyboard');
    expect(s.moment.value).toBe(Date.UTC(2026, 9, 7, 14, 30));
  });
  it('scrub moves without committing; endScrub snaps to 15 minutes', () => {
    const s = compose();
    s.scrub(Date.UTC(2026, 9, 7, 15, 35));
    expect(s.mode.value).toBe('pinned');
    s.endScrub('ruler');
    expect(s.pinned.value).toBe(Date.UTC(2026, 9, 7, 15, 30));
  });
});

describe('cities and history', () => {
  it('viewer outside office zones', () => {
    const c = createCities({ activeIds: ['saopaulo'], refId: null }, 'America/New_York', () => {});
    expect(c.viewerOffice).toBeUndefined();
    expect(c.defaultRef.value.id).toBe('saopaulo');
  });
  it('never removes the last office; history dedupes newest-first', () => {
    const c = createCities({ activeIds: ['saopaulo'], refId: null }, 'UTC', () => {});
    c.toggle('saopaulo');
    expect(c.activeIds.value).toEqual(['saopaulo']);
    const h = createHistory([]);
    h.remember('a');
    h.remember('b');
    h.remember('a');
    expect(h.items.value).toEqual(['a', 'b']);
  });
  it('moves offices', () => {
    const c = createCities(
      { activeIds: ['saopaulo', 'austin', 'warsaw'], refId: null },
      'UTC',
      () => {},
    );
    c.move('austin', 0);
    expect(c.activeIds.value).toEqual(['austin', 'saopaulo', 'warsaw']);
  });
});
