import { useState, useEffect, useRef } from 'react';

const PHRASES = [
  { time: '08:30 AM', loc: 'BRT to',          dest: 'IST'           },
  { time: '3pm',      loc: 'São Paulo to',     dest: 'Warsaw'        },
  { time: 'next monday 9am', loc: 'Austin to', dest: 'Bristol'       },
  { time: 'midnight', loc: 'BRT to',           dest: 'Singapore'     },
  { time: '9am',      loc: 'IST to',           dest: 'São Paulo'     },
  { time: '10am',     loc: 'CET to',           dest: 'Bangalore'     },
  { time: '2pm',      loc: 'IST to',           dest: 'Buenos Aires'  },
  { time: 'friday 5pm', loc: 'BRT to',         dest: 'Jakarta'       },
  { time: 'noon',     loc: 'Austin to',        dest: 'Bogotá'        },
  { time: '15:00',    loc: 'BRT to',           dest: 'Ho Chi Minh'   },
  { time: '10:30 AM', loc: 'Mexico to',        dest: 'IST'           },
  { time: '4pm',      loc: 'Sydney to',        dest: 'São Paulo'     },
  { time: '14:00',    loc: 'UTC to',           dest: 'Warsaw'        },
  { time: 'tomorrow 2pm', loc: 'BRT to',       dest: 'Austin'        },
];

const INTERVAL_MS = 2400;
const TRANSITION_MS = 360;

export function AnimatedPlaceholder({ value }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(null);
  const activeIdxRef = useRef(0);

  useEffect(() => {
    activeIdxRef.current = activeIdx;
  }, [activeIdx]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNextIdx(prev => prev !== null ? prev : (activeIdxRef.current + 1) % PHRASES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []); // stable — reads current index via ref, not closure

  useEffect(() => {
    if (nextIdx === null) return;
    const t = setTimeout(() => {
      setActiveIdx(nextIdx);
      setNextIdx(null);
    }, TRANSITION_MS);
    return () => clearTimeout(t);
  }, [nextIdx]);

  if (value !== '') return null;

  return (
    <div className="nl-ph" aria-hidden="true">
      <div className="nl-ph__track">
        {PHRASES.map((phrase, i) => {
          let stateClass = '';
          if (i === activeIdx && nextIdx === null) stateClass = 'nl-ph__phrase--active';
          else if (i === activeIdx && nextIdx !== null) stateClass = 'nl-ph__phrase--exiting';
          else if (i === nextIdx) stateClass = 'nl-ph__phrase--entering';
          else return null;

          return (
            <span key={i} className={`nl-ph__phrase ${stateClass}`}>
              <span className="nl-ph__time">{phrase.time}</span>
              <span className="nl-ph__loc">{phrase.loc}</span>
              <span className="nl-ph__dest">{phrase.dest}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
