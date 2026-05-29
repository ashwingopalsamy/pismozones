import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

const DOT_CLASS = {
  working: 'nl-toast__dot--working',
  startingSoon: 'nl-toast__dot--starting',
  outside: 'nl-toast__dot--outside',
};

function DestSegment({ city, index, isLast }) {
  const time = city.time + (city.period ? ` ${city.period}` : '');
  const dotClass = DOT_CLASS[city.workState] ?? DOT_CLASS.outside;
  const delay = 0.22 + index * 0.12;

  return (
    <span
      className={`nl-toast__word nl-toast__dest nl-toast__word--${index + 2}`}
      style={{ '--nl-delay': `${delay}s` }}
    >
      {index > 0 && <span className="nl-toast__muted"> and </span>}
      <span className={`nl-toast__dot ${dotClass}`} aria-hidden="true" />
      <strong className="nl-toast__bold">{time}</strong>
      <span className="nl-toast__muted"> in </span>
      <strong className="nl-toast__bold">{city.name}</strong>
      {!isLast && index > 0 && <span className="nl-toast__muted">,</span>}
    </span>
  );
}

export function NLConversionToast({ conversion, signature }) {
  const reduceMotion = useReducedMotion();
  const prevSignature = useRef(null);
  const toastRef = useRef(null);

  const src = conversion?.source;
  const results = conversion?.results;

  useEffect(() => {
    if (!toastRef.current || reduceMotion) return;
    if (signature === prevSignature.current) return;
    prevSignature.current = signature;

    const el = toastRef.current;
    const star = el.querySelector('.nl-toast__star');
    if (star) {
      star.style.animation = 'none';
      void star.offsetWidth;
      star.style.animation = '';
    }
    el.classList.remove('nl-toast--playing');
    void el.offsetWidth;
    el.classList.add('nl-toast--playing');
  }, [signature, reduceMotion]);

  if (!src || !results?.length) return null;

  const srcTime = src.time + (src.period ? ` ${src.period}` : '');

  return (
    <div className="nl-toast__wrap" aria-live="polite" aria-atomic="true">
      <div
        ref={toastRef}
        className={`nl-toast${reduceMotion ? '' : ' nl-toast--playing'}`}
      >
        <span className="nl-toast__star" aria-hidden="true">✦</span>

        {/* Source clause: "08:30 AM in Bangalore will be" */}
        <span className="nl-toast__word nl-toast__word--1">
          <strong className="nl-toast__bold">{srcTime}</strong>
          <span className="nl-toast__muted"> in {src.name} will be </span>
        </span>

        {/* One segment per destination city */}
        {results.map((city, index) => (
          <DestSegment
            key={city.id}
            city={city}
            index={index}
            isLast={index === results.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
