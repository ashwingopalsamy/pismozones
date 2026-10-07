import type { NoticeCode, ParseContext, PlaceRef } from './types';

/** Shared fixture: Wed 7 Oct 2026, 11:22 in São Paulo, 19:52 in Bangalore. */
export const CTX: ParseContext = {
  now: Date.UTC(2026, 9, 7, 14, 22),
  referenceId: 'bangalore',
  locale: 'en-GB',
};

const o = (id: Extract<PlaceRef, { kind: 'office' }>['id']): PlaceRef => ({ kind: 'office', id });

export interface OkRow {
  input: string;
  ctx?: Partial<ParseContext>;
  expect: {
    source: PlaceRef;
    dest: PlaceRef[];
    instant: number;
    isNow?: boolean;
    implicit?: boolean;
    notices?: NoticeCode[];
    resolution?: 'exact' | 'gap' | 'overlap';
    alternative?: string;
  };
}

const U = Date.UTC;

export const OK_ROWS: OkRow[] = [
  {
    input: '3pm bristol to austin',
    expect: { source: o('bristol'), dest: [o('austin')], instant: U(2026, 9, 7, 14, 0) },
  },
  {
    input: 'tomorrow 8am bangalore to austin',
    expect: { source: o('bangalore'), dest: [o('austin')], instant: U(2026, 9, 8, 2, 30) },
  },
  {
    input: '3:15 AM BRT to IST',
    expect: {
      source: o('saopaulo'),
      dest: [o('bangalore')],
      instant: U(2026, 9, 7, 6, 15),
      notices: ['ist_is_india'],
    },
  },
  {
    input: '3pm SGT to BRT',
    expect: { source: o('singapore'), dest: [o('saopaulo')], instant: U(2026, 9, 7, 7, 0) },
  },
  {
    input: '3pm UTC to sp',
    expect: {
      source: { kind: 'zone', zone: 'UTC', label: 'UTC' },
      dest: [o('saopaulo')],
      instant: U(2026, 9, 7, 15, 0),
    },
  },
  {
    input: '3.15pm bristol',
    expect: { source: o('bristol'), dest: [], instant: U(2026, 9, 7, 14, 15) },
  },
  {
    input: 'in 2 hours',
    expect: {
      source: o('bangalore'),
      dest: [],
      instant: U(2026, 9, 7, 16, 22),
      implicit: true,
      notices: ['implicit_source'],
    },
  },
  {
    input: 'oct 20 10am sp',
    expect: { source: o('saopaulo'), dest: [], instant: U(2026, 9, 20, 13, 0) },
  },
  {
    input: 'yesterday 3pm',
    expect: {
      source: o('bangalore'),
      dest: [],
      instant: U(2026, 9, 6, 9, 30),
      implicit: true,
      notices: ['implicit_source'],
    },
  },
  {
    input: 'meeting at 3 with sp team',
    expect: {
      source: o('saopaulo'),
      dest: [],
      instant: U(2026, 9, 7, 18, 0),
      notices: ['hour_bias'],
      alternative: 'meeting at 03:00 with sp team',
    },
  },
  {
    input: 'sp to ist',
    expect: {
      source: o('saopaulo'),
      dest: [o('bangalore')],
      instant: U(2026, 9, 7, 14, 22),
      isNow: true,
      notices: ['ist_is_india'],
    },
  },
  {
    input: '2026-03-08 2:30am austin',
    expect: {
      source: o('austin'),
      dest: [],
      instant: U(2026, 2, 8, 8, 30),
      resolution: 'gap',
      notices: ['dst_gap'],
      alternative: '2026-03-08 01:30 austin',
    },
  },
  {
    input: '2026-11-01 1:30am austin',
    expect: {
      source: o('austin'),
      dest: [],
      instant: U(2026, 10, 1, 6, 30),
      resolution: 'overlap',
      notices: ['dst_overlap'],
      alternative: '2026-11-01 1:30am utc−6 to austin',
    },
  },
  {
    input: '12/10 3pm sp',
    expect: { source: o('saopaulo'), dest: [], instant: U(2026, 9, 12, 18, 0) },
  },
  {
    input: '12/10 3pm sp',
    ctx: { locale: 'en-US' },
    expect: { source: o('saopaulo'), dest: [], instant: U(2026, 11, 10, 18, 0) },
  },
  {
    input: 'amanhã 9h sp para ist',
    expect: {
      source: o('saopaulo'),
      dest: [o('bangalore')],
      instant: U(2026, 9, 8, 12, 0),
      notices: ['ist_is_india'],
    },
  },
  {
    input: 'fri 10am austin',
    expect: { source: o('austin'), dest: [], instant: U(2026, 9, 9, 15, 0) },
  },
  {
    input: 'fri 10am austin',
    ctx: { now: U(2026, 9, 9, 14) },
    expect: { source: o('austin'), dest: [], instant: U(2026, 9, 9, 15, 0) },
  },
  {
    input: 'next fri 10am austin',
    ctx: { now: U(2026, 9, 9, 14) },
    expect: { source: o('austin'), dest: [], instant: U(2026, 9, 16, 15, 0) },
  },
  {
    input: 'SÃO PAULO 15:00 → Bengaluru',
    expect: { source: o('saopaulo'), dest: [o('bangalore')], instant: U(2026, 9, 7, 18, 0) },
  },
  {
    input: '  3PM  bristol→austin ',
    expect: { source: o('bristol'), dest: [o('austin')], instant: U(2026, 9, 7, 14, 0) },
  },
  {
    input: '3pm in bristol',
    expect: { source: o('bristol'), dest: [], instant: U(2026, 9, 7, 14, 0) },
  },
  {
    input: 'what time is it in bristol',
    expect: { source: o('bristol'), dest: [], instant: U(2026, 9, 7, 14, 22), isNow: true },
  },
  {
    input: 'noon sg to sp',
    expect: { source: o('singapore'), dest: [o('saopaulo')], instant: U(2026, 9, 7, 4, 0) },
  },
  {
    input: 'tonight 9 sp',
    expect: {
      source: o('saopaulo'),
      dest: [],
      instant: U(2026, 9, 8, 0, 0),
      notices: ['hour_bias'],
    },
  },
  {
    input: 'tomorrow 11:30pm sp to sg',
    expect: { source: o('saopaulo'), dest: [o('singapore')], instant: U(2026, 9, 9, 2, 30) },
  },
  {
    input: '1530 austin',
    expect: { source: o('austin'), dest: [], instant: U(2026, 9, 7, 20, 30) },
  },
];
