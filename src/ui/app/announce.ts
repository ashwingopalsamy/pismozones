import { signal } from '@preact/signals';

/** Text for the single polite live region: set on committed changes only, never per keystroke. */
export const announcement = signal('');

export function announce(text: string) {
  announcement.value = '';
  queueMicrotask(() => {
    announcement.value = text;
  });
}
