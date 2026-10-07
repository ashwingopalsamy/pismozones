import { describe, expect, it, vi } from 'vitest';
import { createInstall } from './install';

const fakeWindow = (ua: string, standalone = false) => {
  const target = new EventTarget() as Window & EventTarget;
  Object.assign(target, {
    navigator: { userAgent: ua, maxTouchPoints: 5 },
    matchMedia: () => ({ matches: standalone }),
  });
  return target;
};
const CHROME =
  'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36';
const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Version/19.0 Mobile/15E148 Safari/604.1';

describe('install', () => {
  it('offers the captured browser prompt and reports the choice', async () => {
    const win = fakeWindow(CHROME);
    const track = vi.fn();
    const install = createInstall(win, track);
    expect(install.available.value).toBeNull();
    const e = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(async () => {}),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    win.dispatchEvent(e);
    expect([e.defaultPrevented, install.available.value]).toEqual([true, 'prompt']);
    expect(await install.prompt()).toBe('accepted');
    expect(track).toHaveBeenCalledWith('pwa', { outcome: 'accepted' });
    expect(install.available.value).toBeNull();
  });
  it('shows the Add to Home Screen hint in iOS Safari, never once installed', () => {
    expect(createInstall(fakeWindow(IOS_SAFARI), vi.fn()).available.value).toBe('ios');
    expect(createInstall(fakeWindow(IOS_SAFARI, true), vi.fn()).available.value).toBeNull();
  });
  it('reports an install and withdraws the offer', () => {
    const win = fakeWindow(IOS_SAFARI);
    const track = vi.fn();
    const install = createInstall(win, track);
    win.dispatchEvent(new Event('appinstalled'));
    expect(track).toHaveBeenCalledWith('pwa', { outcome: 'installed' });
    expect(install.available.value).toBeNull();
  });
});
