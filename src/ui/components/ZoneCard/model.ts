import { type Office, type OfficeId, sameZone } from '@core/cities/registry';
import type { Lang } from '@core/i18n';
import { nightDepth, type SkyStops, type SunGlow, skyFor, starAlpha, sunGlow } from '@core/sky/sky';
import { solarElevation, solarHourAngle } from '@core/sky/sun';
import { formatClock, formatOffset, formatShortDate, type HourCycle } from '@core/time/format';
import { type RelativeDay, relativeDay } from '@core/time/relative';
import { nextTransition } from '@core/time/transitions';
import type { Instant } from '@core/time/types';
import { zonedFields } from '@core/time/zoned';
import { holidayName } from '@core/work/holidays';
import { type WorkState, workState } from '@core/work/policy';
import type { Key } from '../../i18n';

export interface CardBox {
  w: number;
  h: number;
}
export const PHONE_BOX: CardBox = { w: 358, h: 124 };
export const DESKTOP_BOX: CardBox = { w: 400, h: 152 };
/** São Paulo's hero card: the full content column on desktop, a taller card on phone. */
export const HERO_BOX: CardBox = { w: 1216, h: 176 };
export const PHONE_HERO_BOX: CardBox = { w: 358, h: 148 };

export interface Star {
  x: number;
  y: number;
  r: 1 | 1.5 | 2 | 2.5;
  /** Peak opacity. */
  o: number;
  /** Twinkle period and phase, seconds. */
  dur: number;
  delay: number;
  /** How far the twinkle dips (0–1); stronger near the horizon, as in a real sky. */
  amp: number;
  /** One of the few brightest: gets a soft halo and sparkle. */
  bright: boolean;
}

export interface ShootingStar {
  x: number;
  y: number;
  /** Seconds between streaks, and this card's offset into the cycle. */
  cycle: number;
  delay: number;
}

export interface CardModel {
  id: OfficeId;
  name: string;
  tags: Array<'hq' | 'you' | 'temp'>;
  state: WorkState;
  stateLabel: { key: Key; params?: Record<string, string> };
  clock: { hm: string; period: '' | 'AM' | 'PM' };
  relDay: RelativeDay;
  dateLabel: string;
  offsetLabel: string;
  transition: { fromLabel: string; toLabel: string; dateLabel: string } | null;
  sky: SkyStops;
  glow: SunGlow | null;
  starAlpha: number;
  stars: Star[];
  shooting: ShootingStar | null;
  /** Office work hours, e.g. "09:00–18:00". */
  hours: string;
  isRef: boolean;
}

export interface CardContext {
  now: Instant;
  viewerZone: string;
  hourCycle: HourCycle;
  lang: Lang;
  refId: OfficeId;
  temp: boolean;
  box: CardBox;
  starCount: number;
}

function seeded(id: string): () => number {
  let seed = 7;
  for (const ch of id) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stars come out the way they do in a real sky: the brightest first at dusk, the faint ones only in
 * full night. Positions and brightness are seeded per office, so a card's sky is stable.
 */
function starField(id: string, count: number, visible: number, depth: number): Star[] {
  if (visible < 0.03) return [];
  const rnd = seeded(id);
  const threshold = 1 - visible * (0.55 + 0.45 * depth);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const x = 3 + rnd() * 94;
    const y = 4 + rnd() * 62;
    const b = rnd();
    const dur = 2.4 + rnd() * 4.2;
    const phase = rnd();
    if (b <= threshold) continue;
    const bright = b > 0.94;
    stars.push({
      x,
      y,
      r: bright ? 2.5 : b > 0.8 ? 2 : b > 0.5 ? 1.5 : 1,
      o: Math.min(1, (0.35 + 0.65 * b) * Math.min(1, visible * 1.25)),
      dur,
      delay: -phase * dur,
      amp: Math.min(0.85, 0.25 + 0.4 * (y / 66) + 0.15 * depth),
      bright,
    });
  }
  return stars;
}

function shootingStar(id: string, depth: number): ShootingStar | null {
  if (depth < 0.5) return null;
  const rnd = seeded(`${id}:meteor`);
  const cycle = 22 + rnd() * 26;
  return { x: 15 + rnd() * 55, y: 6 + rnd() * 22, cycle, delay: -rnd() * cycle };
}

function labelFor(
  state: WorkState,
  office: Office,
  hc: HourCycle,
  lang: Lang,
): CardModel['stateLabel'] {
  const at = (minutes: number) => {
    const c = formatClock({ hour: Math.floor(minutes / 60), minute: minutes % 60 }, hc);
    return c.period ? `${c.hm} ${c.period}` : c.hm;
  };
  const start = state.halfDay?.hours?.start ?? office.workHours.start;
  const end = state.halfDay ? (state.halfDay.hours?.end ?? 780) : office.workHours.end;
  switch (state.kind) {
    case 'working':
      return end < office.workHours.end
        ? { key: 'state.closes', params: { time: at(end) } }
        : { key: 'state.working' };
    case 'early':
      return { key: 'state.early', params: { time: at(start) } };
    case 'late':
      return { key: 'state.late' };
    case 'off':
      return { key: 'state.off' };
    case 'weekend':
      return { key: 'state.weekend' };
    case 'holiday':
      return {
        key: 'state.holiday',
        params: { name: state.holiday ? holidayName(state.holiday, lang) : '' },
      };
  }
}

export function cardModel(office: Office, moment: Instant, ctx: CardContext): CardModel {
  const f = zonedFields(moment, office.zone);
  const viewer = zonedFields(ctx.now, ctx.viewerZone);
  const elevation = solarElevation(moment, office.lat, office.lon);
  const hourAngle = solarHourAngle(moment, office.lon);
  const depth = nightDepth(elevation);
  const state = workState(moment, office);
  const t = nextTransition(moment, office.zone, 7);
  const alpha = starAlpha(elevation);
  const tags: CardModel['tags'] = [];
  if (office.hq) tags.push('hq');
  if (sameZone(office.zone, ctx.viewerZone)) tags.push('you');
  if (ctx.temp) tags.push('temp');
  const at = (m: number) => {
    const c = formatClock({ hour: Math.floor(m / 60), minute: m % 60 }, ctx.hourCycle);
    return c.period ? `${c.hm} ${c.period}` : c.hm;
  };

  return {
    id: office.id,
    name: office.name,
    tags,
    state,
    stateLabel: labelFor(state, office, ctx.hourCycle, ctx.lang),
    clock: formatClock(f, ctx.hourCycle),
    relDay: relativeDay(f, viewer),
    dateLabel: formatShortDate(f, ctx.lang),
    offsetLabel: formatOffset(f.offsetMinutes),
    transition: t
      ? {
          fromLabel: formatOffset(t.fromOffset),
          toLabel: formatOffset(t.toOffset),
          dateLabel: formatShortDate(zonedFields(t.at, office.zone), ctx.lang),
        }
      : null,
    sky: skyFor(elevation, hourAngle < 0),
    glow: sunGlow(elevation, hourAngle),
    starAlpha: alpha,
    stars: starField(office.id, ctx.starCount, alpha, depth),
    shooting: shootingStar(office.id, depth),
    hours: `${at(office.workHours.start)}–${at(office.workHours.end)}`,
    isRef: office.id === ctx.refId,
  };
}
