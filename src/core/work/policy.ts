import type { Office } from '../cities/registry';
import type { Instant } from '../time/types';
import { zonedFields } from '../time/zoned';
import { type Holiday, holidayOn } from './holidays';

export type WorkKind = 'working' | 'early' | 'late' | 'off' | 'weekend' | 'holiday';

export interface WorkState {
  kind: WorkKind;
  holiday?: Holiday;
  halfDay?: Holiday;
}

const EDGE = 120;
const HALF_DAY_END = 780;

/** The single work-state rule used by cards, plan cells, ruler highlights and analytics. */
export function workState(instant: Instant, office: Office): WorkState {
  const f = zonedFields(instant, office.zone);
  const holiday = office.holidayCalendar ? holidayOn(office.holidayCalendar, f) : undefined;
  if (holiday?.kind === 'full') return { kind: 'holiday', holiday };
  if (f.weekday === 0 || f.weekday === 6) return { kind: 'weekend' };

  const { start } = office.workHours;
  const end = holiday?.kind === 'half' ? HALF_DAY_END : office.workHours.end;
  const m = f.hour * 60 + f.minute;
  const kind: WorkKind =
    m >= start && m < end
      ? 'working'
      : m >= start - EDGE && m < start
        ? 'early'
        : m >= end && m < end + EDGE
          ? 'late'
          : 'off';
  return holiday ? { kind, halfDay: holiday } : { kind };
}
