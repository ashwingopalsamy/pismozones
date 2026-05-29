import { useState, useRef, useEffect } from 'react';
import { CitySelector } from './CitySelector';
import { AnimatedPlaceholder } from './AnimatedPlaceholder';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  );
}

function HolidayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/>
      <path d="M8 18h.01"/><path d="M12 18h.01"/>
    </svg>
  );
}

function ThemeIcon({ theme }) {
  if (theme === 'dark') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function PickerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [, month, day] = dateStr.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[month - 1]} ${day}`;
}

function formatTime(hour, minute, use24Hour) {
  const m = String(minute).padStart(2, '0');
  if (use24Hour) return `${String(hour).padStart(2, '0')}:${m}`;
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${String(h).padStart(2, '0')}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function MobileBottomBar({
  sourceId,
  use24Hour,
  activeCityIds,
  allCities,
  onSetSource,
  onAddCity,
  onRemoveCity,
  onResetDefaults,
  theme,
  onToggleTheme,
  onShowHoliday,
  onShare,
  onSetNow,
  query,
  setQuery,
  sourceTimeComponents,
  updateTime,
}) {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isNLPMode, setIsNLPMode] = useState(false);
  const dateTriggerRef = useRef(null);
  const timeTriggerRef = useRef(null);
  const nlpInputRef = useRef(null);

  useEffect(() => {
    if (query === '') setIsNLPMode(false);
  }, [query]);

  const handleOpenNLP = () => {
    setIsNLPMode(true);
    setTimeout(() => nlpInputRef.current?.focus(), 50);
  };

  const handleCloseNLP = () => {
    setQuery('');
    setIsNLPMode(false);
  };

  const hour = sourceTimeComponents?.hour ?? 0;
  const minute = sourceTimeComponents?.minute ?? 0;
  const date = sourceTimeComponents?.date ?? '';

  return (
    <div className="mobile-bottom-bar">
      {/* Row 1: city selector + icon controls */}
      <div className="mobile-bottom-bar__row">
        <CitySelector
          cities={allCities}
          value={sourceId}
          onChange={onSetSource}
          activeCityIds={activeCityIds}
          onAddCity={onAddCity}
          onRemoveCity={onRemoveCity}
          onResetDefaults={onResetDefaults}
          use24Hour={use24Hour}
        />
        <button className="app-bar__icon-btn" onClick={onShowHoliday} type="button" aria-label="View holidays">
          <HolidayIcon />
        </button>
        {onShare && (
          <button className="app-bar__icon-btn" onClick={onShare} type="button" aria-label="Share">
            <ShareIcon />
          </button>
        )}
        <button className="app-bar__icon-btn" onClick={onToggleTheme} type="button" aria-label="Toggle theme">
          <ThemeIcon theme={theme} />
        </button>
      </div>

      {/* Row 2: date/time pickers (default) or NLP input (toggled) — Now always anchored right */}
      {isNLPMode ? (
        <div className="mobile-bottom-bar__row">
          <form className="app-bar__nl-form" onSubmit={(e) => e.preventDefault()}>
            <div style={{ position: 'relative', flex: 1, minWidth: 0, alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
              <AnimatedPlaceholder value={query} />
              <input
                ref={nlpInputRef}
                className="app-bar__nl-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder=""
                autoComplete="off"
                spellCheck="false"
                aria-label="Convert time — type a query like 08:30 AM BRT to IST"
              />
            </div>
          </form>
          <button className="app-bar__icon-btn" onClick={handleCloseNLP} type="button" aria-label="Back to time picker">
            <PickerIcon />
          </button>
          <button className="app-bar__now" onClick={onSetNow} type="button" aria-label="Reset to now">
            <span className="app-bar__now-dot" />
            Now
          </button>
        </div>
      ) : (
        <div className="mobile-bottom-bar__row">
          <div className="mobile-bar__time-pill">
            <button
              ref={dateTriggerRef}
              className="mobile-bar__picker-btn"
              onClick={() => setIsDateOpen(true)}
              type="button"
              aria-label="Change date"
            >
              {formatDate(date)}
            </button>
            <span className="mobile-bar__picker-sep" aria-hidden="true" />
            <button
              ref={timeTriggerRef}
              className="mobile-bar__picker-btn"
              onClick={() => setIsTimeOpen(true)}
              type="button"
              aria-label="Change time"
            >
              {formatTime(hour, minute, use24Hour)}
            </button>
          </div>
          <button className="app-bar__icon-btn" onClick={handleOpenNLP} type="button" aria-label="Type a time query">
            <EditIcon />
          </button>
          <button className="app-bar__now" onClick={onSetNow} type="button" aria-label="Reset to now">
            <span className="app-bar__now-dot" />
            Now
          </button>
        </div>
      )}

      <DatePicker
        isOpen={isDateOpen}
        onClose={() => setIsDateOpen(false)}
        dateStr={date}
        onDateSelect={(d) => updateTime?.({ date: d })}
        triggerRef={dateTriggerRef}
      />
      <TimePicker
        isOpen={isTimeOpen}
        onClose={() => setIsTimeOpen(false)}
        hour={hour}
        minute={minute}
        use24Hour={use24Hour}
        onTimeSelect={({ hour: h, minute: m }) => updateTime?.({ hour: h, minute: m })}
        triggerRef={timeTriggerRef}
      />
    </div>
  );
}
