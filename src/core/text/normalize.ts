/** Accent-insensitive, case-insensitive, whitespace-collapsed form used for all matching. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
