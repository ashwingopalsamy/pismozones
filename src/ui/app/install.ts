import { type ReadonlySignal, signal } from '@preact/signals';
import type { Track } from '@state/track';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface Install {
  /** `prompt`: the browser can install now; `ios`: Safari, which needs Share → Add to Home Screen. */
  available: ReadonlySignal<'prompt' | 'ios' | null>;
  prompt(): Promise<'accepted' | 'dismissed'>;
}

export function createInstall(win: Window, track: Track): Install {
  const nav = win.navigator as Navigator & { standalone?: boolean };
  const standalone =
    win.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true;
  const ua = nav.userAgent;
  // iPadOS reports a Mac user agent; touch points tell them apart.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  const available = signal<'prompt' | 'ios' | null>(!standalone && ios && safari ? 'ios' : null);
  let deferred: BeforeInstallPromptEvent | null = null;

  win.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    available.value = 'prompt';
  });
  win.addEventListener('appinstalled', () => {
    deferred = null;
    available.value = null;
    track('pwa', { outcome: 'installed' });
  });

  return {
    available,
    async prompt() {
      const e = deferred;
      if (!e) return 'dismissed';
      // A prompt event is single-use; the browser fires a fresh one if it may ask again.
      deferred = null;
      available.value = null;
      await e.prompt();
      const { outcome } = await e.userChoice;
      track('pwa', { outcome });
      return outcome;
    },
  };
}
