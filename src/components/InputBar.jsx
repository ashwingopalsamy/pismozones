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
    <svg className="input-bar__brand-logo" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="globe-pill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4A90D9"/>
          <stop offset="50%" stopColor="#F5A623"/>
          <stop offset="100%" stopColor="#E8984A"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#globe-pill)" opacity="0.9"/>
      <ellipse cx="16" cy="16" rx="6" ry="14" fill="none" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.6"/>
      <line x1="2" y1="16" x2="30" y2="16" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.6"/>
      <circle cx="16" cy="16" r="14" fill="none" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.3"/>
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

// ─── helpers (inline so they work without Luxon inside this component) ─────
function getCitySnapshot(timezone, sourceTimezone) {
  try {
    const now = new Date();
    // HH:MM in city's timezone
    const hm = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
    const hour   = parseInt(hm.find(p => p.type === 'hour')?.value ?? 0, 10);
    const minute = parseInt(hm.find(p => p.type === 'minute')?.value ?? 0, 10);
    const time   = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    // YYYY-MM-DD for each zone (for day-offset calc)
    const cityDate   = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
    const sourceDate = new Intl.DateTimeFormat('en-CA', { timeZone: sourceTimezone }).format(now);
    const dayOffset  = Math.round((new Date(cityDate) - new Date(sourceDate)) / 86400000);

    // UTC offset as "UTC+5:30" etc.
    const local  = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const utcNow = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const diff   = Math.round((local - utcNow) / 60000);
    const sign   = diff >= 0 ? '+' : '-';
    const abs    = Math.abs(diff);
    const oh = Math.floor(abs / 60);
    const om = abs % 60;
    const utcOffset = om > 0
      ? `UTC${sign}${oh}:${String(om).padStart(2, '0')}`
      : `UTC${sign}${oh}`;

    // Work state
    let workState = 'outside';
    if (hour >= 9 && hour < 18) workState = 'working';
    else if (hour >= 7 && hour < 9) workState = 'soon';

    return { time, dayOffset, utcOffset, workState };
  } catch { return { time: '--:--', dayOffset: 0, utcOffset: '', workState: 'outside' }; }
}

function WorkDot({ state }) {
  return <span className={`cs-work-dot cs-work-dot--${state}`} aria-hidden="true" />;
}

function CitySelector({ cities, value, onChange, activeCityIds, onAddCity, onRemoveCity, onResetDefaults }) {
  const [isOpen, setIsOpen]         = useState(false);
  const [pos, setPos]               = useState({ top: 0, left: 0, width: 0 });
  const [query, setQuery]           = useState('');
  const [snapshots, setSnapshots]   = useState({});
  const [removingIds, setRemovingIds] = useState(new Set());
  const [pillPop, setPillPop]       = useState(false);

  const triggerRef   = useRef(null);
  const searchRef    = useRef(null);
  const listRef      = useRef(null);
  const sourceCity   = cities.find(c => c.id === value) || cities[0];
  const activeSet    = new Set(activeCityIds ?? []);
  const activeCount  = activeSet.size;

  // Compute city time snapshots whenever dropdown opens, then tick every second
  const refreshSnapshots = useCallback(() => {
    const sourceTz = sourceCity?.timezone ?? 'UTC';
    const next = {};
    cities.forEach(c => { next[c.id] = getCitySnapshot(c.timezone, sourceTz); });
    setSnapshots(next);
  }, [cities, sourceCity]);

  useEffect(() => {
    if (!isOpen) return;
    refreshSnapshots();
    const id = setInterval(refreshSnapshots, 1000);
    return () => clearInterval(id);
  }, [isOpen, refreshSnapshots]);

  // Keyboard: Escape + arrow navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { setIsOpen(false); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const rows = listRef.current
          ? [...listRef.current.querySelectorAll('[data-cityrow]:not([data-hidden])')]
          : [];
        if (!rows.length) return;
        const idx  = rows.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown'
          ? rows[(idx + 1) % rows.length]
          : rows[(idx - 1 + rows.length) % rows.length];
        next?.focus();
        next?.scrollIntoView({ block: 'nearest' });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleOpen = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const DROPDOWN_H = 480; // generous max height budget
      const fitsBelow  = r.bottom + 8 + DROPDOWN_H < window.innerHeight - 16;
      setPos({
        top:   fitsBelow ? r.bottom + 8 : Math.max(8, r.top - DROPDOWN_H - 8),
        left:  Math.min(r.left, window.innerWidth - 360 - 8),
        width: Math.max(r.width, 360),
      });
    }
    setIsOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const triggerPill = () => {
    setPillPop(true);
    setTimeout(() => setPillPop(false), 350);
  };

  const handleAdd = (id) => {
    onAddCity?.(id);
    triggerPill();
  };

  const handleRemove = (id) => {
    setRemovingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setRemovingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      onRemoveCity?.(id);
      triggerPill();
    }, 220);
  };

  const handleReset = () => { onResetDefaults?.(); triggerPill(); };

  const q = query.trim().toLowerCase();
  const matches = (c) => !q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);

  const activeCities    = cities.filter(c => activeSet.has(c.id));
  const availableCities = cities.filter(c => !activeSet.has(c.id));
  const visibleActive   = activeCities.filter(matches);
  const visibleAvail    = availableCities.filter(matches);
  const noResults       = visibleActive.length === 0 && visibleAvail.length === 0;

  const renderRow = (city) => {
    const snap      = snapshots[city.id] ?? { time: '--:--', dayOffset: 0, utcOffset: '', workState: 'outside' };
    const isActive  = activeSet.has(city.id);
    const isAnchor  = city.id === 'saopaulo';
    const isSrc     = city.id === value;
    const isRemoving = removingIds.has(city.id);
    const hidden    = !matches(city);

    return (
      <div
        key={city.id}
        data-cityrow
        data-hidden={hidden || undefined}
        className={[
          'cs-row',
          isSrc      ? 'cs-row--source'   : '',
          isRemoving ? 'cs-row--removing' : '',
          hidden     ? 'cs-row--hidden'   : '',
        ].join(' ')}
        tabIndex={hidden ? -1 : 0}
        role="option"
        aria-selected={isSrc}
        onClick={() => { onChange(city.id); setIsOpen(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(city.id); setIsOpen(false); } }}
      >
        {/* 1 — work state dot */}
        <WorkDot state={snap.workState} />

        {/* 2 — flag */}
        <span className="cs-flag" aria-hidden="true">{city.flag}</span>

        {/* 3 — name + country */}
        <div className="cs-info">
          <span className="cs-name">
            {city.name}
            {isSrc && <span className="cs-source-badge">Source</span>}
          </span>
          <span className="cs-country">{city.country}</span>
        </div>

        {/* 4 — time + day-offset + UTC offset */}
        <div className="cs-time">
          <div className="cs-time-top">
            {snap.dayOffset !== 0 && (
              <span className={`cs-day-badge cs-day-badge--${snap.dayOffset > 0 ? 'ahead' : 'behind'}`}>
                {snap.dayOffset > 0 ? `+${snap.dayOffset}d` : `${snap.dayOffset}d`}
              </span>
            )}
            <span className="cs-time-val">{snap.time}</span>
          </div>
          {snap.utcOffset && <span className="cs-utc">{snap.utcOffset}</span>}
        </div>

        {/* 5 — toggle button */}
        {isAnchor ? (
          <span className="cs-toggle cs-toggle--anchor" aria-label="Always active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        ) : (
          <motion.button
            className={`cs-toggle ${isActive ? 'cs-toggle--remove' : 'cs-toggle--add'}`}
            type="button"
            aria-label={isActive ? `Remove ${city.name}` : `Add ${city.name}`}
            title={isActive ? `Remove ${city.name} from view` : `Add ${city.name} to view`}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              isActive ? handleRemove(city.id) : handleAdd(city.id);
            }}
          >
            {isActive ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            )}
          </motion.button>
        )}
      </div>
    );
  };

  return (
    <div className="city-selector">
      {/* Trigger */}
      <button
        ref={triggerRef}
        className={`city-selector__trigger${isOpen ? ' city-selector__trigger--open' : ''}`}
        onClick={handleOpen}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="city-selector__flag">{sourceCity.flag}</span>
        <span className="city-selector__name">{sourceCity.name}</span>
        <span className={`cs-count-pill${pillPop ? ' cs-count-pill--pop' : ''}`}>{activeCount}</span>
        <svg className="city-selector__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && createPortal(
        <>
          <div className="city-selector__overlay" onClick={() => setIsOpen(false)} />
          <motion.div
            className="city-selector__dropdown"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
            role="listbox"
          >
            {/* Search */}
            <div className="cs-search">
              <svg className="cs-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                ref={searchRef}
                className="cs-search__input"
                placeholder="Search cities…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />
              {query && (
                <button className="cs-search__clear" type="button" onClick={() => setQuery('')} aria-label="Clear search">✕</button>
              )}
            </div>

            {/* Work-state legend */}
            <div className="cs-legend">
              <span className="cs-legend__item"><span className="cs-work-dot cs-work-dot--working" />Working</span>
              <span className="cs-legend__sep" />
              <span className="cs-legend__item"><span className="cs-work-dot cs-work-dot--soon" />Starting soon</span>
              <span className="cs-legend__sep" />
              <span className="cs-legend__item"><span className="cs-work-dot cs-work-dot--outside" />Outside hours</span>
            </div>

            {/* Scrollable body */}
            <div className="cs-body" ref={listRef}>
              {/* Active section */}
              {visibleActive.length > 0 && (
                <div className="cs-section">
                  <div className="cs-section__header">
                    <span className="cs-section__label">Active</span>
                    <span className="cs-section__count">{visibleActive.length}</span>
                  </div>
                  {activeCities.map(renderRow)}
                </div>
              )}

              {/* Divider */}
              {visibleActive.length > 0 && visibleAvail.length > 0 && (
                <div className="cs-divider" />
              )}

              {/* Available section */}
              {visibleAvail.length > 0 && (
                <div className="cs-section">
                  <div className="cs-section__header">
                    <span className="cs-section__label">Available to Add</span>
                    <span className="cs-section__count">{visibleAvail.length}</span>
                  </div>
                  {availableCities.map(renderRow)}
                </div>
              )}

              {/* No results */}
              {noResults && (
                <div className="cs-empty">
                  <span>🔍</span>
                  <span>No cities match "{query}"</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="cs-footer">
              <button className="cs-footer__reset" type="button" onClick={handleReset}>Reset defaults</button>
              <div className="cs-footer__keys">
                <kbd>↑↓</kbd> navigate &nbsp; <kbd>Esc</kbd> close
              </div>
              <button className="cs-footer__done" type="button" onClick={() => setIsOpen(false)}>Done</button>
            </div>
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
  allCities,
  activeCityIds,
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
  onAddCity,
  onRemoveCity,
  onResetDefaults,
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
        <CitySelector
          cities={allCities || cities}
          value={sourceId}
          onChange={onSetSource}
          activeCityIds={activeCityIds}
          onAddCity={onAddCity}
          onRemoveCity={onRemoveCity}
          onResetDefaults={onResetDefaults}
        />
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
