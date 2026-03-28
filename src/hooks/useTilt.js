import { useCallback, useRef } from 'react';

export function useTilt() {
  const ref = useRef(null);

  const onMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--sheen-x', `${(x / rect.width) * 100}%`);
    el.style.setProperty('--sheen-y', `${(y / rect.height) * 100}%`);
  }, []);

  // Don't clear --sheen-x/y on leave. The CSS :hover opacity
  // transition fades the sheen out at its last position, avoiding
  // the flash at top-center caused by fallback values.
  const onMouseLeave = useCallback(() => {}, []);

  return { ref, onMouseMove, onMouseLeave };
}
