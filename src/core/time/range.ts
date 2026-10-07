import type { Instant } from './types';

/** Instants the engine supports. Outside this window formatters throw and offsets are meaningless. */
export const MIN_INSTANT: Instant = Date.UTC(1900, 0, 1);
export const MAX_INSTANT: Instant = Date.UTC(2200, 0, 1);

export const isSupportedInstant = (t: number): boolean =>
  Number.isFinite(t) && t >= MIN_INSTANT && t < MAX_INSTANT;
export const isSupportedYear = (y: number): boolean => Number.isInteger(y) && y >= 1900 && y < 2200;
