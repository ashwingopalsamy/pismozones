import type { RefObject } from 'preact';
import { useLayoutEffect, useState } from 'preact/hooks';

/** Control-lane compaction tiers, by the lane's own width (the content column). */
export type Tier = 'A' | 'B' | 'C' | 'D';

export const tierFor = (width: number): Tier =>
  width >= 1120 ? 'A' : width >= 960 ? 'B' : width >= 840 ? 'C' : 'D';

/** The element's content width, live; Infinity where ResizeObserver is unavailable (tests). */
export function useWidth(ref: RefObject<HTMLElement>): number {
  const [width, setWidth] = useState(Number.POSITIVE_INFINITY);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return width;
}
