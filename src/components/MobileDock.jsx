import { useState, useEffect, useRef, useCallback } from 'react';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

export { useIsMobile };

// ─── Helpers ──────────────────────────────────────────────
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTime(hour, minute, use24Hour) {
  let displayHour = hour;
  let period = hour >= 12 ? 'PM' : 'AM';
  if (!use24Hour) {
    displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  }
  return {
    time: `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    period: use24Hour ? '' : period,
  };
}

// ─── Inline SVGs ──────────────────────────────────────────
function GlobeLogo() {
  return (
    <svg className="mobile-settings-bar__logo" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="globe-pill-m" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4A90D9"/>
          <stop offset="50%" stopColor="#F5A623"/>
          <stop offset="100%" stopColor="#E8984A"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#globe-pill-m)" opacity="0.9"/>
      <ellipse cx="16" cy="16" rx="6" ry="14" fill="none" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.6"/>
      <line x1="2" y1="16" x2="30" y2="16" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.6"/>
      <circle cx="16" cy="16" r="14" fill="none" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.3"/>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function HolidayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// ─── i18n labels ──────────────────────────────────────────
const TX = {
  en: { now: 'Now', time: 'Time', meet: 'Meet', source: 'Source' },
  pt: { now: 'Agora', time: 'Hora', meet: 'Reuniao', source: 'Origem' },
};

// ─── Main Component ───────────────────────────────────────
export function MobileDock({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  use24Hour,
  onToggleFormat,
  onShowHoliday,
  sourceId,
  allCities,
  onSetNow,
  date,
  hour,
  minute,
  meetMode,
  onToggleMeetMode,
  onUpdateTime,
  onShare,
  isSharedView,
  onResetShared,
}) {
  const isMobile = useIsMobile();
  const nativeDateRef = useRef(null);
  const nativeTimeRef = useRef(null);

  if (!isMobile) return null;

  const tx = TX[lang] || TX.en;
  const sourceCity = (allCities || []).find(c => c.id === sourceId);
  const sourceFlag = sourceCity?.flag || '';
  const sourceName = sourceCity?.name || sourceId || '';
  const dateStr = formatDateDisplay(date);
  const { time: timeStr, period } = formatTime(hour, minute, use24Hour);

  const [isPulse, setIsPulse] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPulse(true);
      setTimeout(() => setIsPulse(false), 500);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerCitySelector = () => {
    const trigger = document.querySelector('.city-selector__trigger');
    if (trigger) trigger.click();
  };

  // Native date picker with fallback to custom
  const triggerDatePicker = () => {
    const input = nativeDateRef.current;
    if (input) {
      try {
        input.showPicker();
        return;
      } catch (_) { /* native picker unavailable, fall through */ }
    }
    const btn = document.querySelector('.input-bar__date-pill');
    if (btn) btn.click();
  };

  const handleNativeDateChange = (e) => {
    const val = e.target.value; // YYYY-MM-DD
    if (val && onUpdateTime) onUpdateTime({ date: val });
  };

  // Native time picker with fallback to custom
  const triggerTimePicker = () => {
    const input = nativeTimeRef.current;
    if (input) {
      try {
        input.showPicker();
        return;
      } catch (_) { /* native picker unavailable, fall through */ }
    }
    const pill = document.querySelector('.input-bar__time-pill');
    if (pill) pill.click();
  };

  const handleNativeTimeChange = (e) => {
    const val = e.target.value; // HH:MM
    if (val && onUpdateTime) {
      const [h, m] = val.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) onUpdateTime({ hour: h, minute: m });
    }
  };

  return (
    <>
      {/* ─── Top Settings Bar ─── */}
      <div className="mobile-settings-bar" role="toolbar" aria-label="Settings">
        <div className="mobile-settings-bar__inner">
          <div className="mobile-settings-bar__brand">
            <GlobeLogo />
            <span className="mobile-settings-bar__brand-name">Pismo Zones</span>
          </div>
          <div className="mobile-settings-bar__controls">
          <button
            className="mobile-settings-bar__toggle"
            onClick={() => onToggleLang(lang === 'en' ? 'pt' : 'en')}
            type="button"
            aria-label={`Language: ${lang.toUpperCase()}`}
          >
            <span className={lang === 'en' ? 'mobile-settings-bar__active' : ''}>{lang === 'en' ? 'EN' : 'EN'}</span>
            <span className={lang === 'pt' ? 'mobile-settings-bar__active' : ''}>{lang === 'pt' ? 'PT' : 'PT'}</span>
          </button>

          <button
            className="mobile-settings-bar__toggle"
            onClick={onToggleFormat}
            type="button"
            aria-label={`Format: ${use24Hour ? '24h' : '12h'}`}
          >
            <span className={!use24Hour ? 'mobile-settings-bar__active' : ''}>12h</span>
            <span className={use24Hour ? 'mobile-settings-bar__active' : ''}>24h</span>
          </button>

          <button
            className="mobile-settings-bar__theme-btn"
            onClick={onToggleTheme}
            type="button"
            aria-label={`Theme: ${theme}`}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          </div>
        </div>
      </div>

      {/* ─── Bottom Action Bar ─── */}
      <div className="mobile-action-bar" role="toolbar" aria-label="Controls">
        {/* Row 1: Source selector + Now button */}
        <div className="mobile-action-bar__row">
          <button
            className="mobile-action-bar__source"
            onClick={triggerCitySelector}
            type="button"
            aria-label="Change source city and manage cities"
          >
            <span className="mobile-action-bar__flag">{sourceFlag}</span>
            <span className="mobile-action-bar__city-name">{sourceName}</span>
            <span className="mobile-action-bar__source-badge">{tx.source}</span>
            <span className="mobile-action-bar__chevron">
              <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1l4 4 4-4" />
              </svg>
            </span>
          </button>

          <button
            className="mobile-action-bar__now-btn"
            onClick={onSetNow}
            type="button"
            aria-label="Reset to now"
          >
            <span className={`mobile-action-bar__now-dot${isPulse ? ' mobile-action-bar__now-dot--pulse' : ''}`} />
            <span className="mobile-action-bar__now-text">{tx.now}</span>
          </button>

          {onShare && (
            <button
              className="mobile-action-bar__share-btn"
              onClick={onShare}
              type="button"
              aria-label="Share link"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          )}

          {isSharedView && (
            <button
              className="mobile-action-bar__reset-btn"
              onClick={onResetShared}
              type="button"
            >
              Reset
            </button>
          )}
        </div>

        {/* Row 2: Date|Time + Time|Meet + Holiday */}
        <div className="mobile-action-bar__row">
          <div className="mobile-action-bar__datetime">
            <div className="mobile-action-bar__date-btn" aria-label="Change date">
              {dateStr}
              <input
                ref={nativeDateRef}
                type="date"
                value={date || ''}
                onChange={handleNativeDateChange}
                className="mobile-action-bar__native-overlay"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
            <span className="mobile-action-bar__separator" />
            <div className="mobile-action-bar__time-btn" aria-label="Change time">
              {timeStr}
              {period && <span className="mobile-action-bar__period">{period}</span>}
              <input
                ref={nativeTimeRef}
                type="time"
                value={`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
                onChange={handleNativeTimeChange}
                className="mobile-action-bar__native-overlay"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="mobile-action-bar__mode-toggle">
            <button
              className={`mobile-action-bar__mode-btn${!meetMode ? ' mobile-action-bar__mode-btn--active' : ''}`}
              onClick={() => meetMode && onToggleMeetMode()}
              type="button"
            >{tx.time}</button>
            <button
              className={`mobile-action-bar__mode-btn${meetMode ? ' mobile-action-bar__mode-btn--active' : ''}`}
              onClick={() => !meetMode && onToggleMeetMode()}
              type="button"
            >{tx.meet}</button>
          </div>

          <button
            className="mobile-action-bar__holiday-btn"
            onClick={onShowHoliday}
            type="button"
            aria-label="View holidays"
          >
            <HolidayIcon />
          </button>
        </div>
      </div>

      {/* Native inputs moved inline into date/time buttons as overlays */}
    </>
  );
}
