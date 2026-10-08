import { getOffice, type Office } from '@core/cities/registry';
import { NOW } from '@state/testing';
import { describe, expect, it } from 'vitest';
import { cardModel, PHONE_BOX } from './model';

const o = (id: string) => getOffice(id) as Office;
const ctx = {
  now: NOW,
  viewerZone: 'Asia/Kolkata',
  hourCycle: 'h23' as const,
  lang: 'en' as const,
  refId: 'bangalore' as const,
  temp: false,
  box: PHONE_BOX,
  starCount: 26,
};

describe('cardModel', () => {
  it('models São Paulo at NOW', () => {
    const m = cardModel(o('saopaulo'), NOW, ctx);
    expect(m).toMatchObject({
      name: 'São Paulo',
      tags: ['hq'],
      clock: { hm: '11:22', period: '' },
      relDay: 'today',
      dateLabel: 'Wed 7 Oct',
      offsetLabel: 'UTC−3',
      state: { kind: 'working' },
      transition: null,
      isRef: false,
    });
    expect(m.stars).toEqual([]);
  });
  it('12h clocks, tomorrow, and upcoming DST', () => {
    expect(cardModel(o('austin'), NOW, { ...ctx, hourCycle: 'h12' }).clock).toEqual({
      hm: '9:22',
      period: 'AM',
    });
    expect(cardModel(o('singapore'), Date.UTC(2026, 9, 7, 17), ctx).relDay).toBe('tomorrow');
    expect(cardModel(o('bristol'), Date.UTC(2026, 9, 20, 12), ctx).transition).toEqual({
      fromLabel: 'UTC+1',
      toLabel: 'UTC+0',
      dateLabel: 'Sun 25 Oct',
    });
    expect(cardModel(o('bangalore'), NOW, ctx).tags).toEqual(['you']);
  });
  it('labels states with reasons', () => {
    expect(cardModel(o('austin'), Date.UTC(2026, 9, 9, 12, 30), ctx).stateLabel).toEqual({
      key: 'state.early',
      params: { time: '09:00' },
    });
    expect(
      cardModel(o('saopaulo'), Date.UTC(2026, 9, 12, 15), { ...ctx, lang: 'pt-BR' }).stateLabel,
    ).toEqual({
      key: 'state.holiday',
      params: { name: 'Nossa Senhora de Aparecida' },
    });
    expect(cardModel(o('bristol'), Date.UTC(2026, 9, 7, 23), ctx).stars.length).toBeGreaterThan(0);
  });
  it('describes the Ash Wednesday late start', () => {
    expect(cardModel(o('saopaulo'), Date.UTC(2026, 1, 18, 16), ctx).stateLabel).toEqual({
      key: 'state.early',
      params: { time: '14:00' },
    });
    expect(cardModel(o('saopaulo'), Date.UTC(2026, 1, 18, 17, 30), ctx).stateLabel).toEqual({
      key: 'state.working',
    });
  });
});
