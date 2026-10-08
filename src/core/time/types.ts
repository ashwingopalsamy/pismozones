/** Epoch milliseconds (UTC). The only representation of "when" in the engine. */
export type Instant = number;

export interface CivilDate {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

export interface CivilDateTime extends CivilDate {
  hour: number;
  minute: number;
  second: number;
}

/** 0 = Sunday … 6 = Saturday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ZonedFields extends CivilDateTime {
  weekday: Weekday;
  offsetMinutes: number;
}

/** IANA zone name, `UTC`, or a fixed offset such as `UTC+5:30`. */
export type ZoneId = string;

export type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

export interface Resolution {
  instant: Instant;
  kind: 'exact' | 'gap' | 'overlap';
  earlier: Instant;
  later: Instant;
}
