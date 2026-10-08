import type { OfficeId } from './registry';

/**
 * Share-link index of each office. Frozen v1 order: APPEND ONLY.
 * Reordering or removing an entry silently breaks every link already shared.
 */
export const SHARE_INDEX: readonly OfficeId[] = Object.freeze([
  'saopaulo',
  'austin',
  'bristol',
  'bangalore',
  'singapore',
  'warsaw',
  'mexicocity',
  'buenosaires',
  'bogota',
  'sydney',
  'hochiminh',
  'jakarta',
]);
