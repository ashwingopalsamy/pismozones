import { describe, expect, it } from 'vitest';
import { defaultPersisted, loadPersisted, savePersisted } from './storage';
import { makeEnv } from './testing';

describe('storage', () => {
  it('defaults include the viewer office', () => {
    expect(defaultPersisted('Asia/Singapore').activeIds).toEqual([
      'saopaulo',
      'austin',
      'bangalore',
      'bristol',
      'singapore',
    ]);
    expect(defaultPersisted('Asia/Kolkata').activeIds).toEqual([
      'saopaulo',
      'austin',
      'bangalore',
      'bristol',
    ]);
  });
  it('survives broken storage', () => {
    const throwing = {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('quota');
      },
      removeItem() {},
    } as unknown as Storage;
    expect(loadPersisted(throwing, 'Asia/Kolkata')).toEqual(defaultPersisted('Asia/Kolkata'));
    expect(() => savePersisted(throwing, defaultPersisted('UTC'))).not.toThrow();
    const env = makeEnv({ storageData: { 'pz:v1': '{nope' } });
    expect(loadPersisted(env.storage, 'Asia/Kolkata').activeIds).toEqual([
      'saopaulo',
      'austin',
      'bangalore',
      'bristol',
    ]);
  });
  it('migrates legacy keys once', () => {
    const env = makeEnv({
      storageData: {
        'pismo-active-cities': '["austin","saopaulo","jakarta","nope","austin"]',
        'pismo-theme': 'light',
        'pismo-theme-explicit': 'true',
      },
    });
    const p = loadPersisted(env.storage, 'Asia/Kolkata');
    expect(p.activeIds).toEqual(['austin', 'saopaulo', 'jakarta']);
    expect(p.prefs.theme).toBe('light');
    expect(env.storage?.getItem('pismo-active-cities')).toBeNull();
    expect(JSON.parse(env.storage?.getItem('pz:v1') ?? '{}').schema).toBe(1);
  });
  it('round-trips through storage', () => {
    const env = makeEnv();
    const p = { ...defaultPersisted('UTC'), refId: 'bristol' as const, history: ['3pm sp'] };
    savePersisted(env.storage, p);
    expect(loadPersisted(env.storage, 'UTC')).toEqual(p);
  });
  it('drops a saved reference that is not one of the saved cities', () => {
    const env = makeEnv();
    env.storage?.setItem(
      'pz:v1',
      JSON.stringify({ schema: 1, activeIds: ['austin', 'bristol'], refId: 'sydney' }),
    );
    expect(loadPersisted(env.storage, 'UTC').refId).toBeNull();
  });
});
