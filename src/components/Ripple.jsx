import { useState, useCallback } from 'react';

export function useRipple() {
  const [ripples, setRipples] = useState([]);

  const triggerRipple = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2.5;
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y, size }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 500);
  }, []);

  const RippleContainer = useCallback(() => (
    <>
      {ripples.map(r => (
        <span
          key={r.id}
          className="card-ripple"
          style={{
            left: r.x - r.size / 2,
            top: r.y - r.size / 2,
            width: r.size,
            height: r.size,
          }}
        />
      ))}
    </>
  ), [ripples]);

  return { triggerRipple, RippleContainer };
}
