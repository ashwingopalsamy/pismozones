import { getOffice, type Office } from '@core/cities/registry';
import { NOW } from '@state/testing';
import { expect, it } from 'vitest';
import { momentPillModel } from './model';

it('describes live, preview and pinned moments', () => {
  expect(
    momentPillModel(
      'pinned',
      Date.UTC(2026, 9, 7, 16, 52),
      NOW,
      getOffice('bristol') as Office,
      'Asia/Kolkata',
      'h23',
      'en',
    ),
  ).toEqual({
    main: '+2h 30m',
    sub: 'Today · 17:52 Bristol',
    tone: 'pinned',
  });
  expect(
    momentPillModel(
      'live',
      NOW,
      NOW,
      getOffice('bangalore') as Office,
      'Asia/Kolkata',
      'h23',
      'en',
    ),
  ).toEqual({
    main: 'Live',
    sub: 'Today, Wed 7 Oct',
    tone: 'live',
  });
  expect(
    momentPillModel(
      'preview',
      NOW,
      NOW,
      getOffice('bangalore') as Office,
      'Asia/Kolkata',
      'h23',
      'pt-BR',
    ),
  ).toEqual({
    main: 'Prévia',
    sub: 'Enter para definir · Esc para limpar',
    tone: 'preview',
  });
});
