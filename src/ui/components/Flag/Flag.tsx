import type { JSX } from 'preact';
import styles from './Flag.module.css';

/** Circular flags for the office countries (simplified for 14–28 px), drawn in a 24×24 box. */
const FLAGS: Record<string, JSX.Element> = {
  BR: (
    <>
      <rect width="24" height="24" fill="#009C3B" />
      <polygon points="12,3.2 21.6,12 12,20.8 2.4,12" fill="#FFDF00" />
      <circle cx="12" cy="12" r="4.9" fill="#002776" />
      <path d="M7.4 11.1c3-.9 6.4-.5 9.3 1.1" stroke="#fff" strokeWidth="0.9" fill="none" />
    </>
  ),
  US: (
    <>
      <rect width="24" height="24" fill="#fff" />
      <rect y="0" width="24" height="1.85" fill="#B22234" />
      <rect y="3.7" width="24" height="1.85" fill="#B22234" />
      <rect y="7.4" width="24" height="1.85" fill="#B22234" />
      <rect y="11.1" width="24" height="1.85" fill="#B22234" />
      <rect y="14.8" width="24" height="1.85" fill="#B22234" />
      <rect y="18.5" width="24" height="1.85" fill="#B22234" />
      <rect y="22.2" width="24" height="1.85" fill="#B22234" />
      <rect width="11.5" height="11.1" fill="#3C3B6E" />
      <circle cx="3" cy="2.8" r="0.7" fill="#fff" />
      <circle cx="6" cy="2.8" r="0.7" fill="#fff" />
      <circle cx="9" cy="2.8" r="0.7" fill="#fff" />
      <circle cx="4.5" cy="5.5" r="0.7" fill="#fff" />
      <circle cx="7.5" cy="5.5" r="0.7" fill="#fff" />
      <circle cx="3" cy="8.2" r="0.7" fill="#fff" />
      <circle cx="6" cy="8.2" r="0.7" fill="#fff" />
      <circle cx="9" cy="8.2" r="0.7" fill="#fff" />
    </>
  ),
  GB: (
    <>
      <rect width="24" height="24" fill="#012169" />
      <path d="M0 0L24 24M24 0L0 24" stroke="#fff" strokeWidth="4.6" />
      <path d="M0 0L24 24M24 0L0 24" stroke="#C8102E" strokeWidth="1.6" />
      <rect x="9.4" width="5.2" height="24" fill="#fff" />
      <rect y="9.4" width="24" height="5.2" fill="#fff" />
      <rect x="10.5" width="3" height="24" fill="#C8102E" />
      <rect y="10.5" width="24" height="3" fill="#C8102E" />
    </>
  ),
  IN: (
    <>
      <rect width="24" height="8" fill="#FF9933" />
      <rect y="8" width="24" height="8" fill="#fff" />
      <rect y="16" width="24" height="8" fill="#138808" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="#000080" strokeWidth="0.8" />
      <circle cx="12" cy="12" r="0.7" fill="#000080" />
    </>
  ),
  ID: (
    <>
      <rect width="24" height="12" fill="#CE1126" />
      <rect y="12" width="24" height="12" fill="#fff" />
    </>
  ),
  SG: (
    <>
      <rect width="24" height="12" fill="#EF3340" />
      <rect y="12" width="24" height="12" fill="#fff" />
      <circle cx="7.2" cy="6" r="3.6" fill="#fff" />
      <circle cx="8.6" cy="6" r="3.4" fill="#EF3340" />
      <circle cx="12" cy="3.6" r="0.75" fill="#fff" />
      <circle cx="14.2" cy="5.2" r="0.75" fill="#fff" />
      <circle cx="13.4" cy="7.8" r="0.75" fill="#fff" />
      <circle cx="10.6" cy="7.8" r="0.75" fill="#fff" />
      <circle cx="9.8" cy="5.2" r="0.75" fill="#fff" />
    </>
  ),
  PL: (
    <>
      <rect width="24" height="12" fill="#fff" />
      <rect y="12" width="24" height="12" fill="#DC143C" />
    </>
  ),
  MX: (
    <>
      <rect width="8" height="24" fill="#006847" />
      <rect x="8" width="8" height="24" fill="#fff" />
      <rect x="16" width="8" height="24" fill="#CE1126" />
      <circle cx="12" cy="12" r="2.2" fill="#8C6239" />
      <path d="M10 13.6c1.3.9 2.7.9 4 0" stroke="#3D8B37" strokeWidth="0.7" fill="none" />
    </>
  ),
  AR: (
    <>
      <rect width="24" height="8" fill="#74ACDF" />
      <rect y="8" width="24" height="8" fill="#fff" />
      <rect y="16" width="24" height="8" fill="#74ACDF" />
      <circle cx="12" cy="12" r="2.3" fill="#F6B40E" />
    </>
  ),
  CO: (
    <>
      <rect width="24" height="12" fill="#FCD116" />
      <rect y="12" width="24" height="6" fill="#003893" />
      <rect y="18" width="24" height="6" fill="#CE1126" />
    </>
  ),
  AU: (
    <>
      <rect width="24" height="24" fill="#012169" />
      <path d="M0 0L12 12M12 0L0 12" stroke="#fff" strokeWidth="2.4" />
      <path d="M0 0L12 12M12 0L0 12" stroke="#C8102E" strokeWidth="0.9" />
      <rect x="4.7" width="2.6" height="12" fill="#fff" />
      <rect y="4.7" width="12" height="2.6" fill="#fff" />
      <rect x="5.3" width="1.4" height="12" fill="#C8102E" />
      <rect y="5.3" width="12" height="1.4" fill="#C8102E" />
      <circle cx="6" cy="18" r="1.7" fill="#fff" />
      <circle cx="18" cy="6.5" r="1" fill="#fff" />
      <circle cx="20.6" cy="11.6" r="1" fill="#fff" />
      <circle cx="15.6" cy="13.4" r="1" fill="#fff" />
      <circle cx="18" cy="19" r="1.1" fill="#fff" />
    </>
  ),
  VN: (
    <>
      <rect width="24" height="24" fill="#DA251D" />
      <polygon
        points="12,6 13.41,10.06 17.71,10.15 14.28,12.74 15.53,16.85 12,14.4 8.47,16.85 9.72,12.74 6.29,10.15 10.59,10.06"
        fill="#FFCD00"
      />
    </>
  ),
};

export function Flag({ country, size = 20 }: { country: string; size?: number }) {
  const art = FLAGS[country];
  if (!art) return null;
  return (
    <span
      class={styles.flag}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        {art}
      </svg>
    </span>
  );
}
