import { describe, expect, it } from 'vitest';
import { createTracker } from './analytics';
import { makeEnv } from './testing';

describe('tracker', () => {
  it('batches and flushes every 60s', () => {
    const env = makeEnv();
    const t = createTracker(env);
    t.track('view', { view: 'plan' });
    expect(env.sent).toHaveLength(0);
    env.advance(60_000);
    expect(JSON.parse(env.sent[0] as string)).toMatchObject({
      v: 1,
      a: 'test',
      e: [{ n: 'view', b: ['plan'] }],
    });
    expect(t.sessionId).toMatch(/^[0-9a-f]{16}$/);
  });
  it('flushes immediately at 50 events and on demand', () => {
    const env = makeEnv();
    const t = createTracker(env);
    for (let i = 0; i < 50; i++) t.track('view', { view: 'zones' });
    expect(env.sent).toHaveLength(1);
    t.track('view', { view: 'plan' });
    t.flush();
    expect(env.sent).toHaveLength(2);
    t.flush();
    expect(env.sent).toHaveLength(2);
  });
});
