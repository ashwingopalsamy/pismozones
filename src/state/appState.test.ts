import { parse } from '@core/parse/index';
import { encodeShare } from '@core/share/codec';
import { describe, expect, it } from 'vitest';
import { createAppState } from './index';
import { makeEnv } from './testing';

describe('createAppState', () => {
  it('boots a v1 share link into an overlay and cleans the URL', () => {
    const urls: string[] = [];
    const env = makeEnv({
      location: { pathname: '/s/10p00hwf', search: '', origin: 'https://x' },
      replaceUrl: (u) => urls.push(u),
    });
    const s = createAppState(env);
    expect(s.overlay.value).toMatchObject({
      refId: 'austin',
      instant: Date.UTC(2026, 9, 7, 20),
      version: 1,
    });
    expect([s.mode.value, s.moment.value, s.boot.entry, urls]).toEqual([
      'pinned',
      Date.UTC(2026, 9, 7, 20),
      'share',
      ['/'],
    ]);
    expect(s.reference.value.id).toBe('austin');
  });
  it('flags invalid links and honours shortcuts', () => {
    expect(
      createAppState(makeEnv({ location: { pathname: '/s/zz', search: '', origin: 'https://x' } }))
        .boot.shareInvalid,
    ).toBe(true);
    const s = createAppState(
      makeEnv({ location: { pathname: '/', search: '?view=plan', origin: 'https://x' } }),
    );
    expect([s.view.value, s.boot.entry]).toEqual(['plan', 'shortcut']);
  });
  it('overlay never persists', () => {
    const token = encodeShare({
      instant: Date.UTC(2026, 9, 8, 14),
      refId: 'bristol',
      officeIds: ['saopaulo', 'sydney', 'jakarta'],
    });
    const env = makeEnv({ location: { pathname: `/s/${token}`, search: '', origin: 'https://x' } });
    const s = createAppState(env);
    const stop = s.start();
    expect(s.displayed.value.filter((d) => d.temp).map((d) => d.office.id)).toEqual(
      expect.arrayContaining(['sydney', 'jakarta']),
    );
    expect(JSON.parse(env.storage?.getItem('pz:v1') ?? '{}')).toMatchObject({
      activeIds: ['saopaulo', 'austin', 'bangalore', 'bristol'],
      refId: null,
    });
    s.exitOverlay();
    expect(JSON.parse(env.storage?.getItem('pz:v1') ?? '{}').activeIds).toEqual([
      'saopaulo',
      'austin',
      'bangalore',
      'bristol',
    ]);
    expect(s.mode.value).toBe('live');
    expect(s.reference.value.id).toBe('bangalore');
    stop();
  });
  it('builds a v2 share URL for the current view', () => {
    const s = createAppState(makeEnv());
    s.pin(Date.UTC(2026, 9, 8, 14), 'card_edit', { refId: 'bristol' });
    expect(s.shareUrl()).toMatch(/^http:\/\/localhost\/s\/hryfc\.2\.[0-9a-z]+$/);
  });
  it('shows preview destinations outside the saved list as temporary cards', () => {
    const s = createAppState(makeEnv());
    s.pin(Date.UTC(2026, 9, 8, 14), 'command', { extras: ['warsaw'] });
    expect(s.displayed.value.at(-1)).toMatchObject({ office: { id: 'warsaw' }, temp: true });
  });

  it('keeps what the user does inside a shared view, never the shared view itself', () => {
    const token = encodeShare({
      instant: Date.UTC(2026, 9, 8, 14),
      refId: 'bristol',
      officeIds: ['saopaulo', 'sydney'],
    });
    const env = makeEnv({ location: { pathname: `/s/${token}`, search: '', origin: 'https://x' } });
    const s = createAppState(env);
    const stop = s.start();
    s.cities.add('warsaw');
    s.prefs.set('theme', 'light');
    expect(JSON.parse(env.storage?.getItem('pz:v1') ?? '{}')).toMatchObject({
      activeIds: ['saopaulo', 'austin', 'bangalore', 'bristol', 'warsaw'],
      refId: null,
      prefs: { theme: 'light' },
    });
    stop();
  });
  it('flags a mangled share token as invalid instead of crashing', () => {
    for (const pathname of ['/s/%E0%A4%A', '/s/%']) {
      const s = createAppState(
        makeEnv({ location: { pathname, search: '', origin: 'https://x' } }),
      );
      expect([s.boot.shareInvalid, s.overlay.value]).toEqual([true, null]);
    }
  });
  it('opens the old app’s ?share= and #hash links', () => {
    for (const location of [
      { pathname: '/', search: '?share=10p00hwf', hash: '', origin: 'https://x' },
      { pathname: '/', search: '', hash: '#10p00hwf', origin: 'https://x' },
    ]) {
      const s = createAppState(makeEnv({ location }));
      expect(s.overlay.value).toMatchObject({ refId: 'austin', instant: Date.UTC(2026, 9, 7, 20) });
    }
  });
  it('clears the command text along with its preview when leaving a shared view', () => {
    const s = createAppState(
      makeEnv({ location: { pathname: '/s/10p00hwf', search: '', origin: 'https://x' } }),
    );
    s.query.value = '3pm';
    s.preview.value = parse('3pm', { now: s.clock.now.value, referenceId: 'austin', locale: 'en' });
    s.exitOverlay();
    expect([s.preview.value, s.query.value]).toEqual([null, '']);
  });
});
