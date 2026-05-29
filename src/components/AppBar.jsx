import { useRef } from 'react';
import { CitySelector } from './CitySelector';
import { AnimatedPlaceholder } from './AnimatedPlaceholder';

function GlobeLogo() {
  return (
    <svg className="app-bar__globe" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="app-bar-globe-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4A90D9"/>
          <stop offset="50%" stopColor="#F5A623"/>
          <stop offset="100%" stopColor="#E8984A"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#app-bar-globe-grad)" opacity="0.9"/>
      <ellipse cx="16" cy="16" rx="6" ry="14" fill="none" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.6"/>
      <line x1="2" y1="16" x2="30" y2="16" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.6"/>
      <circle cx="16" cy="16" r="14" fill="none" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.3"/>
    </svg>
  );
}


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

export function AppBar({
  sourceId,
  use24Hour,
  activeCityIds,
  allCities,
  onSetSource,
  onSetActiveCities,
  onAddCity,
  onRemoveCity,
  onResetDefaults,
  onToggleFormat,
  theme,
  onToggleTheme,
  onShowHoliday,
  onShare,
  onSetNow,
  query,
  setQuery,
  conversionStatus,
}) {
  const barRef = useRef(null);

  return (
    <div className="app-bar" ref={barRef}>
      {/* Brand */}
      <div className="app-bar__brand">
        <GlobeLogo />
        <span className="app-bar__brand-name">Pismo Zones</span>
      </div>
      <div className="app-bar__divider" />

      {/* NL input — flex-grow, leftmost after brand */}
      <form className="app-bar__nl-form" onSubmit={(e) => e.preventDefault()}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0, alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
          <AnimatedPlaceholder value={query} />
          <input
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
      <button className="app-bar__now" onClick={onSetNow} type="button" aria-label="Reset to now">
        <span className="app-bar__now-dot" />
        Now
      </button>
      <div className="app-bar__divider" />

      {/* Controls — right side */}
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
      {onShare && (
        <button className="app-bar__icon-btn" onClick={onShare} type="button" aria-label="Share">
          <ShareIcon />
        </button>
      )}
      <button className="app-bar__icon-btn" onClick={onShowHoliday} type="button" aria-label="View holidays">
        <HolidayIcon />
      </button>
      <button className="app-bar__icon-btn" onClick={onToggleTheme} type="button" aria-label="Toggle theme">
        <ThemeIcon theme={theme} />
      </button>
    </div>
  );
}
