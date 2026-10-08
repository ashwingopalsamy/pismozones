const COMBINING_MARKS = /\p{M}/gu;
const TYPOGRAPHIC_APOSTROPHES = /[‘’]/g;

/** Accent-insensitive, case-insensitive, whitespace-collapsed form used for all matching. */
export function normalize(s: string): string {
  return s
    .replace(TYPOGRAPHIC_APOSTROPHES, "'")
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
