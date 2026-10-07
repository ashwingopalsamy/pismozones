import type { Office, OfficeId } from '@core/cities/registry';
import type { Lang } from '@core/i18n';
import { type SkyStops, skyFor, starAlpha } from '@core/sky/sky';
import { solarElevation, sunSamples } from '@core/sky/sun';
import { formatClock, formatOffset, formatShortDate, type HourCycle } from '@core/time/format';
import { type RelativeDay, relativeDay } from '@core/time/relative';
import { nextTransition } from '@core/time/transitions';
import type { Instant } from '@core/time/types';
import { startOfDay, zonedFields } from '@core/time/zoned';
import { type WorkState, workState } from '@core/work/policy';
import type { Key } from '../../i18n';

export interface CardBox {
  w: number;
  h: number;
}
export const PHONE_BOX: CardBox = { w: 358, h: 124 };
export const DESKTOP_BOX: CardBox = { w: 400, h: 152 };

export interface Star {
  x: number;
  y: number;
  r: 1 | 1.5 | 2;
  o: number;
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
  starAlpha: number;
  stars: Star[];
  sun: { xPct: number; yPct: number; up: boolean };
  path: { above: string; below: string; horizonY: number; workX: [number, number] };
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

function starField(id: string, count: number, alpha: number): Star[] {
  if (alpha < 0.03) return [];
  const rnd = seeded(id);
  return Array.from({ length: count }, () => {
    const x = 3 + rnd() * 94;
    const y = 4 + rnd() * 58;
    const z = rnd();
    const o = (0.3 + rnd() * 0.7) * alpha;
    return { x, y, r: z < 0.15 ? 2 : z < 0.5 ? 1.5 : 1, o };
  });
}

/** Above/below-horizon polylines of the sun's elevation over the local day, sharing crossing vertices. */
function sunPath(elevations: number[], box: CardBox, horizonY: number, k: number) {
  let above = '';
  let below = '';
  let prev: { up: boolean; x: number; y: number } | null = null;
  const n = elevations.length - 1;
  elevations.forEach((el, i) => {
    const x = (i / n) * box.w;
    const y = horizonY - el * k;
    const up = el >= 0;
    const pt = `${x.toFixed(1)} ${y.toFixed(1)}`;
    const seg = !prev
      ? `M${pt}`
      : prev.up === up
        ? ` L${pt}`
        : ` M${prev.x.toFixed(1)} ${prev.y.toFixed(1)} L${pt}`;
    if (up) above += seg;
    else below += seg;
    prev = { up, x, y };
  });
  return { above: above.trim(), below: below.trim() };
}

const memo = new Map<string, number[]>();
function daySamples(office: Office, moment: Instant): number[] {
  const f = zonedFields(moment, office.zone);
  const key = `${office.id}:${f.year}-${f.month}-${f.day}`;
  let s = memo.get(key);
  if (!s) {
    const day = startOfDay(f, office.zone);
    s = sunSamples(day.start, day.end, office.lat, office.lon, 97);
    if (memo.size > 512) memo.clear();
    memo.set(key, s);
  }
  return s;
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
        params: { name: state.holiday?.name[lang === 'pt-BR' ? 'pt' : 'en'] ?? '' },
      };
  }
}

export function cardModel(office: Office, moment: Instant, ctx: CardContext): CardModel {
  const f = zonedFields(moment, office.zone);
  const viewer = zonedFields(ctx.now, ctx.viewerZone);
  const elevation = solarElevation(moment, office.lat, office.lon);
  const { h, w } = ctx.box;
  const horizonY = Math.round(0.645 * h);
  const k = 0.00565 * h;
  const state = workState(moment, office);
  const t = nextTransition(moment, office.zone, 7);
  const alpha = starAlpha(elevation);
  const tags: CardModel['tags'] = [];
  if (office.hq) tags.push('hq');
  if (office.zone === ctx.viewerZone) tags.push('you');
  if (ctx.temp) tags.push('temp');
  const minutes = f.hour * 60 + f.minute;

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
    sky: skyFor(elevation),
    starAlpha: alpha,
    stars: starField(office.id, ctx.starCount, alpha),
    sun: {
      xPct: (minutes / 1440) * 100,
      yPct: Math.max(6, Math.min(94, ((horizonY - elevation * k) / h) * 100)),
      up: elevation >= 0,
    },
    path: {
      ...sunPath(daySamples(office, moment), ctx.box, horizonY, k),
      horizonY,
      workX: [(office.workHours.start / 1440) * w, (office.workHours.end / 1440) * w],
    },
    isRef: office.id === ctx.refId,
  };
}
