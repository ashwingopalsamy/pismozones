import type { CalendarId } from '../../cities/registry';

export interface Holiday {
  /** YYYY-MM-DD in the office's civil calendar */
  date: string;
  name: { en: string; pt: string };
  kind: 'full' | 'half';
  /** Working hours on a half day, in local minutes (default: until 13:00). */
  hours?: { start: number; end: number };
}

export interface CalendarInfo {
  id: CalendarId;
  /** 'public': official public holidays; 'office': confirmed by Pismo HR. */
  status: 'public' | 'office';
  sources: readonly string[];
}

type Name = Holiday['name'];
type Kind = Holiday['kind'];

export type Rule =
  | {
      type: 'fixed';
      month: number;
      day: number;
      name: Name;
      kind?: Kind;
      observe?: 'us' | 'substitute';
    }
  | { type: 'nth'; month: number; weekday: number; n: number; name: Name; kind?: Kind }
  | {
      type: 'easter';
      offset: number;
      name: Name;
      kind?: Kind;
      hours?: { start: number; end: number };
    }
  | { type: 'list'; entries: readonly Holiday[] };

export interface CalendarDef {
  info: CalendarInfo;
  rules: readonly Rule[];
}
