import { useRef, useEffect, useState } from 'react';

export function DigitSlide({ value, className }) {
  const [display, setDisplay] = useState({ prev: value, curr: value, animating: false });
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current) {
      setDisplay({ prev: String(prevRef.current).padStart(2, '0'), curr: String(value).padStart(2, '0'), animating: true });
      const timer = setTimeout(() => {
        setDisplay(d => ({ ...d, prev: d.curr, animating: false }));
      }, 280);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  if (!display.animating) {
    return <span className={className}>{String(display.curr).padStart(2, '0')}</span>;
  }

  return (
    <span className={`digit-slide-wrap ${className || ''}`}>
      <span className="digit-slide-inner digit-slide-inner--sliding">
        <span>{display.prev}</span>
        <span>{display.curr}</span>
      </span>
    </span>
  );
}
