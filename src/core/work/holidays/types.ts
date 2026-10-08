import type { CalendarId } from '../../cities/registry';

export interface Holiday {
  /** YYYY-MM-DD in the office's civil calendar */
  date: string;
  /** English name; Portuguese where the company list has one (Brazil). */
  name: { en: string; pt?: string };
  /** Qualifier from the company list, e.g. "Observed (Jul 4)". */
  note?: string;
  kind: 'full' | 'half';
  /** Working hours on a half day, in local minutes. */
  hours?: { start: number; end: number };
}

export type CompanyYear = Readonly<Record<CalendarId, readonly Holiday[]>>;
