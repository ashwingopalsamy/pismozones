import { createAppState } from '@state/index';
import { makeEnv } from '@state/testing';
import { expect, it, vi } from 'vitest';
import { shareCurrent } from './share';

it('shares natively on touch, else copies', async () => {
  const app = createAppState(makeEnv());
  const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
  expect(await shareCurrent(app, { clipboard } as never, false)).toBe('clipboard');
  expect(clipboard.writeText).toHaveBeenCalledWith(
    expect.stringMatching(/^http:\/\/localhost\/s\//),
  );
  expect(
    await shareCurrent(
      app,
      { share: vi.fn().mockResolvedValue(undefined), clipboard } as never,
      true,
    ),
  ).toBe('native');
  const cancelled = {
    share: vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError')),
    clipboard,
  };
  expect(await shareCurrent(app, cancelled as never, true)).toBe('failed');
});
