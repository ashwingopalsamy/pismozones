const PATHS = {
  sliders: 'M4 7h9M17 7h3M4 17h4M12 17h8M15 5v4M10 15v4',
  globe: 'M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z',
  share: 'M12 15V4M8 8l4-4 4 4M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6',
  reset: 'M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 4.5v4h4',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  search: 'M20 20l-4.2-4.2M17.5 11a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z',
  close: 'M7 7l10 10M17 7L7 17',
  zones:
    'M6 4h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM6 14h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z',
  plan: 'M4 6h8M9 12h11M6 18h9',
  calendar:
    'M7 5h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM4 10h16M9 3v4M15 3v4',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  check: 'M6 12.5l4 4 8-9',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  clock: 'M12 7.5V12l3 2M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  language: 'M4 6h9M8.5 4v2M6 6c.7 3.5 3 6 6 7.5M11 6c-.8 3.6-3.4 6.4-7 8M13 20l4-9 4 9M14.5 17h5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
} as const;

export type IconName = keyof typeof PATHS;

/** Stroke icons drawn with currentColor; decorative unless a label is given by the parent. */
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
      {name === 'globe' && <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}
