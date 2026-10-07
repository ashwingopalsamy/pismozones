import { createAppState } from '@state/index';
import { makeEnv } from '@state/testing';
import { expect, it, vi } from 'vitest';
import { handleShortcut } from './shortcuts';

it('keyboard shortcuts', () => {
  const app = createAppState(makeEnv());
  const ui = { focusCommand: vi.fn(), openShortcuts: vi.fn() };
  const key = (k: string, o: KeyboardEventInit = {}) =>
    handleShortcut(new KeyboardEvent('keydown', { key: k, ...o }), app, ui);
  key('/');
  expect(ui.focusCommand).toHaveBeenCalled();
  key('ArrowRight');
  expect(app.pinned.value).toBe(Date.UTC(2026, 9, 7, 14, 30));
  key(']');
  expect(app.pinned.value).toBe(Date.UTC(2026, 9, 8, 14, 30));
  key('n');
  expect(app.mode.value).toBe('live');
  key('?');
  expect(ui.openShortcuts).toHaveBeenCalled();
});

it('ignores plain keys while typing, but ⌘K still focuses the command bar', () => {
  const app = createAppState(makeEnv());
  const ui = { focusCommand: vi.fn(), openShortcuts: vi.fn() };
  const input = document.createElement('input');
  document.body.append(input);
  const typed = (k: string, o: KeyboardEventInit = {}) => {
    const e = new KeyboardEvent('keydown', { key: k, bubbles: true, ...o });
    Object.defineProperty(e, 'target', { value: input });
    return handleShortcut(e, app, ui);
  };
  expect(typed('n')).toBe(false);
  expect(app.mode.value).toBe('live');
  expect(typed('k', { metaKey: true })).toBe(true);
  expect(ui.focusCommand).toHaveBeenCalledTimes(1);
  input.remove();
});
