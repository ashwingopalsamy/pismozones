import type { OfficeId } from '../cities/registry';
import type { Instant } from '../time/types';

export type PlaceRef =
  | { kind: 'office'; id: OfficeId }
  | { kind: 'zone'; zone: string; label: string };

export interface Intent {
  instant: Instant;
  isNow: boolean;
  source: PlaceRef;
  destinations: PlaceRef[];
  implicitSource: boolean;
  resolution: 'exact' | 'gap' | 'overlap';
}

export type SpanRole = 'time' | 'date' | 'place' | 'connector' | 'filler' | 'duration' | 'unknown';

export interface Span {
  start: number;
  end: number;
  role: SpanRole;
}

export type DiagnosticCode =
  | 'unknown_token'
  | 'ambiguous_abbreviation'
  | 'abbreviation_out_of_season'
  | 'invalid_time'
  | 'invalid_date'
  | 'range_unsupported'
  | 'recurrence_unsupported'
  | 'too_many_destinations'
  | 'conflicting_terms'
  | 'missing_time'
  | 'nothing_to_convert';

export type NoticeCode =
  | 'dst_gap'
  | 'dst_overlap'
  | 'implicit_source'
  | 'hour_bias'
  | 'ist_is_india';

export type SuggestionDisplay =
  | { kind: 'office'; id: OfficeId }
  | { kind: 'zone'; zone: string; label: string }
  | { kind: 'clock'; hour: number; minute: number }
  | { kind: 'text'; text: string };

export interface Suggestion {
  query: string;
  display: SuggestionDisplay;
}

export interface Diagnostic {
  code: DiagnosticCode;
  token?: string;
  params?: Record<string, string | number>;
}

export interface Notice {
  code: NoticeCode;
  params?: Record<string, string | number>;
  alternative?: Suggestion;
}

export type ParseResult =
  | { status: 'ok'; intent: Intent; spans: Span[]; notices: Notice[] }
  | { status: 'ambiguous'; spans: Span[]; diagnostic: Diagnostic; options: Suggestion[] }
  | { status: 'error'; spans: Span[]; diagnostic: Diagnostic; suggestions: Suggestion[] };

export interface ParseContext {
  now: Instant;
  referenceId: OfficeId;
  locale: string;
}
