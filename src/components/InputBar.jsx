import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { TimePicker } from './TimePicker';
import { DatePicker } from './DatePicker';
// Only the three labels InputBar renders — full i18n lives in App.jsx
const T = {
  en: { source: 'Source', on: 'On', now: 'Now' },
  pt: { source: 'Origem', on: 'Em', now: 'Agora' },
};

function GlobeLogo() {
  return (
    <svg className="input-bar__brand-logo" viewBox="0 0 32 32">
      <defs>
        <linearGradient id="globe-pill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="4A90D9_1"/>
          <stop offset="50%" stopColor="F5A623_1"/>
          <stop offset="100%" stopColor="E8984A_1"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#globe-pill)" opacity="0.9"/>
      <ellipse cx="16" cy="16" rx="6" ry="14" fill="none" stroke="0A0A0B_1" strokeWidth="1.5" opacity="0.6"/>
      <line x1="2" y1="16" x2="30" y2="16" stroke="0A0A0B_1" strokeWidth="1.5" opacity="0.6"/>
      <circle cx="16" cy="16" r="14" fill="none" stroke="0A0A0B_1" strokeWidth="1.5" opacity="0.3"/>
    </svg>
  );
}

function LangToggle({ lang, onToggle }) {
  return (
    <div className="lang-toggle">
      <button
        className={`lang-btn${lang === 'en' ? ' lang-btn--active' : ''}`}
        onClick={() => onToggle('en')}
        type="button"
      >EN</button>
      <button
        className={`lang-btn${lang === 'pt' ? ' lang-btn--active' : ''}`}
        onClick={() => onToggle('pt')}
        type="button"
      >PT</button>
    </div>
  );
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="theme-toggle" onClick={onToggle} aria-label="Toggle theme" type="button">
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

function HolidayButton({ onClick }) {
  return (
    <button className="holiday-btn" onClick={onClick} aria-label="View Pismo India holidays" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <path d="M8 14h.01"/>
        <path d="M12 14h.01"/>
        <path d="M16 14h.01"/>
        <path d="M8 18h.01"/>
        <path d="M12 18h.01"/>
      </svg>
    </button>
  );
}

function CitySelector({ cities, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);

  const selected = cities.find(c => c.id === value) || cities[0];

  const handleOpen = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = cities.length * 44 + 8;
      const fitsBelow = r.bottom + 6 + dropdownHeight < window.innerHeight - 16;
      setPos({
        top: fitsBelow ? r.bottom + 6 : r.top - dropdownHeight - 6,
        left: r.left,
        width: Math.max(r.width, 220),
      });
    }
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <div className="city-selector">
      <button
        ref={triggerRef}
        className="city-selector__trigger"
        onClick={handleOpen}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="city-selector__flag">{selected.flag}</span>
        <span className="city-selector__name">{selected.name}</span>
        <svg className="city-selector__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && createPortal(
        <>
          <div className="city-selector__overlay" onClick={() => setIsOpen(false)} />
          <motion.div
            className="city-selector__dropdown"
            style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
            role="listbox"
          >
            {cities.map(city => (
              <button
                key={city.id}
                className={`city-selector__option${city.id === value ? ' city-selector__option--active' : ''}`}
                onClick={() => { onChange(city.id); setIsOpen(false); }}
                role="option"
                aria-selected={city.id === value}
                type="button"
              >
                <span className="city-selector__option-flag">{city.flag}</span>
                <span className="city-selector__option-name">{city.name}</span>
                <span className="city-selector__option-country">{city.country}</span>
                {city.id === value && (
                  <svg className="city-selector__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
}

export function InputBar({
  sourceId,
  cities,
  hour,
  minute,
  date,
  use24Hour,
  lang = 'en',
  theme,
  onSetSource,
  onUpdateTime,
  onSetNow,
  onToggleFormat,
  onToggleLang,
  onToggleTheme,
  onShowHoliday,
}) {
  const tx = T[lang];
  const [timeInput, setTimeInput] = useState('');
  const [isFreshTime, setIsFreshTime] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPulse, setIsPulse] = useState(true);
  const inputRef = useRef(null);
  const timePickerBtnRef = useRef(null);
  const timePillRef = useRef(null);
  const dateTriggerRef = useRef(null);

  useEffect(() => {
    const syncToSecond = () => {
      const now = new Date();
      const msUntilNextSecond = 1000 - now.getMilliseconds();

      const timeout = setTimeout(() => {
        setIsPulse(true);
        setTimeout(() => setIsPulse(false), 500);

        const interval = setInterval(() => {
          setIsPulse(true);
          setTimeout(() => setIsPulse(false), 500);
        }, 1000);

        timeoutRef.current = interval;
      }, msUntilNextSecond);

      return timeout;
    };

    const timeoutRef = { current: null };
    const initialTimeout = syncToSecond();

    return () => {
      clearTimeout(initialTimeout);
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, []);

  let displayHour = hour;
  let period = hour >= 12 ? 'PM' : 'AM';
  if (!use24Hour) {
    displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  }
  const timeStr = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const displayTime = isFreshTime ? timeInput : timeStr;

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };
  
  const handleTimeFocus = useCallback((e) => {
    e.target.select();
    setIsFreshTime(false);
    setTimeInput('');
  }, []);

  const handleTimeInput = useCallback((e) => {
    let value = e.target.value.replace(/[^\d:]/g, '');
    if (value.length > 5) value = value.slice(0, 5);
    setTimeInput(value);
    setIsFreshTime(true);

    const parseAndUpdateTime = (hStr, mStr) => {
      let h = parseInt(hStr, 10);
      let hVal = h;
      let m = parseInt(mStr, 10);
      if (isNaN(hVal) || isNaN(m) || m > 59 || m < 0) return;
      if (use24Hour) {
        hVal = Math.min(23, Math.max(0, hVal));
      } else {
        hVal = Math.min(12, Math.max(1, hVal));
        if (period === 'PM' && hVal !== 12) hVal += 12;
        else if (period === 'AM' && hVal === 12) hVal = 0;
      }
      onUpdateTime({ hour: hVal, minute: m });
      setIsFreshTime(false);
    };

    if (value.includes(':')) {
      const [hStr, mStr] = value.split(':');
      if (mStr && mStr.length === 2) parseAndUpdateTime(hStr, mStr);
    } else {
      if (value.length === 4) {
        parseAndUpdateTime(value.slice(0, 2), value.slice(2, 4));
      } else if (value.length === 3) {
        parseAndUpdateTime(value.slice(0, 1), value.slice(1, 3));
      }
    }
  }, [use24Hour, period, onUpdateTime]);

  const handleTimeBlur = useCallback(() => {
    setIsFreshTime(false);
    setTimeInput('');
  }, []);

  const handlePeriodToggle = useCallback(() => {
    const newHour = hour < 12 ? hour + 12 : hour - 12;
    onUpdateTime({ hour: newHour });
  }, [hour, onUpdateTime]);

  return (
    <div className="input-bar">

      {/* ── Brand ── */}
      <div className="input-bar__brand">
        <GlobeLogo />
        <span className="input-bar__brand-name">Pismo Zones</span>
      </div>

      <div className="input-bar__divider" />

      {/* ── Source: city + Now ── */}
      <div className="input-bar__item input-bar__item--source">
        <span className="input-bar__static-label">{tx.source}</span>
        <CitySelector cities={cities} value={sourceId} onChange={onSetSource} />
        <button className="input-bar__now-btn" onClick={onSetNow} type="button">
          <span className={`input-bar__now-indicator${isPulse ? ' input-bar__now-indicator--pulse' : ''}`} />
          {tx.now}
        </button>
      </div>

      <div className="input-bar__divider" />

      {/* ── On: date picker + time picker + format toggle ── */}
      <div className="input-bar__item input-bar__item--time">
        <span className="input-bar__static-label">{tx.on}</span>

        <button
          ref={dateTriggerRef}
          className="input-bar__date-pill"
          onClick={() => setShowDatePicker(true)}
          type="button"
          aria-label="Open date picker"
          aria-haspopup="dialog"
          aria-expanded={showDatePicker}
        >
          <div className="input-bar__date-icon-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <span className="input-bar__date-text">{formatDateDisplay(date)}</span>
        </button>

        <div className="input-bar__row">
          <div ref={timePillRef} className="input-bar__time-pill">
            <button
              ref={timePickerBtnRef}
              className="input-bar__clock-btn"
              onClick={() => setShowTimePicker(true)}
              type="button"
              aria-label="Open time picker"
              aria-haspopup="dialog"
              aria-expanded={showTimePicker}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              className="input-bar__time-input"
              value={displayTime}
              onChange={handleTimeInput}
              onFocus={handleTimeFocus}
              onBlur={handleTimeBlur}
              placeholder="HH:MM"
            />
            <button
              className={`input-bar__period-toggle${use24Hour ? ' input-bar__period-toggle--hidden' : ''}`}
              onClick={handlePeriodToggle}
              type="button"
              aria-hidden={use24Hour}
              tabIndex={use24Hour ? -1 : 0}
              aria-label="Toggle AM PM"
            >
              {period}
            </button>
          </div>

          <div className="input-bar__format-toggle">
            <button
              className={`input-bar__format-btn${!use24Hour ? ' input-bar__format-btn--active' : ''}`}
              onClick={() => use24Hour && onToggleFormat()}
              type="button"
              aria-pressed={!use24Hour}
              disabled={!use24Hour}
            >
              12h
            </button>
            <button
              className={`input-bar__format-btn${use24Hour ? ' input-bar__format-btn--active' : ''}`}
              onClick={() => !use24Hour && onToggleFormat()}
              type="button"
              aria-pressed={use24Hour}
              disabled={use24Hour}
            >
              24h
            </button>
          </div>
        </div>
      </div>

      <div className="input-bar__divider" />

      {/* ── Actions: lang + theme + holidays ── */}
      <div className="input-bar__item input-bar__item--actions">
        <LangToggle lang={lang} onToggle={onToggleLang} />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <HolidayButton onClick={onShowHoliday} />
      </div>

      <TimePicker
        isOpen={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        hour={hour}
        minute={minute}
        use24Hour={use24Hour}
        onTimeSelect={onUpdateTime}
        triggerRef={timePillRef}
      />

      <DatePicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        dateStr={date}
        onDateSelect={(d) => onUpdateTime({ date: d })}
        triggerRef={dateTriggerRef}
      />
    </div>
  );
}
