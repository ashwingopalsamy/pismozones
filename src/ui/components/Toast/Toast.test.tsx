import { expect, it, vi } from 'vitest';
import { toast } from './store';

it('toast auto-dismisses', () => {
  vi.useFakeTimers();
  toast.show('Hi');
  expect(toast.message.value).toBe('Hi');
  vi.advanceTimersByTime(1800);
  expect(toast.message.value).toBeNull();
  vi.useRealTimers();
});
